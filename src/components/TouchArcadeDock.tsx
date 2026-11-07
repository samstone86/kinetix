import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RotateCw,
  ArrowDownToLine,
  Undo2,
  RotateCcw,
  Zap,
  Flag,
  Radar,
  Crosshair,
  ChevronDown as CollapseIcon,
  ChevronUp as ExpandIcon,
} from 'lucide-react';
import {
  ControlScheme,
  GameConfig,
  GameId,
  LiveGameHUDState,
  XODifficulty,
  XOGridSize,
  XOMode,
} from '../types/arcade';
import { ArcadeStageHandle } from '../three/ArcadeStage3D';
import { soundFX } from '../services/soundAndHaptics';

interface TouchArcadeDockProps {
  selectedGame: GameId;
  controlScheme: ControlScheme;
  config: GameConfig;
  hud: LiveGameHUDState;
  stageRef: React.RefObject<ArcadeStageHandle | null>;
  onUpdateConfig: (next: GameConfig) => void;
}

export const TouchArcadeDock: React.FC<TouchArcadeDockProps> = ({
  selectedGame,
  controlScheme,
  config,
  hud,
  stageRef,
  onUpdateConfig,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('lumina_dock_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const showDpad = controlScheme === 'both' || controlScheme === 'dpad';
  const holdTimerRef = useRef<number | null>(null);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startHold = useCallback(
    (
      action:
        | 'left'
        | 'right'
        | 'up'
        | 'down'
        | 'rotate'
        | 'drop'
        | 'boostOn'
        | 'boostOff'
        | 'undo'
        | 'restart'
        | 'special'
        | 'toggleFlag',
      intervalMs = 95
    ) => {
      stopHold();
      stageRef.current?.triggerAction(action);
      holdTimerRef.current = window.setInterval(() => {
        stageRef.current?.triggerAction(action);
      }, intervalMs);
    },
    [stageRef, stopHold]
  );

  useEffect(() => {
    return () => stopHold();
  }, [selectedGame, stopHold]);

  return (
    <div
      className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 w-[95vw] max-w-[760px] pointer-events-auto touch-none select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Collapse / Expand Handle (Cinema / Zen Mode Drawer) */}
      <div className="flex justify-center mb-1">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            soundFX.playUiTap();
            setCollapsed((prev) => {
              const next = !prev;
              try {
                window.localStorage.setItem('lumina_dock_collapsed', next ? '1' : '0');
              } catch {
                // ignore storage errors
              }
              return next;
            });
          }}
          className="px-3 py-0.5 sm:py-1 rounded-t-xl rounded-b-md bg-[#0B0F19]/90 border border-slate-800/90 text-[10px] sm:text-[11px] font-medium text-slate-400 hover:text-white flex items-center gap-1.5 shadow-lg whitespace-nowrap"
        >
          {collapsed ? (
            <>
              <ExpandIcon className="w-3.5 h-3.5 text-cyan-400" />
              Show Controls
            </>
          ) : (
            <>
              <CollapseIcon className="w-3.5 h-3.5 text-slate-400" />
              Hide Controls
            </>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="rounded-2xl bg-[#0B0F19]/92 backdrop-blur-md border border-slate-800/90 px-2.5 py-2 sm:px-4 sm:py-3 shadow-2xl">
          {/* 1. PRISM DROP (TETRIS) */}
          {selectedGame === 'tetris' && (
            <div className="flex items-center justify-between gap-3">
              {showDpad ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startHold('left', 110);
                    }}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    className="min-h-[52px] min-w-[52px] sm:min-w-[56px] rounded-xl bg-slate-900 active:bg-cyan-500/25 border border-slate-700/80 flex items-center justify-center text-cyan-300"
                    aria-label="Move Left"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startHold('down', 75);
                    }}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    className="min-h-[52px] min-w-[52px] sm:min-w-[56px] rounded-xl bg-slate-900 active:bg-cyan-500/25 border border-slate-700/80 flex items-center justify-center text-cyan-300"
                    aria-label="Soft Drop"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startHold('right', 110);
                    }}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    className="min-h-[52px] min-w-[52px] sm:min-w-[56px] rounded-xl bg-slate-900 active:bg-cyan-500/25 border border-slate-700/80 flex items-center justify-center text-cyan-300"
                    aria-label="Move Right"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Swipe Left/Right to Move · Use Dedicated ROTATE &amp; DROP Buttons
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    stageRef.current?.triggerAction('rotate');
                  }}
                  className="min-h-[52px] px-4 sm:px-5 rounded-xl bg-violet-500/25 active:bg-violet-500/45 border border-violet-400/70 text-violet-100 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_16px_rgba(139,92,246,0.3)] whitespace-nowrap"
                  aria-label="Rotate Prism"
                >
                  <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-violet-300" />
                  ROTATE
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    stageRef.current?.triggerAction('drop');
                  }}
                  className="min-h-[52px] px-4 rounded-xl bg-amber-500/20 active:bg-amber-500/40 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                  aria-label="Hard Drop"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  DROP
                </button>
              </div>
            </div>
          )}

          {/* 2. QUANTUM GRID (X-O) */}
          {selectedGame === 'xo' && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-xl border border-slate-800 shrink-0">
                {([3, 4, 5] as XOGridSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      soundFX.playUiTap();
                      onUpdateConfig({ ...config, xo: { ...config.xo, gridSize: sz } });
                      setTimeout(() => stageRef.current?.triggerAction('restart'), 10);
                    }}
                    className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      config.xo.gridSize === sz
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sz}×{sz}
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-1 bg-[#07090E] p-1 rounded-xl border border-slate-800 overflow-x-auto">
                {(
                  [
                    { label: 'AI Casual', mode: 'ai', diff: 'casual' },
                    { label: 'AI Tactical', mode: 'ai', diff: 'tactical' },
                    { label: 'AI Unbeatable', mode: 'ai', diff: 'unbeatable' },
                    { label: '2P Local', mode: 'local2p', diff: config.xo.difficulty },
                  ] as { label: string; mode: XOMode; diff: XODifficulty }[]
                ).map((opt) => {
                  const active =
                    config.xo.mode === opt.mode &&
                    (opt.mode === 'local2p' || config.xo.difficulty === opt.diff);
                  return (
                    <button
                      key={opt.label}
                      onClick={() => {
                        soundFX.playUiTap();
                        onUpdateConfig({
                          ...config,
                          xo: { ...config.xo, mode: opt.mode, difficulty: opt.diff },
                        });
                        setTimeout(() => stageRef.current?.triggerAction('restart'), 10);
                      }}
                      className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        active ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => stageRef.current?.triggerAction('undo')}
                  disabled={!hud.canUndo}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-900 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
                <button
                  onClick={() => stageRef.current?.triggerAction('restart')}
                  className="min-h-[38px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* 3. VIPER PULSE (SNAKE) */}
          {selectedGame === 'snake' && (
            <div className="flex items-center justify-between gap-4">
              {showDpad ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('left')}
                    className="min-h-[48px] min-w-[50px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-300"
                    aria-label="Turn Left"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('up')}
                      className="min-h-[44px] min-w-[50px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-300"
                      aria-label="Turn Up"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('down')}
                      className="min-h-[44px] min-w-[50px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-300"
                      aria-label="Turn Down"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  </div>
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('right')}
                    className="min-h-[48px] min-w-[50px] rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-300"
                    aria-label="Turn Right"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Swipe Anywhere in 4 Directions to Steer Serpent
                </div>
              )}

              <button
                onPointerDown={() => stageRef.current?.triggerAction('boostOn')}
                onPointerUp={() => stageRef.current?.triggerAction('boostOff')}
                onPointerLeave={() => stageRef.current?.triggerAction('boostOff')}
                className="min-h-[52px] px-5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center gap-2 whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                HOLD BOOST (+10 PTS)
              </button>
            </div>
          )}

          {/* 4. AEGIS BREAKER (3D BRICK BREAKER) */}
          {selectedGame === 'breaker' && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={() => startHold('left', 45)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="min-h-[50px] min-w-[56px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-violet-300"
                  aria-label="Paddle Left"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onPointerDown={() => startHold('right', 45)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="min-h-[50px] min-w-[56px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-violet-300"
                  aria-label="Paddle Right"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">
                  Or drag finger directly on the 3D arena
                </span>
              </div>

              <button
                onPointerDown={() => stageRef.current?.triggerAction('special')}
                className="min-h-[50px] px-5 rounded-xl bg-violet-500/20 border border-violet-500/50 text-violet-200 font-bold text-xs flex items-center gap-2 whitespace-nowrap"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" />
                LAUNCH / FIRE LASER ({hud.specialCharges ?? 0})
              </button>
            </div>
          )}

          {/* 5. VECTOR PONG: OVERDRIVE */}
          {selectedGame === 'pong' && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={() => startHold('left', 45)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="min-h-[50px] min-w-[56px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-300"
                  aria-label="Paddle Left"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onPointerDown={() => startHold('right', 45)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="min-h-[50px] min-w-[56px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-300"
                  aria-label="Paddle Right"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <span className="hidden sm:inline text-xs text-slate-400 ml-2">
                  Drag finger to track · Hit golden center gate for 1.2x Overcharge
                </span>
              </div>

              <button
                onPointerDown={() => stageRef.current?.triggerAction('special')}
                className="min-h-[50px] px-5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 font-bold text-xs flex items-center gap-2 whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                DASH STRIKE
              </button>
            </div>
          )}

          {/* 6. GRAVITY DROP 4 (3D CONNECT FOUR) */}
          {selectedGame === 'connect4' && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('left')}
                  className="min-h-[46px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-300"
                  aria-label="Previous Column"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('drop')}
                  className="min-h-[46px] px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  DROP DISC
                </button>
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('right')}
                  className="min-h-[46px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-300"
                  aria-label="Next Column"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {config.connect4.popOutMode && (
                  <button
                    onClick={() => stageRef.current?.triggerAction('special')}
                    className="min-h-[42px] px-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold whitespace-nowrap"
                  >
                    Pop Bottom
                  </button>
                )}
                <button
                  onClick={() => stageRef.current?.triggerAction('undo')}
                  disabled={!hud.canUndo}
                  className="min-h-[42px] px-3 rounded-xl bg-slate-900 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
                <button
                  onClick={() => stageRef.current?.triggerAction('restart')}
                  className="min-h-[42px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* 7. HEXA PULSE 2048 (3D SKYSCRAPER MERGER) */}
          {selectedGame === 'merge2048' && (
            <div className="flex items-center justify-between gap-4">
              {showDpad ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('left')}
                    className="min-h-[46px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-fuchsia-300"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('up')}
                      className="min-h-[40px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-fuchsia-300"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('down')}
                      className="min-h-[40px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-fuchsia-300"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('right')}
                    className="min-h-[46px] min-w-[48px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-fuchsia-300"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  Swipe 4-Ways to Merge Monoliths up to 2048
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => stageRef.current?.triggerAction('special')}
                  disabled={(hud.specialCharges ?? 0) <= 0}
                  className="min-h-[46px] px-3.5 rounded-xl bg-fuchsia-500/20 disabled:opacity-40 border border-fuchsia-500/50 text-fuchsia-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 text-amber-400" />
                  SHOCKWAVE ({hud.specialCharges ?? 0})
                </button>
                <button
                  onClick={() => stageRef.current?.triggerAction('undo')}
                  disabled={!hud.canUndo}
                  className="min-h-[46px] px-3.5 rounded-xl bg-slate-900 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
              </div>
            </div>
          )}

          {/* 8. VOID RUNNER (3D STARFIGHTER) */}
          {selectedGame === 'runner' && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('left')}
                  className="min-h-[50px] min-w-[54px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-300"
                  aria-label="Lane Left"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('right')}
                  className="min-h-[50px] min-w-[54px] rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-300"
                  aria-label="Lane Right"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('up')}
                  className="min-h-[50px] px-4 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ChevronUp className="w-4 h-4" />
                  THRUST JUMP
                </button>
                <button
                  onPointerDown={() => stageRef.current?.triggerAction('special')}
                  disabled={(hud.specialCharges ?? 0) <= 0}
                  className="min-h-[50px] px-4 rounded-xl bg-amber-500/20 disabled:opacity-40 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Zap className="w-4 h-4" />
                  PHASE SHIFT (3 RINGS)
                </button>
              </div>
            </div>
          )}

          {/* 9. CYBER MINES: SECTOR ZERO */}
          {selectedGame === 'mines' && (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => stageRef.current?.triggerAction('toggleFlag')}
                className={`min-h-[42px] sm:min-h-[46px] px-3 sm:px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                  hud.flagMode
                    ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
              >
                <Flag className="w-4 h-4 shrink-0" />
                <span>{hud.flagMode ? 'FLAG ON' : 'REVEAL'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => stageRef.current?.triggerAction('special')}
                  disabled={(hud.specialCharges ?? 0) <= 0}
                  className="min-h-[42px] sm:min-h-[46px] px-3 sm:px-4 rounded-xl bg-cyan-500/20 disabled:opacity-40 border border-cyan-500/50 text-cyan-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Radar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>SONAR ({hud.specialCharges ?? 0})</span>
                </button>
                <button
                  onClick={() => stageRef.current?.triggerAction('restart')}
                  className="min-h-[42px] sm:min-h-[46px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">New Grid</span>
                </button>
              </div>
            </div>
          )}

          {/* 10. NOVA INVADERS (SPACE DEFENSE) */}
          {selectedGame === 'invaders' && (
            <div className="flex items-center justify-between gap-2">
              {showDpad ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={() => startHold('left', 45)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    className="min-h-[44px] sm:min-h-[50px] min-w-[48px] sm:min-w-[58px] rounded-xl bg-slate-900 active:bg-cyan-500/25 border border-slate-700/80 flex items-center justify-center text-cyan-300"
                    aria-label="Move Cannon Left"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onPointerDown={() => startHold('right', 45)}
                    onPointerUp={stopHold}
                    onPointerLeave={stopHold}
                    onPointerCancel={stopHold}
                    className="min-h-[44px] sm:min-h-[50px] min-w-[48px] sm:min-w-[58px] rounded-xl bg-slate-900 active:bg-cyan-500/25 border border-slate-700/80 flex items-center justify-center text-cyan-300"
                    aria-label="Move Cannon Right"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 truncate">
                  Drag to Steer Cannon
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  onPointerDown={() => startHold('drop', 180)}
                  onPointerUp={stopHold}
                  onPointerLeave={stopHold}
                  onPointerCancel={stopHold}
                  className="min-h-[44px] sm:min-h-[50px] px-3 sm:px-4 rounded-xl bg-cyan-500/20 active:bg-cyan-500/40 border border-cyan-500/50 text-cyan-200 font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)] whitespace-nowrap"
                >
                  <Crosshair className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>FIRE</span>
                </button>

                <button
                  onClick={() => stageRef.current?.triggerAction('special')}
                  disabled={(hud.specialCharges ?? 0) <= 0}
                  className="min-h-[44px] sm:min-h-[50px] px-3 sm:px-4 rounded-xl bg-amber-500/20 disabled:opacity-40 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>EMP ({hud.specialCharges ?? 0})</span>
                </button>

                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    onUpdateConfig({
                      ...config,
                      invaders: {
                        ...config.invaders,
                        autoFire: !config.invaders?.autoFire,
                      },
                    });
                  }}
                  className={`min-h-[44px] sm:min-h-[50px] px-2.5 sm:px-3.5 rounded-xl border text-xs font-semibold whitespace-nowrap ${
                    config.invaders?.autoFire
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {config.invaders?.autoFire ? 'AUTO' : 'MANUAL'}
                </button>
              </div>
            </div>
          )}

          {/* 11. CYBER PAC: NEON LABYRINTH */}
          {selectedGame === 'pac' && (
            <div className="flex items-center justify-between gap-2">
              {showDpad ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('left')}
                    className="min-h-[44px] sm:min-h-[48px] min-w-[46px] sm:min-w-[50px] rounded-xl bg-slate-900 active:bg-amber-500/25 border border-slate-700/80 flex items-center justify-center text-amber-300"
                    aria-label="Turn Left"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <div className="flex flex-col gap-1">
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('up')}
                      className="min-h-[40px] sm:min-h-[44px] min-w-[46px] sm:min-w-[50px] rounded-xl bg-slate-900 active:bg-amber-500/25 border border-slate-700/80 flex items-center justify-center text-amber-300"
                      aria-label="Turn Up"
                    >
                      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onPointerDown={() => stageRef.current?.triggerAction('down')}
                      className="min-h-[40px] sm:min-h-[44px] min-w-[46px] sm:min-w-[50px] rounded-xl bg-slate-900 active:bg-amber-500/25 border border-slate-700/80 flex items-center justify-center text-amber-300"
                      aria-label="Turn Down"
                    >
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  <button
                    onPointerDown={() => stageRef.current?.triggerAction('right')}
                    className="min-h-[44px] sm:min-h-[48px] min-w-[46px] sm:min-w-[50px] rounded-xl bg-slate-900 active:bg-amber-500/25 border border-slate-700/80 flex items-center justify-center text-amber-300"
                    aria-label="Turn Right"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 truncate">
                  Swipe 4-Ways to Queue Turns at Intersections
                </div>
              )}

              <button
                onClick={() => stageRef.current?.triggerAction('special')}
                disabled={(hud.specialCharges ?? 0) <= 0}
                className="min-h-[44px] sm:min-h-[50px] px-3.5 sm:px-5 rounded-xl bg-amber-500/20 disabled:opacity-40 border border-amber-500/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>PHASE DASH ({hud.specialCharges ?? 0})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
