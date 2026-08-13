// ============================================================================
// BILLING SERVICE - CAPACITOR-READY ABSTRACTION LAYER
// Manages Google Play Billing status, Premium features comparison, and mock upgrade flow.
// Note: Google Play Billing takes 15-30% commission per sale, zero upfront fee.
// // TODO: Capacitor native swap point -> Swap with @capacitor-community/in-app-purchases or Google Play Billing Library
// ============================================================================

import { StorageService } from './storage';

export interface PlanFeature {
  featureName: string;
  freeTier: string | boolean;
  premiumTier: string | boolean;
}

export const BillingService = {
  isPremium(): boolean {
    return StorageService.getItem<boolean>('is_premium_user', false);
  },

  setPremiumStatus(isPremium: boolean): void {
    StorageService.setItem('is_premium_user', isPremium);
  },

  // Mock Google Play Purchase Flow
  // // TODO: Capacitor native swap point -> Native Google Play Billing purchase flow
  async purchasePremium(): Promise<{ success: boolean; message: string }> {
    this.setPremiumStatus(true);
    return {
      success: true,
      message: 'Successfully upgraded to Neo Gallery Pro! All features unlocked & Ads removed.',
    };
  },

  getFeatureComparison(): PlanFeature[] {
    return [
      { featureName: 'Ad-Free Experience', freeTier: 'Supported by AdMob', premiumTier: true },
      { featureName: 'Private Vault Storage', freeTier: 'Up to 15 items', premiumTier: 'Unlimited Storage' },
      { featureName: 'Photo Compression & Resize', freeTier: 'Standard', premiumTier: 'Ultra HD Lossless' },
      { featureName: 'Smart Storage Cleaner', freeTier: 'Basic Duplicate Scan', premiumTier: 'Deep Scan & Auto-Clean' },
      { featureName: 'Priority Support', freeTier: false, premiumTier: true },
    ];
  },
};
