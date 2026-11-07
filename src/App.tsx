import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Home,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Award,
  Target,
  Flame,
  CheckCircle2,
  RefreshCw,
  Zap,
  Shuffle,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  evaluateDailyChallengeMatch,
  getActiveDailyChallenge,
  getRankInfo,
  getTimeUntilNextDailyReset,
  loadProfile,
  saveProfile,
  syncDailyChallengeForToday,
} from './services/profileStore';
import {
  Achievement,
  ALL_GAME_IDS,
  DailyChallengeTemplate,
  GameConfig,
  GameId,
  GauntletSessionState,
  GauntletStageResult,
  LiveGameHUDState,
  MinesDensity,
  PlayerProfile,
  ShellState,
  SnakeSpeed,
  XOGridSize,
  XOMode,
} from './types/arcade';
import { ArcadeStage3D, ArcadeStageHandle } from './three/ArcadeStage3D';
import { TouchArcadeDock } from './components/TouchArcadeDock';
import { ProfileAndApkModal } from './components/ProfileAndApkModal';
import { SettingsModal } from './components/SettingsModal';
import { soundFX } from './services/soundAndHaptics';

const GAME_CATALOG: Record<
  GameId,
  {
    shortTab: string;
    title: string;
    kicker: string;
    description: string;
    ctaBg: string;
    controlsHint: string;
  }
> = {
  tetris: {
    shortTab: 'Prism Drop',
    title: 'PRISM DROP',
    kicker: '01 · 3D POLYOMINO MATRIX · 10×20 WELL',
    description:
      'Stack beveled emissive tetrominoes with 3D ghost-piece landing guides, SRS wall-kicks, and harmonic line-clear combos.',
    ctaBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_28px_rgba(6,182,212,0.4)]',
    controlsHint: 'WASD / Swipe Left-Right Move · Dedicated Rotate Button / Up · Pull Down Hard Drop',
  },
  xo: {
    shortTab: 'Quantum X-O',
    title: 'QUANTUM GRID',
    kicker: '02 · 3D TACTICAL X-O · 3×3 / 4×4 / 5×5',
    description:
      'Outsmart the Alpha-Beta Minimax AI across three difficulty tiers or challenge a friend in local 2-player pass-and-play.',
    ctaBg: 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_28px_rgba(244,63,94,0.4)]',
    controlsHint: 'Tap 3D Grid Cell to Place Mark · Switch 3×3 / 4×4 / 5×5 & AI Tier Below · Esc Pause',
  },
  snake: {
    shortTab: 'Viper Pulse',
    title: 'VIPER PULSE',
    kicker: '03 · 3D CYBER SERPENT · 15×15 ARENA',
    description:
      'Pilot an articulated emerald cyber-viper to harvest rotating plasma gyro cores with turn-buffered inputs and overdrive boost.',
    ctaBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_28px_rgba(16,185,129,0.4)]',
    controlsHint: 'WASD / Swipe / D-Pad to Steer · Hold Space / Boost for Overdrive · Esc Pause',
  },
  breaker: {
    shortTab: 'Aegis Breaker',
    title: 'AEGIS BREAKER',
    kicker: '04 · 3D CRYSTAL ARKANOID · ORDNANCE BAY',
    description:
      'Deflect high-velocity plasma orbs with a brushed titanium paddle to shatter multi-hit crystal towers and collect laser capsules.',
    ctaBg: 'bg-violet-500 hover:bg-violet-400 text-white shadow-[0_0_28px_rgba(139,92,246,0.4)]',
    controlsHint: 'Drag Finger / A-D to Slide Paddle · Space / Tap to Launch Orb & Fire Twin Lasers',
  },
  pong: {
    shortTab: 'Vector Pong',
    title: 'VECTOR PONG',
    kicker: '05 · 3D OVERDRIVE AIR HOCKEY · RINK',
    description:
      'Curve high-speed energy pucks through the oscillating golden Overcharge Gate and unleash Dash Strikes against AI or 2P.',
    ctaBg: 'bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-[0_0_28px_rgba(56,189,248,0.4)]',
    controlsHint: 'Drag Finger / A-D to Track Puck · Space / Dash Strike to Slam at 1.5× Speed',
  },
  connect4: {
    shortTab: 'Gravity Drop 4',
    title: 'GRAVITY DROP 4',
    kicker: '06 · 3D VERTICAL 7×6 RACK · MINIMAX AI',
    description:
      'Drop glowing cyan and rose reactor cores into a 3D vertical matrix in Classic or Pop-Out mode against Alpha-Beta AI or 2P.',
    ctaBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_28px_rgba(245,158,11,0.4)]',
    controlsHint: 'Tap Any 3D Column or Use Left/Right + Drop · Connect 4 Cores in Any Direction',
  },
  merge2048: {
    shortTab: 'Hexa 2048',
    title: 'HEXA PULSE 2048',
    kicker: '07 · 3D SKYSCRAPER MONOLITH MERGER',
    description:
      'Slide and fuse glowing 3D towers that grow taller from 2 up to 2048, equipped with tactical Undo and Reactor Shockwave charges.',
    ctaBg: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-[0_0_28px_rgba(217,70,239,0.4)]',
    controlsHint: 'Swipe 4 Directions or Use D-Pad to Merge Towers · Trigger Shockwave to Clear 2/4s',
  },
  runner: {
    shortTab: 'Void Runner',
    title: 'VOID RUNNER',
    kicker: '08 · 3D STARFIGHTER CANYON DODGER',
    description:
      'Bank across three neon synth lanes, thrust-jump over low laser hurdles, and harvest warp rings to trigger Phase Shift invulnerability.',
    ctaBg: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.4)]',
    controlsHint: 'Swipe Left/Right to Bank Lanes · Swipe Up / Space to Thrust Jump · Phase Shift',
  },
  mines: {
    shortTab: 'Cyber Mines',
    title: 'CYBER MINES',
    kicker: '09 · 3D TACTICAL VAULT SWEEPER · 7×7',
    description:
      'Uncover safe gunmetal vaults with guaranteed safe first tap, chord reveals, laser flag beacons, and Sonar Scanner pulses.',
    ctaBg: 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_28px_rgba(244,63,94,0.4)]',
    controlsHint: 'Tap Vault to Reveal · Toggle Flag Mode (or Long-Press) to Plant Beacon · Sonar Scan',
  },
  invaders: {
    shortTab: 'Nova Invaders',
    title: 'NOVA INVADERS',
    kicker: '10 · 3D SPACE DEFENSE · AEGIS DESCENT',
    description:
      'Defend Earth against stepped alien formations with a twin-plasma defense cannon, breakable crystal energy bunkers, golden UFO motherships, and EMP bombs.',
    ctaBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_28px_rgba(6,182,212,0.4)]',
    controlsHint: 'Drag Finger / A-D to Slide Cannon · Space / Tap to Fire Plasma Lasers · B / EMP Bomb',
  },
  pac: {
    shortTab: 'Cyber Pac',
    title: 'CYBER PAC',
    kicker: '11 · 3D NEON LABYRINTH CHASER',
    description:
      'Navigate a glowing 3D cyber-labyrinth with warp tunnels, devour Overdrive Cores to hunt down 4 AI phantom drones, and trigger Phase Dash.',
    ctaBg: 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_28px_rgba(250,204,21,0.4)]',
    controlsHint: 'Swipe / D-Pad to Queue Next Turn · Space / B to Trigger Phase Dash',
  },
};

