import React from 'react';
import {
  X,
  Settings,
  Volume2,
  VolumeX,
  Vibrate,
  Gamepad2,
} from 'lucide-react';
import { ControlScheme, HapticIntensity, PlayerProfile } from '../types/arcade';
import { soundFX } from '../services/soundAndHaptics';

interface SettingsModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onUpdateProfile: (partial: Partial<PlayerProfile>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  profile,
  onUpdateProfile,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentIntensity: HapticIntensity =
    profile.hapticIntensity ?? (profile.hapticsEnabled ? 'medium' : 'off');

  const controlSchemes: { id: ControlScheme; label: string; desc: string }[] = [
    {
      id: 'both',
      label: 'Swipe + D-Pad',
      desc: 'Direct 3D stage touch gestures plus virtual arcade buttons',
    },
    {
      id: 'dpad',
      label: 'D-Pad Only',
      desc: 'Dedicated on-screen arcade buttons without swipe gestures',
    },
    {
      id: 'swipe',
      label: 'Swipe Only',
      desc: 'Direct touch gestures on the 3D stage with minimal HUD buttons',
    },
  ];

  const hapticLevels: { id: HapticIntensity; label: string; desc: string }[] = [
    { id: 'off', label: 'Off', desc: '0%' },
    { id: 'low', label: 'Low', desc: '50%' },
    { id: 'medium', label: 'Medium', desc: '100%' },
    { id: 'high', label: 'High', desc: '165%' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 pointer-events-auto">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold font-display text-white">
              Settings · Controls, Audio &amp; Haptics
            </h2>
          </div>
          <button
            onClick={() => {
              soundFX.playUiTap();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Touch & Input Control Scheme */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
                Touch &amp; Input Controls
              </span>
              <span className="text-[11px] font-mono uppercase text-cyan-400">
                {profile.controlScheme === 'both'
                  ? 'Swipe + D-Pad'
                  : profile.controlScheme === 'dpad'
                  ? 'D-Pad Only'
                  : 'Swipe Only'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {controlSchemes.map((scheme) => {
                const active = profile.controlScheme === scheme.id;
                return (
                  <button
                    key={scheme.id}
                    onClick={() => {
                      soundFX.playUiTap();
                      onUpdateProfile({ controlScheme: scheme.id });
                    }}
                    className={`min-h-[64px] p-3 rounded-xl text-left transition-colors border flex flex-col justify-between ${
                      active
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{scheme.label}</span>
                    <span className="text-[11px] leading-snug opacity-80 mt-1">{scheme.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Synthesizer Audio */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  {profile.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  Synthesizer Audio
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Procedural WebAudio arcade sound effects and tactile UI chimes
                </p>
              </div>

              <button
                onClick={() => {
                  const nextState = !profile.soundEnabled;
                  onUpdateProfile({ soundEnabled: nextState });
                  if (nextState) {
                    setTimeout(() => soundFX.playUiTap(), 20);
                  }
                }}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-colors whitespace-nowrap ${
                  profile.soundEnabled
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {profile.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                {profile.soundEnabled ? 'Audio: ON' : 'Audio: MUTED'}
              </button>
            </div>
          </div>

          {/* 3. Haptic Vibration Intensity */}
          <div className="p-4 rounded-xl bg-[#07090E] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-emerald-400" />
                  Haptic Vibration Intensity
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calibrate tactile motor feedback for your mobile device hardware
                </p>
              </div>
              <span className="text-[11px] font-mono uppercase text-emerald-400 shrink-0">
                {currentIntensity}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {hapticLevels.map((lvl) => {
                const active = currentIntensity === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      soundFX.previewHaptic(lvl.id);
                      onUpdateProfile({
                        hapticIntensity: lvl.id,
                        hapticsEnabled: lvl.id !== 'off',
                      });
                    }}
                    className={`min-h-[48px] px-2 py-2 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center justify-center border whitespace-nowrap ${
                      active
                        ? lvl.id === 'off'
                          ? 'bg-slate-800 border-slate-600 text-white'
                          : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{lvl.label}</span>
                    <span className="text-[10px] font-mono opacity-75">{lvl.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
