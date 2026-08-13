import React from 'react';
import { ThemeId } from '../types';
import { THEMES } from './themes';

interface Props {
  themeId: ThemeId;
  isMediaOpen?: boolean;
}

/**
 * Fully static background layer — every theme is a single, non-animated
 * gradient paint (no keyframes, no canvas, no intervals). This keeps every
 * theme equally light on battery/CPU regardless of which one is selected.
 */
export const ThemeBackground: React.FC<Props> = ({ themeId, isMediaOpen = false }) => {
  const theme = THEMES[themeId] ?? THEMES['pure-black'];

  if (themeId === 'pure-black') {
    return <div className="fixed inset-0 bg-black -z-10 pointer-events-none" />;
  }

  if (themeId === 'pure-white') {
    return <div className="fixed inset-0 bg-white -z-10 pointer-events-none" />;
  }

  const isLightTheme = ['ivory', 'desert-sand', 'arctic', 'rose-marble'].includes(themeId);

  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none select-none transition-opacity duration-500 ${theme.previewGradient} ${
        isMediaOpen ? 'opacity-40' : 'opacity-100'
      }`}
    >
      {/* Extra static texture layer for materials that need it (brushed metal / carbon fiber / marble veining) */}
      {themeId === 'carbon' && (
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 6px)',
          }}
        />
      )}
      {themeId === 'copper-forge' && (
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(100deg, rgba(255,180,120,0.08) 0px, rgba(255,180,120,0.08) 1px, transparent 1px, transparent 8px)',
          }}
        />
      )}
      {themeId === 'rose-marble' && (
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 45%), radial-gradient(ellipse at 80% 70%, rgba(120,80,80,0.15) 0%, transparent 50%)',
          }}
        />
      )}
      {/* Soft top-light falloff shared by the dark premium themes for subtle depth */}
      {!isLightTheme && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 55%)',
          }}
        />
      )}
    </div>
  );
};