const GAUNTLET_MULTIPLIERS: [number, number, number] = [1.0, 1.5, 2.5];

function draftRandomGauntletLineup(excludeFirst?: GameId): [GameId, GameId, GameId] {
  const pool = [...ALL_GAME_IDS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  if (excludeFirst && pool[0] === excludeFirst) {
    [pool[0], pool[3]] = [pool[3], pool[0]];
  }
  return [pool[0], pool[1], pool[2]];
}

export default function App() {
  const stageRef = useRef<ArcadeStageHandle | null>(null);

  const [shellState, setShellState] = useState<ShellState>('HUB');
  const [selectedGame, setSelectedGame] = useState<GameId>('tetris');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [gauntletLineup, setGauntletLineup] = useState<[GameId, GameId, GameId]>(() => [
    'tetris',
    'runner',
    'pac',
  ]);
  const [gauntletSession, setGauntletSession] = useState<GauntletSessionState | null>(null);

  const [config, setConfig] = useState<GameConfig>({
    tetris: { startLevel: 1, ghostPiece: true },
    xo: { mode: 'ai', difficulty: 'unbeatable', gridSize: 3, playerFirst: true },
    snake: { speed: 'normal', wrapWalls: false },
    breaker: { difficulty: 'normal' },
    pong: { mode: 'ai', difficulty: 'tactical', winScore: 5 },
    connect4: { mode: 'ai', difficulty: 'tactical', popOutMode: false },
    merge2048: { shockwaveEnabled: true },
    runner: { speed: 'normal' },
    mines: { density: 'standard', flagMode: false },
    invaders: { autoFire: true },
    pac: { speed: 'normal' },
  });

  const [hud, setHud] = useState<LiveGameHUDState>({
    score: 0,
    secondaryValue: 0,
    secondaryLabel: 'LINES',
    tertiaryValue: 'LVL 1',
    tertiaryLabel: 'SPEED',
  });

  const [lastMatchSummary, setLastMatchSummary] = useState<{
    outcome: 'VICTORY' | 'GAME_OVER';
    score: number;
    xpEarned: number;
    isNewBest: boolean;
    newlyUnlocked: Achievement[];
    completedDailyChallenge?: DailyChallengeTemplate | null;
    xoWinner?: 'X' | 'O' | 'DRAW';
  } | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [resetCountdown, setResetCountdown] = useState<string>(() => getTimeUntilNextDailyReset());

  useEffect(() => {
    soundFX.configure(
      profile.soundEnabled,
      profile.hapticIntensity ?? (profile.hapticsEnabled ? 'medium' : 'off')
    );
  }, [profile.soundEnabled, profile.hapticIntensity, profile.hapticsEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setResetCountdown(getTimeUntilNextDailyReset());
      setProfile((prev) => {
        const syncedDaily = syncDailyChallengeForToday(prev.dailyChallenge);
        if (syncedDaily.dateKey !== prev.dailyChallenge.dateKey) {
          const next = { ...prev, dailyChallenge: syncedDaily };
          saveProfile(next);
          return next;
        }
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateProfile = useCallback((partial: Partial<PlayerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...partial };
      saveProfile(next);
      return next;
    });
  }, []);

  const handleCycleDailyDirective = useCallback(() => {
    soundFX.playUiTap();
    setProfile((prev) => {
      const synced = syncDailyChallengeForToday(prev.dailyChallenge);
      const nextOffset = synced.activeIndexOffset + 1;
      const nextDaily = {
        ...synced,
        activeIndexOffset: nextOffset,
        currentValue: 0,
      };
      const nextChallenge = getActiveDailyChallenge(nextDaily);
      const alreadyDone = nextDaily.completedIds.includes(nextChallenge.id);
      if (alreadyDone) {
        nextDaily.currentValue = nextChallenge.targetValue;
      }
      const next = { ...prev, dailyChallenge: nextDaily };
      saveProfile(next);
      setSelectedGame(nextChallenge.game);
      return next;
    });
  }, []);

  const handleLaunchGame = useCallback((gameToLaunch?: GameId) => {
    soundFX.playUiTap();
    setGauntletSession(null);
    if (gameToLaunch) {
      setSelectedGame(gameToLaunch);
    }
    setLastMatchSummary(null);
    setShellState('PLAYING');
  }, []);

  const handleShuffleGauntlet = useCallback(() => {
    soundFX.playHubSwitch();
    setGauntletLineup((prev) => {
      const next = draftRandomGauntletLineup(prev[0]);
      setSelectedGame(next[0]);
      return next;
    });
  }, []);

  const handleLaunchGauntlet = useCallback(() => {
    soundFX.playUiTap();
    setGauntletSession({
      active: true,
      lineup: gauntletLineup,
      stageIndex: 0,
      results: [],
      awaitingNextStage: false,
      completed: false,
    });
    setSelectedGame(gauntletLineup[0]);
    setLastMatchSummary(null);
    setShellState('PLAYING');
  }, [gauntletLineup]);

  const handleAdvanceGauntletStage = useCallback(() => {
    if (!gauntletSession || !gauntletSession.active || gauntletSession.stageIndex >= 2) return;
    const nextIdx = (gauntletSession.stageIndex + 1) as 0 | 1 | 2;
    const nextGame = gauntletSession.lineup[nextIdx];
    soundFX.playUiTap();
    setGauntletSession({
      ...gauntletSession,
      stageIndex: nextIdx,
      awaitingNextStage: false,
    });
    setSelectedGame(nextGame);
    setLastMatchSummary(null);
    setShellState('PLAYING');
  }, [gauntletSession]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showProfileModal || showSettingsModal) return;
      if (shellState === 'HUB' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleLaunchGame();
      } else if (
        (shellState === 'VICTORY' || shellState === 'GAME_OVER') &&
        gauntletSession?.active &&
        gauntletSession.awaitingNextStage &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        handleAdvanceGauntletStage();
      } else if (shellState === 'HUB' && (e.code === 'ArrowLeft' || e.code === 'KeyA')) {
        e.preventDefault();
        const idx = ALL_GAME_IDS.indexOf(selectedGame);
        soundFX.playHubSwitch();
        setSelectedGame(ALL_GAME_IDS[(idx - 1 + ALL_GAME_IDS.length) % ALL_GAME_IDS.length]);
      } else if (shellState === 'HUB' && (e.code === 'ArrowRight' || e.code === 'KeyD')) {
        e.preventDefault();
        const idx = ALL_GAME_IDS.indexOf(selectedGame);
        soundFX.playHubSwitch();
        setSelectedGame(ALL_GAME_IDS[(idx + 1) % ALL_GAME_IDS.length]);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (shellState === 'PLAYING') {
          soundFX.playUiTap();
          setShellState('PAUSED');
        } else if (shellState === 'PAUSED') {
          soundFX.playUiTap();
          setShellState('PLAYING');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    shellState,
    selectedGame,
    showProfileModal,
    showSettingsModal,
    gauntletSession,
    handleLaunchGame,
    handleAdvanceGauntletStage,
  ]);

  const handleGameEnd = useCallback(
    (
      outcome: 'VICTORY' | 'GAME_OVER',
      summary: {
        game: GameId;
        score: number;
        linesOrLength: number;
        level: number;
        hadQuadTetris?: boolean;
        xoWinner?: 'X' | 'O' | 'DRAW';
      }
    ) => {
      setProfile((prev) => {
        const hs = { ...prev.highScores };
        let isNewBest = false;

        if (summary.game === 'tetris') {
          if (summary.score > hs.tetrisScore) {
            hs.tetrisScore = summary.score;
            isNewBest = true;
          }
          hs.tetrisMaxLines = Math.max(hs.tetrisMaxLines, summary.linesOrLength);
          hs.tetrisMaxLevel = Math.max(hs.tetrisMaxLevel, summary.level);
        } else if (summary.game === 'xo') {
          if (summary.xoWinner === 'X' && config.xo.mode === 'ai') {
            hs.xoWinsAI += 1;
            hs.xoStreak += 1;
            isNewBest = true;
          } else if (summary.xoWinner === 'O' && config.xo.mode === 'ai') {
            hs.xoStreak = 0;
          }
          if (
            config.xo.mode === 'ai' &&
            config.xo.difficulty === 'unbeatable' &&
            (summary.xoWinner === 'X' || summary.xoWinner === 'DRAW')
          ) {
            hs.xoWinsUnbeatableDrawsOrWins += 1;
          }
        } else if (summary.game === 'snake') {
          if (summary.score > hs.snakeScore) {
            hs.snakeScore = summary.score;
            isNewBest = true;
          }
          hs.snakeMaxLength = Math.max(hs.snakeMaxLength, summary.linesOrLength);
        } else if (summary.game === 'breaker') {
          if (summary.score > hs.breakerScore) {
            hs.breakerScore = summary.score;
            isNewBest = true;
          }
        } else if (summary.game === 'pong') {
          if (outcome === 'VICTORY') {
            hs.pongWins += 1;
            isNewBest = true;
          }
        } else if (summary.game === 'connect4') {
          if (outcome === 'VICTORY') {
            hs.connect4Wins += 1;
            isNewBest = true;
          }
        } else if (summary.game === 'merge2048') {
          if (summary.score > hs.merge2048BestScore) {
            hs.merge2048BestScore = summary.score;
            isNewBest = true;
          }
          hs.merge2048MaxTile = Math.max(hs.merge2048MaxTile, summary.linesOrLength);
        } else if (summary.game === 'runner') {
          if (summary.score > hs.runnerBestScore) {
            hs.runnerBestScore = summary.score;
            isNewBest = true;
          }
        } else if (summary.game === 'mines') {
          if (outcome === 'VICTORY') {
            hs.minesClearedCount += 1;
            isNewBest = true;
          }
        } else if (summary.game === 'invaders') {
          if (summary.score > hs.invadersScore) {
            hs.invadersScore = summary.score;
            isNewBest = true;
          }
        } else if (summary.game === 'pac') {
          if (summary.score > (hs.pacScore || 0)) {
            hs.pacScore = summary.score;
            isNewBest = true;
          }
          hs.pacMaxWave = Math.max(hs.pacMaxWave || 1, summary.linesOrLength);
        }

        const nextGamesPlayed = prev.gamesPlayed + 1;
        const unlockedSet = new Set(prev.unlockedAchievementIds);
        const newlyUnlocked: Achievement[] = [];

        const tryUnlock = (id: string) => {
          if (!unlockedSet.has(id)) {
            const found = ACHIEVEMENTS.find((a) => a.id === id);
            if (found) {
              unlockedSet.add(id);
              newlyUnlocked.push(found);
            }
          }
        };

        tryUnlock('first_launch');
        if (nextGamesPlayed >= 10) tryUnlock('veteran_ten');

        if (summary.game === 'tetris') {
          if (summary.score >= 2500) tryUnlock('prism_architect');
          if (summary.hadQuadTetris) tryUnlock('prism_tetris');
        } else if (summary.game === 'xo') {
          if (summary.xoWinner === 'X' && config.xo.mode === 'ai') tryUnlock('quantum_tactician');
          if (
            config.xo.mode === 'ai' &&
            config.xo.difficulty === 'unbeatable' &&
            (summary.xoWinner === 'X' || summary.xoWinner === 'DRAW')
          ) {
            tryUnlock('quantum_grandmaster');
          }
        } else if (summary.game === 'snake') {
          if (summary.score >= 500) tryUnlock('viper_hunter');
          if (summary.linesOrLength >= 16) tryUnlock('viper_ouroboros');
        } else if (summary.game === 'breaker' && summary.score >= 1200) {
          tryUnlock('breaker_shatter');
        } else if (summary.game === 'pong' && outcome === 'VICTORY') {
          tryUnlock('pong_champion');
        } else if (summary.game === 'connect4' && outcome === 'VICTORY') {
          tryUnlock('connect4_strategist');
        } else if (summary.game === 'merge2048' && summary.linesOrLength >= 512) {
          tryUnlock('hexa_monolith');
        } else if (summary.game === 'runner' && summary.score >= 1000) {
          tryUnlock('void_ace');
        } else if (summary.game === 'mines' && outcome === 'VICTORY') {
          tryUnlock('mines_defuser');
        } else if (summary.game === 'invaders' && summary.score >= 1500) {
          tryUnlock('nova_ace');
        } else if (summary.game === 'pac' && summary.score >= 1200) {
          tryUnlock('pac_overdrive');
        }

        const dailyEval = evaluateDailyChallengeMatch(prev.dailyChallenge, outcome, summary);
        if (dailyEval.completedChallenge) {
          tryUnlock('daily_challenger');
        }

        let gauntletBonusXp = 0;
        let finalDisplayScore = summary.score;

        if (gauntletSession?.active) {
          const mult = GAUNTLET_MULTIPLIERS[gauntletSession.stageIndex];
          const baseStageScore =
            outcome === 'VICTORY'
              ? Math.max(600, summary.score + 400)
              : Math.max(120, summary.score);
          const multipliedScore = Math.round(baseStageScore * mult);
          finalDisplayScore = multipliedScore;

          const stageEntry: GauntletStageResult = {
            game: summary.game,
            rawScore: baseStageScore,
            multiplier: mult,
            multipliedScore,
            outcome,
          };
          const nextResults = [...gauntletSession.results, stageEntry];
          const isFinalStage = gauntletSession.stageIndex >= 2;

          if (isFinalStage) {
            const totalGauntletScore = nextResults.reduce((acc, r) => acc + r.multipliedScore, 0);
            if (totalGauntletScore > (hs.gauntletBestScore || 0)) {
              hs.gauntletBestScore = totalGauntletScore;
              isNewBest = true;
            }
            hs.gauntletRunsCompleted = (hs.gauntletRunsCompleted || 0) + 1;
            tryUnlock('gauntlet_champion');
            gauntletBonusXp = 350;
            finalDisplayScore = totalGauntletScore;
          }

          setGauntletSession({
            ...gauntletSession,
            results: nextResults,
            awaitingNextStage: !isFinalStage,
            completed: isFinalStage,
          });
        }

        const achXp = newlyUnlocked.reduce((acc, a) => acc + a.xpReward, 0);
        const matchXp =
          Math.max(40, Math.min(450, Math.round(summary.score * 0.15) + 50)) +
          achXp +
          dailyEval.bonusXpEarned +
          gauntletBonusXp;

        const updated: PlayerProfile = {
          ...prev,
          totalXp: prev.totalXp + matchXp,
          gamesPlayed: nextGamesPlayed,
          highScores: hs,
          unlockedAchievementIds: Array.from(unlockedSet),
          dailyChallenge: dailyEval.updatedDaily,
        };
        saveProfile(updated);

        setLastMatchSummary({
          outcome,
          score: finalDisplayScore,
          xpEarned: matchXp,
          isNewBest,
          newlyUnlocked,
          completedDailyChallenge: dailyEval.completedChallenge,
          xoWinner: summary.xoWinner,
        });
        return updated;
      });

      setShellState(outcome);
    },
    [config.xo.mode, config.xo.difficulty, gauntletSession]
  );

  const activeCatalog = GAME_CATALOG[selectedGame];
  const rankInfo = getRankInfo(profile.totalXp);
  const syncedDaily = syncDailyChallengeForToday(profile.dailyChallenge);
  const activeDailyChallenge = getActiveDailyChallenge(syncedDaily);
  const isDailyChallengeCompleted = syncedDaily.completedIds.includes(activeDailyChallenge.id);
  const dailyProgressPct = isDailyChallengeCompleted
    ? 100
    : Math.min(
        100,
        Math.round((syncedDaily.currentValue / Math.max(1, activeDailyChallenge.targetValue)) * 100)
      );

  // Compute live progress during active gameplay when playing the Daily Challenge game
  const liveDailyValue =
    shellState === 'PLAYING' && selectedGame === activeDailyChallenge.game
      ? activeDailyChallenge.metric === 'score'
        ? Math.max(syncedDaily.currentValue, hud.score)
        : activeDailyChallenge.metric === 'secondary'
        ? Math.max(syncedDaily.currentValue, hud.secondaryValue)
        : syncedDaily.currentValue
      : syncedDaily.currentValue;
  const liveDailyMet =
    isDailyChallengeCompleted || liveDailyValue >= activeDailyChallenge.targetValue;

  const cycleGame = (dir: -1 | 1) => {
    const idx = ALL_GAME_IDS.indexOf(selectedGame);
    const nextIdx = (idx + dir + ALL_GAME_IDS.length) % ALL_GAME_IDS.length;
    soundFX.playHubSwitch();
    setSelectedGame(ALL_GAME_IDS[nextIdx]);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090E] select-none">
      {/* Persistent 3D Three.js WebGL Stage */}
      <ArcadeStage3D
        ref={stageRef}
        shellState={shellState}
        selectedGame={selectedGame}
        config={config}
        gauntletActive={Boolean(gauntletSession?.active)}
        onSelectHubGame={(g) => setSelectedGame(g)}
        onHudUpdate={setHud}
        onGameEnd={handleGameEnd}
      />

      {/* Low-Occlusion Overlay Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-none">
        {/* TOP PERIMETER WRAPPER (HEADER + COMPACT HUB TITLE) */}
        <div className="w-full flex flex-col">
          <header className="w-full px-3 sm:px-6 pt-2.5 sm:pt-3 pb-1.5 sm:pb-2 flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
            {shellState === 'HUB' ? (
              <div className="flex items-center gap-2.5 sm:gap-3 bg-[#0B0F19]/90 border border-slate-800/90 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" viewBox="0 0 36 36" fill="none">
                  <polygon points="18,2 33,10 33,26 18,34 3,26 3,10" stroke="#06B6D4" strokeWidth="2.8" fill="#06B6D4" fillOpacity="0.12" />
                  <path d="M12 11V25M12 18L22 11M15 16L23 25" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="25.5" cy="18" r="2.5" fill="#F43F5E" />
                </svg>
                <div className="flex items-center">
                  <span className="text-xs sm:text-base font-extrabold font-display tracking-wider text-white whitespace-nowrap">
                    KINETIX
                  </span>
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-[10px] sm:text-xs font-mono font-bold text-cyan-300">
                    // 11
                  </span>
                  <span className="hidden md:inline-block text-xs text-slate-400 ml-2.5">
                    3D Synth-Grid Vault
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    setShellState('HUB');
                  }}
                  className="min-h-[42px] sm:min-h-[44px] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0B0F19]/95 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg whitespace-nowrap"
                >
                  <Home className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Hub</span>
                </button>

                <div className="flex items-center gap-3 sm:gap-4 bg-[#0B0F19]/95 border border-slate-800/90 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {selectedGame === 'xo' || selectedGame === 'connect4'
                        ? 'PLAYER 1'
                        : selectedGame === 'pong'
                        ? 'YOU'
                        : 'SCORE'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-white">
                      {hud.score.toLocaleString()}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      {hud.secondaryLabel}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-cyan-300">
                      {hud.secondaryValue}
                    </div>
                  </div>
                  <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                  <div className="hidden sm:block">
                    <div className="text-[10px] font-semibold text-slate-400">
                      {hud.tertiaryLabel}
                    </div>
                    <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-emerald-300">
                      {hud.tertiaryValue}
                    </div>
                  </div>
                  {selectedGame === 'tetris' && hud.nextPieceType && (
                    <>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-[10px] font-semibold text-slate-400">NEXT</div>
                        <div className="text-sm font-bold font-mono text-amber-300">
                          {hud.nextPieceType}-BLOCK
                        </div>
                      </div>
                    </>
                  )}
                  {gauntletSession?.active && (
                    <>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <div className="text-[10px] font-semibold text-amber-400 whitespace-nowrap">
                          BLITZ {gauntletSession.stageIndex + 1}/3
                        </div>
                        <div className="text-xs sm:text-sm font-bold font-mono tabular-nums text-amber-300 whitespace-nowrap">
                          {GAUNTLET_MULTIPLIERS[gauntletSession.stageIndex].toFixed(1)}× MULT
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Turn Banner for Quantum Grid X-O & Gravity Drop 4 */}
            {shellState === 'PLAYING' && (selectedGame === 'xo' || selectedGame === 'connect4') && (
              <div className="hidden md:flex items-center gap-2.5 bg-[#0B0F19]/95 border border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold">
                {hud.isAiThinking ? (
                  <span className="text-rose-300">AI Computing Tactical Move...</span>
                ) : (
                  <span className={hud.turnOwner === 'X' ? 'text-cyan-300' : 'text-rose-400'}>
                    Active Turn: {hud.turnOwner === 'X' ? 'Player 1 (Cyan)' : 'Opponent (Rose)'}
                  </span>
                )}
              </div>
            )}

            {/* Live Daily Challenge Progress Tracker during gameplay */}
            {shellState === 'PLAYING' &&
              selectedGame === activeDailyChallenge.game &&
              selectedGame !== 'xo' &&
              selectedGame !== 'connect4' && (
                <div className="hidden lg:flex items-center gap-2.5 bg-[#0B0F19]/95 border border-slate-800 rounded-xl px-3.5 py-2 text-xs">
                  <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-300 font-medium whitespace-nowrap">
                    Daily: {activeDailyChallenge.title}
                  </span>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums whitespace-nowrap ${
                      liveDailyMet ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {liveDailyMet
                      ? `OBJECTIVE MET (+${activeDailyChallenge.xpReward} XP)`
                      : `${liveDailyValue.toLocaleString()} / ${activeDailyChallenge.targetValue.toLocaleString()} ${activeDailyChallenge.unitLabel}`}
                  </span>
                </div>
              )}

            {/* Right Perimeter Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {shellState === 'HUB' && (
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    setShowProfileModal(true);
                  }}
                  aria-label="Profile & Achievements"
                  className="min-h-[42px] sm:min-h-[44px] min-w-[42px] sm:min-w-[44px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0B0F19]/95 border border-amber-500/40 hover:border-amber-400 text-xs font-semibold text-slate-100 flex items-center justify-center gap-2 shadow-lg whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Profile &amp; Achievements</span>
                  <span className="hidden sm:inline text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="hidden sm:inline font-mono tabular-nums text-amber-300">
                    LVL {rankInfo.level}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  soundFX.playUiTap();
                  setShowSettingsModal(true);
                }}
                aria-label="Settings"
                className="min-h-[42px] sm:min-h-[44px] min-w-[42px] sm:min-w-[44px] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#0B0F19]/95 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 shadow-lg whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              {shellState === 'PLAYING' && (
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    setShellState('PAUSED');
                  }}
                  className="min-h-[42px] sm:min-h-[44px] min-w-[42px] sm:min-w-[44px] rounded-xl bg-[#0B0F19]/95 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-200 hover:text-white shadow-lg"
                  aria-label="Pause Game"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
            </div>
          </header>

          {/* COMPACT TOP-ANCHORED HUB TITLE LOCKUP (NEVER BLOCKS THE CENTER 3D STAGE) */}
          {shellState === 'HUB' && (
            <div className="flex flex-col items-center text-center px-4 pt-0.5 sm:pt-1 pointer-events-none">
              <div className="text-[10px] sm:text-[11px] font-semibold tracking-widest text-slate-400">
                {activeCatalog.kicker}
              </div>
              <h1
                className="text-xl sm:text-4xl font-extrabold font-display tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                style={{ textWrap: 'balance' }}
              >
                {activeCatalog.title}
              </h1>
            </div>
          )}
        </div>

        {/* BOTTOM 10-GAME ORBITAL LAUNCH CONSOLE (LOW-PROFILE ON MOBILE) */}
        {shellState === 'HUB' && (
          <div className="w-full max-w-3xl mx-auto px-2.5 sm:px-4 pb-2.5 sm:pb-4 pointer-events-auto">
            <div className="rounded-2xl bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800/90 p-2 sm:p-3.5 shadow-2xl space-y-1.5 sm:space-y-2.5 overflow-hidden">
              {/* DEDICATED DAILY CHALLENGE HUB DISPLAY (SINGLE COMPACT BAR ON MOBILE) */}
              <div className="rounded-xl bg-[#07090E]/90 border border-slate-800/90 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 flex items-center justify-between gap-2 overflow-hidden">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 min-w-0 overflow-hidden">
                    <span className="font-bold text-amber-400 flex items-center gap-1 shrink-0">
                      <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="hidden sm:inline">DAILY</span>
                    </span>
                    <span className="text-white font-bold truncate min-w-0">
                      {activeDailyChallenge.title}
                    </span>
                    <span aria-hidden="true" className="text-slate-600 shrink-0">
                      ·
                    </span>
                    <span className="font-mono tabular-nums text-cyan-300 shrink-0">
                      {isDailyChallengeCompleted
                        ? 'DONE'
                        : `${syncedDaily.currentValue}/${activeDailyChallenge.targetValue}`}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-amber-300 shrink-0">
                      +{activeDailyChallenge.xpReward} XP
                    </span>
                    {syncedDaily.streakDays > 0 && (
                      <span className="hidden sm:inline-flex items-center gap-0.5 text-amber-300 font-semibold tabular-nums shrink-0">
                        · <Flame className="w-3 h-3 text-amber-400" />
                        {syncedDaily.streakDays}d
                      </span>
                    )}
                    <span className="hidden md:inline font-mono tabular-nums text-slate-500 shrink-0">
                      · {resetCountdown}
                    </span>
                  </div>

                  {/* Full Description & Progress Bar on Tablet/Desktop */}
                  <div className="hidden sm:flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-300 truncate">
                      {activeDailyChallenge.description}
                    </span>
                    <div className="w-32 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800/80 shrink-0">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isDailyChallengeCompleted
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-amber-400 to-cyan-400'
                        }`}
                        style={{ width: `${dailyProgressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  {isDailyChallengeCompleted ? (
                    <>
                      <div className="min-h-[30px] sm:min-h-[34px] px-2 sm:px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline">Claimed</span>
                      </div>
                      <button
                        onClick={handleCycleDailyDirective}
                        className="min-h-[30px] sm:min-h-[34px] px-2 sm:px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                        title="Load a Bonus Daily Directive for extra XP"
                      >
                        <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span>Bonus</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedGame !== activeDailyChallenge.game && (
                        <button
                          onClick={() => handleLaunchGame(activeDailyChallenge.game)}
                          className="min-h-[30px] sm:min-h-[34px] px-2 sm:px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          <Play className="w-3 h-3 fill-current shrink-0" />
                          <span>{GAME_CATALOG[activeDailyChallenge.game].shortTab}</span>
                        </button>
                      )}
                      <button
                        onClick={handleCycleDailyDirective}
                        className="min-h-[30px] sm:min-h-[34px] min-w-[30px] sm:min-w-[34px] px-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
                        aria-label="Switch Daily Challenge Objective"
                        title="Rotate to another game's Daily Objective"
                      >
                        <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 10-Game Carousel Selector */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => cycleGame(-1)}
                  className="min-h-[34px] sm:min-h-[40px] min-w-[34px] sm:min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0"
                  aria-label="Previous Game"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto bg-[#07090E] p-1 rounded-xl border border-slate-800/90">
                  {ALL_GAME_IDS.map((gid) => {
                    const active = selectedGame === gid;
                    const isDailyTarget = activeDailyChallenge.game === gid;
                    return (
                      <button
                        key={gid}
                        onClick={() => {
                          soundFX.playHubSwitch();
                          setSelectedGame(gid);
                        }}
                        className={`min-h-[30px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                          active
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {isDailyTarget && (
                          <Target
                            className={`w-3 h-3 shrink-0 ${
                              isDailyChallengeCompleted ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          />
                        )}
                        {GAME_CATALOG[gid].shortTab}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => cycleGame(1)}
                  className="min-h-[34px] sm:min-h-[40px] min-w-[34px] sm:min-w-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center justify-center text-slate-300 shrink-0"
                  aria-label="Next Game"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Desktop Game Description (Hidden on mobile to keep 3D viewport open) */}
              <p className="hidden sm:block text-xs text-slate-300 leading-relaxed">
                {activeCatalog.description}
              </p>

              {/* Pre-Launch Quick Toggles + Primary Launch CTA (Guaranteed to stay inside Hub) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 w-full">
                {/* Pre-Launch Quick Toggles for Selected Game */}
                {selectedGame === 'tetris' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 3, 5].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          soundFX.playUiTap();
                          setConfig((c) => ({ ...c, tetris: { ...c.tetris, startLevel: lvl } }));
                        }}
                        className={`min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-mono font-semibold border ${
                          config.tetris.startLevel === lvl
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        Lv.{lvl}
                      </button>
                    ))}
                  </div>
                )}

                {selectedGame === 'xo' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {([3, 4, 5] as XOGridSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => {
                          soundFX.playUiTap();
                          setConfig((c) => ({ ...c, xo: { ...c.xo, gridSize: sz } }));
                        }}
                        className={`min-h-[36px] sm:min-h-[44px] px-2 rounded-xl text-[11px] sm:text-xs font-mono font-semibold border ${
                          config.xo.gridSize === sz
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {sz}×{sz}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        soundFX.playUiTap();
                        const nextMode: XOMode = config.xo.mode === 'ai' ? 'local2p' : 'ai';
                        setConfig((c) => ({ ...c, xo: { ...c.xo, mode: nextMode } }));
                      }}
                      className="min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 whitespace-nowrap"
                    >
                      {config.xo.mode === 'ai' ? 'vs AI' : '2P'}
                    </button>
                  </div>
                )}

                {(selectedGame === 'snake' ||
                  selectedGame === 'runner' ||
                  selectedGame === 'pac') && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(['normal', 'turbo', 'hyper'] as SnakeSpeed[]).map((spd) => {
                      const curr =
                        selectedGame === 'snake'
                          ? config.snake.speed
                          : selectedGame === 'runner'
                          ? config.runner.speed
                          : config.pac.speed;
                      return (
                        <button
                          key={spd}
                          onClick={() => {
                            soundFX.playUiTap();
                            if (selectedGame === 'snake') {
                              setConfig((c) => ({ ...c, snake: { ...c.snake, speed: spd } }));
                            } else if (selectedGame === 'runner') {
                              setConfig((c) => ({ ...c, runner: { ...c.runner, speed: spd } }));
                            } else {
                              setConfig((c) => ({ ...c, pac: { ...c.pac, speed: spd } }));
                            }
                          }}
                          className={`min-h-[36px] sm:min-h-[44px] px-2 rounded-xl text-[11px] sm:text-xs font-semibold capitalize border ${
                            curr === spd
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {spd}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedGame === 'breaker' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(['normal', 'overdrive'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          soundFX.playUiTap();
                          setConfig((c) => ({ ...c, breaker: { difficulty: diff } }));
                        }}
                        className={`min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold capitalize border ${
                          config.breaker.difficulty === diff
                            ? 'bg-violet-500/20 border-violet-400 text-violet-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                )}

                {selectedGame === 'pong' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(['casual', 'tactical', 'unbeatable'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          soundFX.playUiTap();
                          setConfig((c) => ({
                            ...c,
                            pong: { ...c.pong, difficulty: diff },
                          }));
                        }}
                        className={`min-h-[36px] sm:min-h-[44px] px-1.5 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold capitalize border ${
                          config.pong.difficulty === diff
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                )}

                {selectedGame === 'connect4' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        soundFX.playUiTap();
                        setConfig((c) => ({
                          ...c,
                          connect4: {
                            ...c.connect4,
                            mode: c.connect4.mode === 'ai' ? 'local2p' : 'ai',
                          },
                        }));
                      }}
                      className="min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 whitespace-nowrap"
                    >
                      {config.connect4.mode === 'ai' ? 'vs AI' : '2P'}
                    </button>
                    <button
                      onClick={() => {
                        soundFX.playUiTap();
                        setConfig((c) => ({
                          ...c,
                          connect4: { ...c.connect4, popOutMode: !c.connect4.popOutMode },
                        }));
                      }}
                      className={`min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border whitespace-nowrap ${
                        config.connect4.popOutMode
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {config.connect4.popOutMode ? 'Pop-Out' : 'Classic'}
                    </button>
                  </div>
                )}

                {selectedGame === 'mines' && (
                  <div className="flex items-center gap-1 shrink-0">
                    {(['standard', 'dense', 'extreme'] as MinesDensity[]).map((den) => (
                      <button
                        key={den}
                        onClick={() => {
                          soundFX.playUiTap();
                          setConfig((c) => ({
                            ...c,
                            mines: { ...c.mines, density: den },
                          }));
                        }}
                        className={`min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold capitalize border ${
                          config.mines.density === den
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {den}
                      </button>
                    ))}
                  </div>
                )}

                {selectedGame === 'invaders' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        soundFX.playUiTap();
                        setConfig((c) => ({
                          ...c,
                          invaders: { autoFire: !c.invaders?.autoFire },
                        }));
                      }}
                      className={`min-h-[36px] sm:min-h-[44px] px-2.5 rounded-xl text-[11px] sm:text-xs font-semibold border whitespace-nowrap ${
                        config.invaders?.autoFire
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {config.invaders?.autoFire ? 'Auto-Fire' : 'Manual'}
                    </button>
                  </div>
                )}

                <button
                  onClick={() => handleLaunchGame()}
                  className={`flex-1 min-w-[110px] min-h-[36px] sm:min-h-[44px] px-3 rounded-xl font-display font-bold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-[0.99] whitespace-nowrap ${activeCatalog.ctaBg}`}
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current shrink-0" />
                  <span className="sm:hidden">LAUNCH</span>
                  <span className="hidden sm:inline">LAUNCH {activeCatalog.title}</span>
                </button>

                {/* 3-Game Gauntlet Blitz Quick Launch + Lineup Re-Roll */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleLaunchGauntlet}
                    className="min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-400/50 text-amber-200 font-display font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
                    title={`Launch 3-Game Blitz Relay: ${gauntletLineup
                      .map((id) => GAME_CATALOG[id].shortTab)
                      .join(' → ')}`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>3-Game Blitz</span>
                    <span className="hidden md:inline text-amber-300/90 font-mono tabular-nums">
                      · 2.5×
                    </span>
                  </button>
                  <button
                    onClick={handleShuffleGauntlet}
                    className="min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-300 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Shuffle 3-Game Blitz Lineup"
                    title={`Shuffle Blitz Lineup (${gauntletLineup
                      .map((id) => GAME_CATALOG[id].shortTab)
                      .join(' · ')})`}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-between text-[11px] text-slate-400 gap-4 w-full">
                <span className="truncate">{activeCatalog.controlsHint}</span>
                <span className="font-mono tabular-nums text-amber-300/90 whitespace-nowrap shrink-0">
                  Blitz Slate: {GAME_CATALOG[gauntletLineup[0]].shortTab} (1.0×) ·{' '}
                  {GAME_CATALOG[gauntletLineup[1]].shortTab} (1.5×) ·{' '}
                  {GAME_CATALOG[gauntletLineup[2]].shortTab} (2.5×)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE GAME ERGONOMIC TOUCH ARCADE DOCK */}
        {shellState === 'PLAYING' && (
          <TouchArcadeDock
            selectedGame={selectedGame}
            controlScheme={profile.controlScheme}
            config={config}
            hud={hud}
            stageRef={stageRef}
            onUpdateConfig={setConfig}
          />
        )}
      </div>

      {/* PAUSE / VICTORY / GAME OVER / GAUNTLET RELAY MODAL */}
      {(shellState === 'PAUSED' || shellState === 'VICTORY' || shellState === 'GAME_OVER') && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 pointer-events-auto">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F19] border border-slate-800 p-6 shadow-2xl text-center space-y-5">
            <div>
              <div className="text-xs font-semibold tracking-wider text-cyan-400">
                {gauntletSession?.active
                  ? `GAUNTLET BLITZ · STAGE ${gauntletSession.stageIndex + 1} OF 3 · ${GAUNTLET_MULTIPLIERS[
                      gauntletSession.stageIndex
                    ].toFixed(1)}× MULTIPLIER`
                  : activeCatalog.title}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
                {shellState === 'PAUSED'
                  ? 'SYSTEM PAUSED'
                  : gauntletSession?.active && gauntletSession.awaitingNextStage
                  ? `STAGE ${gauntletSession.stageIndex + 1} COMPLETE`
                  : gauntletSession?.active && gauntletSession.completed
                  ? 'GAUNTLET BLITZ COMPLETE'
                  : selectedGame === 'xo' && lastMatchSummary?.xoWinner === 'DRAW'
                  ? 'QUANTUM STALEMATE'
                  : shellState === 'VICTORY'
                  ? 'ARENA VICTORY'
                  : 'SIMULATION OVER'}
              </h2>
              {shellState !== 'PAUSED' && lastMatchSummary && (
                <p className="text-xs text-slate-400 mt-1">
                  {lastMatchSummary.isNewBest
                    ? 'New Personal High Score Recorded!'
                    : `Earned +${lastMatchSummary.xpEarned} Arcade XP`}
                </p>
              )}
            </div>

            {shellState !== 'PAUSED' && lastMatchSummary && (
              <div className="grid grid-cols-2 gap-3 bg-[#07090E] p-3.5 rounded-xl border border-slate-800">
                <div>
                  <div className="text-[11px] text-slate-400">
                    {gauntletSession?.active && gauntletSession.completed
                      ? 'TOTAL GAUNTLET SCORE'
                      : gauntletSession?.active
                      ? 'STAGE MULTIPLIED SCORE'
                      : 'FINAL SCORE'}
                  </div>
                  <div className="text-xl font-bold font-mono tabular-nums text-white mt-0.5">
                    {lastMatchSummary.score.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">ARCADE XP</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    +{lastMatchSummary.xpEarned} XP
                  </div>
                </div>
              </div>
            )}

            {/* Gauntlet 3-Stage Relay Breakdown */}
            {shellState !== 'PAUSED' && gauntletSession?.active && (
              <div className="space-y-1.5 text-left bg-[#07090E] p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] font-semibold text-amber-300 flex items-center justify-between">
                  <span>3-GAME BLITZ RELAY SLATE</span>
                  <span className="font-mono tabular-nums">
                    TOTAL:{' '}
                    {gauntletSession.results
                      .reduce((acc, r) => acc + r.multipliedScore, 0)
                      .toLocaleString()}{' '}
                    PTS
                  </span>
                </div>
                <div className="space-y-1">
                  {gauntletSession.lineup.map((gid, idx) => {
                    const res = gauntletSession.results[idx];
                    const mult = GAUNTLET_MULTIPLIERS[idx];
                    const isNext =
                      gauntletSession.awaitingNextStage && idx === gauntletSession.stageIndex + 1;
                    return (
                      <div
                        key={`${gid}-${idx}`}
                        className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs ${
                          res
                            ? 'bg-slate-900/90 text-slate-100'
                            : isNext
                            ? 'bg-amber-500/15 border border-amber-400/40 text-amber-200'
                            : 'text-slate-500'
                        }`}
                      >
                        <span className="font-medium truncate">
                          {idx + 1}. {GAME_CATALOG[gid].shortTab} · {mult.toFixed(1)}×
                        </span>
                        <span className="font-mono tabular-nums font-bold">
                          {res
                            ? `${res.multipliedScore.toLocaleString()} PTS`
                            : isNext
                            ? 'UP NEXT'
                            : 'LOCKED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {shellState !== 'PAUSED' &&
              lastMatchSummary &&
              lastMatchSummary.completedDailyChallenge && (
                <div className="space-y-1.5 text-left">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Daily Challenge Completed!
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {lastMatchSummary.completedDailyChallenge.title}
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {lastMatchSummary.completedDailyChallenge.description}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold tabular-nums text-emerald-300 whitespace-nowrap">
                      +{lastMatchSummary.completedDailyChallenge.xpReward} XP
                    </span>
                  </div>
                </div>
              )}

            {shellState !== 'PAUSED' &&
              lastMatchSummary &&
              lastMatchSummary.newlyUnlocked.length > 0 && (
                <div className="space-y-2 text-left">
                  <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Achievement Unlocked!
                  </div>
                  {lastMatchSummary.newlyUnlocked.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{ach.title}</div>
                        <div className="text-[11px] text-slate-300">{ach.description}</div>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        +{ach.xpReward} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}

            <div className="flex flex-col gap-2.5">
              {shellState === 'PAUSED' && (
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    setShellState('PLAYING');
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume Match
                </button>
              )}

              {shellState !== 'PAUSED' &&
              gauntletSession?.active &&
              gauntletSession.awaitingNextStage ? (
                <button
                  onClick={handleAdvanceGauntletStage}
                  className="w-full min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(250,204,21,0.35)]"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  Warp to Stage {gauntletSession.stageIndex + 2}:{' '}
                  {GAME_CATALOG[gauntletSession.lineup[gauntletSession.stageIndex + 1]].shortTab} (
                  {GAUNTLET_MULTIPLIERS[gauntletSession.stageIndex + 1].toFixed(1)}×)
                </button>
              ) : (
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    if (gauntletSession?.active && gauntletSession.completed) {
                      handleLaunchGauntlet();
                    } else {
                      setShellState('PLAYING');
                      setTimeout(() => stageRef.current?.triggerAction('restart'), 15);
                    }
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  {gauntletSession?.active && gauntletSession.completed
                    ? 'Replay 3-Game Gauntlet Blitz'
                    : 'Play Again'}
                </button>
              )}

              {shellState === 'PAUSED' && (
                <button
                  onClick={() => {
                    soundFX.playUiTap();
                    setShowSettingsModal(true);
                  }}
                  className="w-full min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-800"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  Settings · Controls, Audio &amp; Haptics
                </button>
              )}

              <button
                onClick={() => {
                  soundFX.playUiTap();
                  setGauntletSession(null);
                  setShellState('HUB');
                }}
                className="w-full min-h-[46px] rounded-xl bg-[#07090E] hover:bg-slate-900 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 border border-slate-800"
              >
                <Home className="w-4 h-4" />
                Return to 3D Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Profile & Achievements Modal */}
      <ProfileAndApkModal
        isOpen={showProfileModal}
        profile={profile}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Dedicated Settings Menu Modal (Controls, Audio & Haptics) */}
      <SettingsModal
        isOpen={showSettingsModal}
        profile={profile}
        onUpdateProfile={updateProfile}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}
