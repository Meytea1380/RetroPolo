import React from 'react';
import { CrtSettings } from '../types';

interface CrtOverlayProps {
  settings: CrtSettings;
  children: React.ReactNode;
  className?: string;
  isMonitorFrame?: boolean;
}

export const CrtOverlay: React.FC<CrtOverlayProps> = ({
  settings,
  children,
  className = '',
  isMonitorFrame = false,
}) => {
  if (!settings.enabled) {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  // Color preset styles
  const getFilterStyle = () => {
    switch (settings.colorPreset) {
      case 'trinitron':
        return 'contrast(115%) saturate(125%) brightness(102%)';
      case 'gameboy':
        return 'sepia(100%) hue-rotate(50deg) saturate(320%) contrast(120%) brightness(95%)';
      case 'amber':
        return 'sepia(100%) hue-rotate(345deg) saturate(400%) contrast(135%) brightness(105%)';
      case 'cyberpunk':
        return 'contrast(120%) saturate(140%) hue-rotate(330deg)';
      case 'standard':
      default:
        return 'contrast(105%) saturate(110%)';
    }
  };

  const getScanlineClass = () => {
    switch (settings.scanlineMode) {
      case 'subtle':
        return 'crt-scanlines crt-scanlines-fine opacity-40';
      case 'heavy':
        return 'crt-scanlines crt-scanlines-heavy opacity-85';
      case 'medium':
        return 'crt-scanlines opacity-65';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ${
        settings.curvature ? 'crt-barrel' : 'rounded-lg'
      } ${settings.flicker ? 'crt-flicker' : ''} ${className}`}
      style={{
        filter: getFilterStyle(),
      }}
    >
      {/* Underlying Content */}
      <div
        className={`w-full h-full relative z-10 ${
          settings.chromaticAberration ? 'crt-chromatic' : ''
        }`}
      >
        {children}
      </div>

      {/* Phosphor Shadow Mask */}
      {settings.phosphorGrid && (
        <div className="crt-phosphor-grid" aria-hidden="true" />
      )}

      {/* Scanlines Layer */}
      {settings.scanlineMode !== 'none' && (
        <div className={getScanlineClass()} aria-hidden="true" />
      )}

      {/* CRT Glass Vignette & Reflection */}
      {settings.vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)]"
          aria-hidden="true"
        />
      )}

      {/* Subtle CRT Curved Screen Glare */}
      {settings.bloom && (
        <div
          className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.06]"
          aria-hidden="true"
        />
      )}

      {/* Physical Monitor Bezel Styling if requested */}
      {isMonitorFrame && (
        <div
          className="absolute inset-0 pointer-events-none z-40 border-[6px] border-[#181829] rounded-2xl shadow-[inset_0_0_15px_rgba(0,0,0,0.9),0_0_20px_rgba(0,0,0,0.8)]"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
