// ============================================================================
// VAULT LOCK SCREEN COMPONENT
// Complete authentication system supporting PIN (4-8 digits) and Pattern (3x3 grid).
// Strict single-lock interface display, first-time setup, password change,
// lock style switcher, 30s lockout protection, and Fingerprint placeholder.
// // TODO: Capacitor native swap point -> Swap with @capacitor-community/biometric-auth
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Fingerprint,
  Grid,
  KeyRound,
  AlertCircle,
  HelpCircle,
  X,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { AuthService } from '../services/auth';
import { PatternLock } from './PatternLock';
import { ComingSoonModal } from './ComingSoonModal';
import { ConfirmDialog } from './ConfirmDialog';

export interface VaultLockScreenProps {
  isOpen: boolean;
  initialMode?: 'unlock' | 'change-password' | 'change-lock-style';
  onSuccess: () => void;
  onCancel: () => void;
  onToast: (msg: string) => void;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  isOpen,
  initialMode = 'unlock',
  onSuccess,
  onCancel,
  onToast,
}) => {
  // Main view modes: 'unlock' | 'first-setup' | 'change-password' | 'change-lock-style'
  const [viewMode, setViewMode] = useState<'unlock' | 'first-setup' | 'change-password' | 'change-lock-style'>('unlock');

  // Sub-steps for setup/change flows
  // Setup steps: 0 (choose type), 1 (create), 2 (confirm)
  // Change password steps: 1 (verify old), 2 (create new), 3 (confirm new)
  // Change lock style steps: 1 (choose target type), 2 (verify old), 3 (create new), 4 (confirm new)
  const [step, setStep] = useState<number>(0);

  // Lock type chosen during setup or change lock style
  const [targetLockType, setTargetLockType] = useState<'pin' | 'pattern'>('pin');

  // Active inputs
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [patternInput, setPatternInput] = useState<number[]>([]);
  const [confirmPatternInput, setConfirmPatternInput] = useState<number[]>([]);

  // Current credential stored during multi-step verification
  const [verifiedCurrentCred, setVerifiedCurrentCred] = useState<string | number[] | null>(null);

  // Status & Lockout
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Recovery Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showFingerprintComingSoon, setShowFingerprintComingSoon] = useState(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Initialize View Mode on Open
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setPinInput('');
    setConfirmPinInput('');
    setPatternInput([]);
    setConfirmPatternInput([]);
    setVerifiedCurrentCred(null);

    const hasPassword = AuthService.hasVaultPassword();

    if (!hasPassword) {
      setViewMode('first-setup');
      setStep(0); // Choose PIN or Pattern
    } else if (initialMode === 'change-password') {
      setViewMode('change-password');
      setStep(1); // Verify current password
      setTargetLockType(AuthService.getLockType());
    } else if (initialMode === 'change-lock-style') {
      setViewMode('change-lock-style');
      setStep(1); // Choose target lock style
    } else {
      setViewMode('unlock');
      setStep(1);
    }
  }, [isOpen, initialMode]);

  // Check Lockout Timer Interval
  useEffect(() => {
    if (!isOpen) return;

    const checkLockout = () => {
      const status = AuthService.isLockedOut();
      if (status.locked) {
        setLockoutTimer(status.remainingSeconds);
      } else {
        setLockoutTimer(0);
      }
    };

    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentActiveLockType = AuthService.getLockType();

  // Reset inputs
  const resetFormState = () => {
    setPinInput('');
    setConfirmPinInput('');
    setPatternInput([]);
    setConfirmPatternInput([]);
    setErrorMessage(null);
  };

  // Handle PIN Keypad Digit Press
  const handleDigitClick = (digit: string) => {
    if (lockoutTimer > 0) return;
    setErrorMessage(null);

    if (viewMode === 'unlock') {
      if (pinInput.length >= 8) return;
      const nextPin = pinInput + digit;
      setPinInput(nextPin);

      // Auto-submit if 4+ digits entered and matches
      if (nextPin.length >= 4) {
        AuthService.verifyPin(nextPin).then((res) => {
          if (res.success) {
            setPinInput('');
            onSuccess();
          }
        });
      }
    } else if (viewMode === 'first-setup') {
      if (step === 1) {
        if (pinInput.length < 8) setPinInput((prev) => prev + digit);
      } else if (step === 2) {
        if (confirmPinInput.length < 8) setConfirmPinInput((prev) => prev + digit);
      }
    } else if (viewMode === 'change-password' || viewMode === 'change-lock-style') {
      if ((viewMode === 'change-password' && step === 1) || (viewMode === 'change-lock-style' && step === 2)) {
        // Verify current PIN
        if (pinInput.length < 8) setPinInput((prev) => prev + digit);
      } else if ((viewMode === 'change-password' && step === 2) || (viewMode === 'change-lock-style' && step === 3)) {
        // New PIN
        if (pinInput.length < 8) setPinInput((prev) => prev + digit);
      } else if ((viewMode === 'change-password' && step === 3) || (viewMode === 'change-lock-style' && step === 4)) {
        // Confirm New PIN
        if (confirmPinInput.length < 8) setConfirmPinInput((prev) => prev + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (confirmPinInput.length > 0) {
      setConfirmPinInput((prev) => prev.slice(0, -1));
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  // Submit Unlock PIN
  const handleUnlockPinSubmit = async () => {
    if (lockoutTimer > 0) return;
    const res = await AuthService.verifyPin(pinInput);
    if (res.success) {
      setPinInput('');
      setErrorMessage(null);
      onSuccess();
    } else {
      setPinInput('');
      setErrorMessage(res.errorMsg || 'Incorrect PIN');
    }
  };

  // Submit Unlock Pattern
  const handleUnlockPatternComplete = async (pattern: number[]) => {
    if (lockoutTimer > 0) return;
    const res = await AuthService.verifyPattern(pattern);
    if (res.success) {
      setErrorMessage(null);
      onSuccess();
    } else {
      setErrorMessage(res.errorMsg || 'Incorrect Pattern');
    }
  };

  // FIRST TIME SETUP HANDLERS
  const handleFirstSetupChooseType = (type: 'pin' | 'pattern') => {
    setTargetLockType(type);
    setStep(1); // Create
    resetFormState();
  };

  const handleFirstSetupCreateNext = () => {
    if (targetLockType === 'pin') {
      if (pinInput.length < 4 || pinInput.length > 8) {
        setErrorMessage('PIN must be 4 to 8 digits.');
        return;
      }
      setStep(2); // Confirm PIN
      setErrorMessage(null);
    } else {
      if (patternInput.length < 3) {
        setErrorMessage('Pattern must connect at least 3 dots.');
        return;
      }
      setStep(2); // Confirm Pattern
      setErrorMessage(null);
    }
  };

  const handleFirstSetupConfirm = async () => {
    if (targetLockType === 'pin') {
      if (pinInput !== confirmPinInput) {
        setErrorMessage('PINs do not match. Please try again.');
        setConfirmPinInput('');
        return;
      }
      await AuthService.setPin(pinInput);
      onToast('Vault PIN setup successful!');
      onSuccess();
    } else {
      if (patternInput.join('-') !== confirmPatternInput.join('-')) {
        setErrorMessage('Patterns do not match. Please try again.');
        setConfirmPatternInput([]);
        return;
      }
      await AuthService.setPattern(patternInput);
      onToast('Vault Pattern setup successful!');
      onSuccess();
    }
  };

  // CHANGE PASSWORD HANDLERS
  const handleChangePasswordStep1Verify = async () => {
    const cred = currentActiveLockType === 'pin' ? pinInput : patternInput;
    const res = await AuthService.verifyCurrentPassword(cred);
    if (!res.success) {
      setErrorMessage(res.errorMsg || 'Incorrect current password.');
      resetFormState();
      return;
    }
    setVerifiedCurrentCred(cred);
    setStep(2); // Create New
    resetFormState();
  };

  const handleChangePasswordStep2Next = () => {
    if (currentActiveLockType === 'pin') {
      if (pinInput.length < 4 || pinInput.length > 8) {
        setErrorMessage('New PIN must be 4 to 8 digits.');
        return;
      }
    } else {
      if (patternInput.length < 3) {
        setErrorMessage('New Pattern must connect at least 3 dots.');
        return;
      }
    }
    setStep(3); // Confirm New
    setErrorMessage(null);
  };

  const handleChangePasswordStep3Save = async () => {
    if (!verifiedCurrentCred) return;

    if (currentActiveLockType === 'pin') {
      if (pinInput !== confirmPinInput) {
        setErrorMessage('PINs do not match. Please try again.');
        setConfirmPinInput('');
        return;
      }
      const res = await AuthService.changePassword(verifiedCurrentCred, pinInput);
      if (res.success) {
        onToast('Vault password changed successfully.');
        onSuccess();
      } else {
        setErrorMessage(res.errorMsg || 'Failed to change password.');
      }
    } else {
      if (patternInput.join('-') !== confirmPatternInput.join('-')) {
        setErrorMessage('Patterns do not match. Please try again.');
        setConfirmPatternInput([]);
        return;
      }
      const res = await AuthService.changePassword(verifiedCurrentCred, patternInput);
      if (res.success) {
        onToast('Vault password changed successfully.');
        onSuccess();
      } else {
        setErrorMessage(res.errorMsg || 'Failed to change password.');
      }
    }
  };

  // CHANGE LOCK STYLE HANDLERS
  const handleChangeStyleSelectType = (type: 'pin' | 'pattern') => {
    setTargetLockType(type);
    setStep(2); // Verify current password
    resetFormState();
  };

  const handleChangeStyleVerifyCurrent = async () => {
    const cred = currentActiveLockType === 'pin' ? pinInput : patternInput;
    const res = await AuthService.verifyCurrentPassword(cred);
    if (!res.success) {
      setErrorMessage(res.errorMsg || 'Incorrect current password.');
      resetFormState();
      return;
    }
    setVerifiedCurrentCred(cred);
    setStep(3); // Create new credential in target lock style
    resetFormState();
  };

  const handleChangeStyleCreateNext = () => {
    if (targetLockType === 'pin') {
      if (pinInput.length < 4 || pinInput.length > 8) {
        setErrorMessage('PIN must be 4 to 8 digits.');
        return;
      }
    } else {
      if (patternInput.length < 3) {
        setErrorMessage('Pattern must connect at least 3 dots.');
        return;
      }
    }
    setStep(4); // Confirm new
    setErrorMessage(null);
  };

  const handleChangeStyleConfirmSave = async () => {
    if (!verifiedCurrentCred) return;

    if (targetLockType === 'pin') {
      if (pinInput !== confirmPinInput) {
        setErrorMessage('PINs do not match. Please try again.');
        setConfirmPinInput('');
        return;
      }
      const res = await AuthService.changeLockType('pin', verifiedCurrentCred, pinInput);
      if (res.success) {
        onToast('Vault Lock Style changed to PIN.');
        onSuccess();
      } else {
        setErrorMessage(res.errorMsg || 'Failed to change lock style.');
      }
    } else {
      if (patternInput.join('-') !== confirmPatternInput.join('-')) {
        setErrorMessage('Patterns do not match. Please try again.');
        setConfirmPatternInput([]);
        return;
      }
      const res = await AuthService.changeLockType('pattern', verifiedCurrentCred, patternInput);
      if (res.success) {
        onToast('Vault Lock Style changed to Pattern.');
        onSuccess();
      } else {
        setErrorMessage(res.errorMsg || 'Failed to change lock style.');
      }
    }
  };

  // Fingerprint Biometric Trigger
  // Real BiometricPrompt integration is not wired up yet, so tapping this
  // surfaces an explicit "Coming Soon" popup instead of silently failing
  // or firing a toast the user might miss.
  const handleFingerprintClick = () => {
    setShowFingerprintComingSoon(true);
  };

  // Recovery Answer Submit
  const handleRecoverySubmit = async () => {
    const isCorrect = await AuthService.verifyRecoveryAnswer(recoveryAnswer);
    if (isCorrect) {
      AuthService.resetVaultSecurity();
      setShowForgotModal(false);
      setRecoveryAnswer('');
      setRecoveryError(null);
      onToast('Vault security reset! Please set up a new password.');
      setViewMode('first-setup');
      setStep(0);
    } else {
      setRecoveryError('Incorrect answer to recovery question.');
    }
  };

  const handleFullReset = () => {
    setShowFullResetConfirm(true);
  };

  const confirmFullReset = () => {
    setShowFullResetConfirm(false);
    AuthService.resetVaultSecurity();
    setShowForgotModal(false);
    onToast('Vault security reset.');
    setViewMode('first-setup');
    setStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 animate-fade-in select-none" style={{ backgroundColor: '#000000' }}>
      <div className="w-full max-w-sm bg-zinc-950 border border-cyan-500/30 rounded-3xl p-6 text-white space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,243,255,0.25)]">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            {viewMode === 'unlock' && 'Private Vault'}
            {viewMode === 'first-setup' && 'Secure Your Private Vault'}
            {viewMode === 'change-password' && 'Change Vault Password'}
            {viewMode === 'change-lock-style' && 'Vault Lock Style'}
          </h2>

          <p className="text-xs text-zinc-400 leading-snug">
            {lockoutTimer > 0 ? (
              <span className="text-red-400 font-bold">
                Too many failed attempts. Try again in {lockoutTimer}s.
              </span>
            ) : viewMode === 'unlock' ? (
              currentActiveLockType === 'pin' ? 'Enter your PIN to unlock' : 'Draw your pattern to unlock'
            ) : viewMode === 'first-setup' ? (
              'Choose how you want to protect your Private Vault.'
            ) : viewMode === 'change-password' ? (
              step === 1 ? 'Verify your current password first' : step === 2 ? 'Create a new password' : 'Confirm your new password'
            ) : (
              step === 1 ? 'Select desired lock style' : step === 2 ? 'Verify current password' : step === 3 ? `Create new ${targetLockType.toUpperCase()}` : `Confirm new ${targetLockType.toUpperCase()}`
            )}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs text-center font-medium flex items-center justify-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW MODE 1: UNLOCK SCREEN (PIN OR PATTERN EXCLUSIVELY)           */}
        {/* ================================================================ */}
        {viewMode === 'unlock' && (
          <>
            {currentActiveLockType === 'pin' ? (
              /* PIN UNLOCK UI */
              <div className="space-y-4">
                {/* Dots indicator */}
                <div className="flex justify-center gap-3 py-2">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border transition-all ${
                        pinInput.length > idx
                          ? 'bg-cyan-400 border-white scale-110 shadow-[0_0_12px_#22d3ee]'
                          : 'border-zinc-700 bg-zinc-900'
                      }`}
                    />
                  ))}
                </div>

                {/* PIN Keypad Grid */}
                <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigitClick(digit)}
                      disabled={lockoutTimer > 0}
                      className="h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-cyan-400 hover:bg-cyan-950/40 active:scale-95 text-lg font-bold text-white transition-all flex items-center justify-center"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleFingerprintClick}
                    className="h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-400 active:scale-95 text-purple-400 flex items-center justify-center"
                    title="Fingerprint Unlock"
                  >
                    <Fingerprint className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDigitClick('0')}
                    disabled={lockoutTimer > 0}
                    className="h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-cyan-400 hover:bg-cyan-950/40 active:scale-95 text-lg font-bold text-white transition-all flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="h-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-red-400 active:scale-95 text-zinc-400 hover:text-red-400 flex items-center justify-center"
                  >
                    ⌫
                  </button>
                </div>

                {pinInput.length >= 4 && (
                  <button
                    type="button"
                    onClick={handleUnlockPinSubmit}
                    disabled={lockoutTimer > 0}
                    className="w-full py-2.5 rounded-2xl bg-cyan-400 text-black font-extrabold text-xs hover:bg-cyan-300 transition-all shadow-lg"
                  >
                    Unlock Vault
                  </button>
                )}
              </div>
            ) : (
              /* PATTERN UNLOCK UI */
              <div className="space-y-4">
                <PatternLock
                  onComplete={handleUnlockPatternComplete}
                  disabled={lockoutTimer > 0}
                  errorMessage={errorMessage}
                />
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleFingerprintClick}
                    className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-purple-400 hover:text-purple-300 hover:border-purple-500/40 text-xs font-semibold flex items-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>Biometric Unlock</span>
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-zinc-400 hover:text-cyan-400 underline font-medium"
              >
                Forgot Password / Recovery?
              </button>
            </div>
          </>
        )}

        {/* ================================================================ */}
        {/* VIEW MODE 2: FIRST-TIME SETUP FLOW                               */}
        {/* ================================================================ */}
        {viewMode === 'first-setup' && (
          <div className="space-y-4">
            {step === 0 && (
              /* STEP 0: CHOOSE LOCK TYPE */
              <div className="space-y-3 pt-2">
                <p className="text-xs text-zinc-400 text-center">
                  Select your preferred security lock style:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleFirstSetupChooseType('pin')}
                    className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 hover:bg-cyan-950/20 text-center space-y-2 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">PIN Code</h4>
                      <p className="text-[10px] text-zinc-400">4-8 Digits</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFirstSetupChooseType('pattern')}
                    className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 hover:bg-cyan-950/20 text-center space-y-2 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Grid className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Pattern Lock</h4>
                      <p className="text-[10px] text-zinc-400">3x3 Grid Gesture</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {step === 1 && targetLockType === 'pin' && (
              /* CREATE PIN */
              <div className="space-y-4 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Create Your PIN</h3>
                <p className="text-xs text-zinc-400">Enter a 4 to 8 digit PIN code</p>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: Math.max(4, pinInput.length) }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        pinInput.length > idx ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                      }`}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        if (btn === 'C') setPinInput('');
                        else if (btn === '⌫') setPinInput((prev) => prev.slice(0, -1));
                        else handleDigitClick(btn);
                      }}
                      className="h-11 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 active:scale-95 text-base font-bold"
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleFirstSetupCreateNext}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs hover:bg-cyan-300"
                >
                  Next: Confirm PIN
                </button>
              </div>
            )}

            {step === 2 && targetLockType === 'pin' && (
              /* CONFIRM PIN */
              <div className="space-y-4 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Confirm Your PIN</h3>
                <p className="text-xs text-zinc-400">Re-enter the same PIN to verify</p>

                <div className="flex justify-center gap-2">
                  {Array.from({ length: Math.max(4, confirmPinInput.length) }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border ${
                        confirmPinInput.length > idx ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                      }`}
                    />
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        if (btn === 'C') setConfirmPinInput('');
                        else if (btn === '⌫') setConfirmPinInput((prev) => prev.slice(0, -1));
                        else handleDigitClick(btn);
                      }}
                      className="h-11 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 active:scale-95 text-base font-bold"
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleFirstSetupConfirm}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs hover:bg-cyan-300"
                >
                  Save PIN & Protect Vault
                </button>
              </div>
            )}

            {step === 1 && targetLockType === 'pattern' && (
              /* CREATE PATTERN */
              <div className="space-y-4 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Create Your Pattern</h3>
                <PatternLock
                  label="Draw a pattern connecting at least 3 dots"
                  onComplete={(p) => {
                    setPatternInput(p);
                    setErrorMessage(null);
                  }}
                  errorMessage={errorMessage}
                />

                {patternInput.length >= 3 && (
                  <button
                    type="button"
                    onClick={handleFirstSetupCreateNext}
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs hover:bg-cyan-300"
                  >
                    Next: Confirm Pattern
                  </button>
                )}
              </div>
            )}

            {step === 2 && targetLockType === 'pattern' && (
              /* CONFIRM PATTERN */
              <div className="space-y-4 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Confirm Your Pattern</h3>
                <PatternLock
                  label="Draw the same pattern again"
                  onComplete={(p) => {
                    setConfirmPatternInput(p);
                    setErrorMessage(null);
                  }}
                  errorMessage={errorMessage}
                />

                {confirmPatternInput.length >= 3 && (
                  <button
                    type="button"
                    onClick={handleFirstSetupConfirm}
                    className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-extrabold text-xs hover:bg-cyan-300"
                  >
                    Save Pattern & Protect Vault
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW MODE 3: CHANGE PASSWORD                                     */}
        {/* ================================================================ */}
        {viewMode === 'change-password' && (
          <div className="space-y-4">
            {step === 1 && (
              /* STEP 1: VERIFY CURRENT PASSWORD */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Enter Current Password</h3>

                {currentActiveLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            pinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setPinInput('');
                            else if (btn === '⌫') setPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePasswordStep1Verify}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Verify Current PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw current pattern"
                      onComplete={(p) => setPatternInput(p)}
                    />
                    {patternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangePasswordStep1Verify}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Verify Current Pattern
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              /* STEP 2: CREATE NEW PASSWORD */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Create New Password</h3>

                {currentActiveLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            pinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setPinInput('');
                            else if (btn === '⌫') setPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePasswordStep2Next}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Next: Confirm New PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw new pattern"
                      onComplete={(p) => setPatternInput(p)}
                    />
                    {patternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangePasswordStep2Next}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Next: Confirm New Pattern
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              /* STEP 3: CONFIRM NEW PASSWORD */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">Confirm New Password</h3>

                {currentActiveLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            confirmPinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setConfirmPinInput('');
                            else if (btn === '⌫') setConfirmPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangePasswordStep3Save}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Save New Password
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw same pattern again"
                      onComplete={(p) => setConfirmPatternInput(p)}
                    />
                    {confirmPatternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangePasswordStep3Save}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Save New Password
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* VIEW MODE 4: CHANGE LOCK STYLE (PIN <-> PATTERN)                 */}
        {/* ================================================================ */}
        {viewMode === 'change-lock-style' && (
          <div className="space-y-4">
            {step === 1 && (
              /* CHOOSE TARGET LOCK STYLE */
              <div className="space-y-3 pt-2 text-center">
                <p className="text-xs text-zinc-400">
                  Current Lock Style: <span className="font-bold text-cyan-400 uppercase">{currentActiveLockType}</span>
                </p>
                <p className="text-xs text-zinc-300">Choose new lock style:</p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChangeStyleSelectType('pin')}
                    className={`p-4 rounded-2xl border text-center space-y-2 transition-all ${
                      currentActiveLockType === 'pin' ? 'bg-cyan-950/40 border-cyan-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-cyan-400'
                    }`}
                  >
                    <KeyRound className="w-6 h-6 text-cyan-400 mx-auto" />
                    <div className="text-xs font-bold text-white">PIN</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeStyleSelectType('pattern')}
                    className={`p-4 rounded-2xl border text-center space-y-2 transition-all ${
                      currentActiveLockType === 'pattern' ? 'bg-purple-950/40 border-purple-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-purple-400'
                    }`}
                  >
                    <Grid className="w-6 h-6 text-purple-400 mx-auto" />
                    <div className="text-xs font-bold text-white">Pattern</div>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              /* VERIFY CURRENT CREDENTIAL BEFORE SWITCHING */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">
                  Verify Current {currentActiveLockType.toUpperCase()}
                </h3>

                {currentActiveLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            pinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setPinInput('');
                            else if (btn === '⌫') setPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeStyleVerifyCurrent}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Verify Current PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw current pattern"
                      onComplete={(p) => setPatternInput(p)}
                    />
                    {patternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangeStyleVerifyCurrent}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Verify Current Pattern
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              /* CREATE NEW CREDENTIAL IN TARGET STYLE */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">
                  Create New {targetLockType.toUpperCase()}
                </h3>

                {targetLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            pinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setPinInput('');
                            else if (btn === '⌫') setPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeStyleCreateNext}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Next: Confirm New PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw new pattern"
                      onComplete={(p) => setPatternInput(p)}
                    />
                    {patternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangeStyleCreateNext}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Next: Confirm New Pattern
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              /* CONFIRM NEW CREDENTIAL IN TARGET STYLE */
              <div className="space-y-3 text-center">
                <h3 className="text-sm font-bold text-cyan-300">
                  Confirm New {targetLockType.toUpperCase()}
                </h3>

                {targetLockType === 'pin' ? (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-full border ${
                            confirmPinInput.length > i ? 'bg-cyan-400 border-white' : 'border-zinc-700 bg-zinc-900'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                        <button
                          key={btn}
                          type="button"
                          onClick={() => {
                            if (btn === 'C') setConfirmPinInput('');
                            else if (btn === '⌫') setConfirmPinInput((prev) => prev.slice(0, -1));
                            else handleDigitClick(btn);
                          }}
                          className="h-10 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-400 font-bold"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleChangeStyleConfirmSave}
                      className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                    >
                      Save & Switch to PIN
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <PatternLock
                      label="Draw same pattern again"
                      onComplete={(p) => setConfirmPatternInput(p)}
                    />
                    {confirmPatternInput.length >= 3 && (
                      <button
                        type="button"
                        onClick={handleChangeStyleConfirmSave}
                        className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs"
                      >
                        Save & Switch to Pattern
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* FORGOT PASSWORD MODAL                                            */}
        {/* ================================================================ */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-zinc-950 border border-cyan-500/40 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>Vault Security Recovery</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="p-1 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-300">Security Recovery Question:</p>
                <p className="text-xs font-bold text-cyan-300 bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-500/20">
                  What is your favorite color?
                </p>
                <input
                  type="text"
                  placeholder="Enter answer (default: blue)..."
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                />

                {recoveryError && <p className="text-[10px] text-red-400 font-medium">{recoveryError}</p>}

                <button
                  type="button"
                  onClick={handleRecoverySubmit}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 text-black font-bold text-xs hover:bg-cyan-300"
                >
                  Submit Recovery Answer
                </button>
              </div>

              <div className="border-t border-white/10 pt-3 text-center">
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="text-[11px] text-red-400 hover:underline font-bold"
                >
                  Reset Security Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ComingSoonModal
        isOpen={showFingerprintComingSoon}
        onClose={() => setShowFingerprintComingSoon(false)}
        title="Fingerprint Unlock — Coming Soon"
        message="Biometric vault unlock isn't available yet. We're working on real fingerprint/face support and it'll arrive in a future update."
      />

      <ConfirmDialog
        isOpen={showFullResetConfirm}
        title="Reset Private Vault Security?"
        message="All security settings (password, pattern, recovery question) will be cleared. This can't be undone."
        confirmLabel="Reset"
        danger
        onConfirm={confirmFullReset}
        onCancel={() => setShowFullResetConfirm(false)}
      />
    </div>
  );
};
