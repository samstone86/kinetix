import {
  Achievement,
  DailyChallengeProgress,
  DailyChallengeTemplate,
  GameId,
  PlayerProfile,
} from '../types/arcade';

const STORAGE_KEY = 'lumina_arcade_profile_v2';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_launch',
    title: 'Neon Initiate',
    description: 'Complete your first match in any Kinetix // 11 arena.',
    game: 'hub',
    xpReward: 100,
  },
  {
    id: 'daily_challenger',
    title: 'Daily Directive Operative',
    description: 'Complete a Daily Challenge objective to claim bonus XP.',
    game: 'hub',
    xpReward: 300,
  },
  {
    id: 'prism_architect',
    title: 'Prism Architect',
    description: 'Score over 2,500 points in a single Prism Drop session.',
    game: 'tetris',
    xpReward: 250,
  },
  {
    id: 'prism_tetris',
    title: 'Quadruple Nova',
    description: 'Clear 4 lines simultaneously with an I-Beam in Prism Drop.',
    game: 'tetris',
    xpReward: 400,
  },
  {
    id: 'quantum_tactician',
    title: 'Quantum Tactician',
    description: 'Defeat the AI opponent in Quantum Grid X-O.',
    game: 'xo',
    xpReward: 200,
  },
  {
    id: 'quantum_grandmaster',
    title: 'Singularity Hold',
    description: 'Win or force a draw against the Unbeatable Minimax AI in Quantum Grid.',
    game: 'xo',
    xpReward: 450,
  },
  {
    id: 'viper_hunter',
    title: 'Plasma Harvester',
    description: 'Reach a score of 500 or higher in Viper Pulse.',
    game: 'snake',
    xpReward: 250,
  },
  {
    id: 'viper_ouroboros',
    title: 'Cyber Leviathan',
    description: 'Grow the Viper Pulse serpent to 16 segments or longer.',
    game: 'snake',
    xpReward: 400,
  },
  {
    id: 'breaker_shatter',
    title: 'Aegis Shatterer',
    description: 'Score 1,200+ points in Aegis Breaker 3D.',
    game: 'breaker',
    xpReward: 300,
  },
  {
    id: 'pong_champion',
    title: 'Vector Ace',
    description: 'Win a match in Vector Pong: Overdrive.',
    game: 'pong',
    xpReward: 250,
  },
  {
    id: 'connect4_strategist',
    title: 'Fourfold Matrix',
    description: 'Connect 4 cores to win a match in Gravity Drop 4.',
    game: 'connect4',
    xpReward: 300,
  },
  {
    id: 'hexa_monolith',
    title: 'Skyscraper Monolith',
    description: 'Merge tiles up to the 512 or 2048 block in Hexa Pulse 2048.',
    game: 'merge2048',
    xpReward: 350,
  },
  {
    id: 'void_ace',
    title: 'Warp Horizon Pilot',
    description: 'Score 1,000+ points piloting the starfighter in Void Runner.',
    game: 'runner',
    xpReward: 300,
  },
  {
    id: 'mines_defuser',
    title: 'Sector Zero Sweeper',
    description: 'Clear an entire hazard vault grid in Cyber Mines.',
    game: 'mines',
    xpReward: 400,
  },
  {
    id: 'nova_ace',
    title: 'Aegis Defender',
    description: 'Score 1,500+ points and clear alien waves in Nova Invaders.',
    game: 'invaders',
    xpReward: 350,
  },
  {
    id: 'pac_overdrive',
    title: 'Neon Ghostbuster',
    description: 'Score 1,200+ points devouring pellets and drones in Cyber Pac.',
    game: 'pac',
    xpReward: 350,
  },
  {
    id: 'veteran_ten',
    title: 'Obsidian Sovereign',
    description: 'Play 10 matches across the Kinetix // 11 vault.',
    game: 'hub',
    xpReward: 350,
  },
  {
    id: 'gauntlet_champion',
    title: 'Gauntlet Grandmaster',
    description: 'Complete a 3-Game Gauntlet Blitz Relay with escalating score multipliers.',
    game: 'hub',
    xpReward: 500,
  },
];

export const DAILY_CHALLENGE_POOL: DailyChallengeTemplate[] = [
  {
    id: 'daily_invaders_score',
    title: 'Nova Vanguard',
    game: 'invaders',
    description: 'Score 900+ points defending Earth in Nova Invaders.',
    metric: 'score',
    targetValue: 900,
    unitLabel: 'PTS',
    xpReward: 500,
  },
  {
    id: 'daily_tetris_lines',
    title: 'Prism Cascade',
    game: 'tetris',
    description: 'Clear 6 or more lines in a single Prism Drop session.',
    metric: 'secondary',
    targetValue: 6,
    unitLabel: 'LINES',
    xpReward: 450,
  },
  {
    id: 'daily_snake_length',
    title: 'Ouroboros Surge',
    game: 'snake',
    description: 'Grow the Viper Pulse cyber-serpent to 10 segments.',
    metric: 'secondary',
    targetValue: 10,
    unitLabel: 'LENGTH',
    xpReward: 450,
  },
  {
    id: 'daily_breaker_score',
    title: 'Crystal Ordnance',
    game: 'breaker',
    description: 'Score 600+ points shattering crystal towers in Aegis Breaker.',
    metric: 'score',
    targetValue: 600,
    unitLabel: 'PTS',
    xpReward: 450,
  },
  {
    id: 'daily_runner_rings',
    title: 'Warp Ring Harvester',
    game: 'runner',
    description: 'Collect 5 Warp Rings in a single Void Runner flight.',
    metric: 'secondary',
    targetValue: 5,
    unitLabel: 'RINGS',
    xpReward: 500,
  },
  {
    id: 'daily_merge2048_tile',
    title: 'Monolith Ascension',
    game: 'merge2048',
    description: 'Fuse 3D towers up to the 128 Monolith in Hexa Pulse 2048.',
    metric: 'secondary',
    targetValue: 128,
    unitLabel: 'TILE',
    xpReward: 500,
  },
  {
    id: 'daily_xo_victory',
    title: 'Quantum Supremacy',
    game: 'xo',
    description: 'Win a match in Quantum Grid X-O.',
    metric: 'victory',
    targetValue: 1,
    unitLabel: 'WIN',
    xpReward: 400,
  },
  {
    id: 'daily_pong_victory',
    title: 'Overdrive Rink Ace',
    game: 'pong',
    description: 'Defeat your opponent in Vector Pong: Overdrive.',
    metric: 'victory',
    targetValue: 1,
    unitLabel: 'WIN',
    xpReward: 450,
  },
  {
    id: 'daily_connect4_victory',
    title: 'Reactor Alignment',
    game: 'connect4',
    description: 'Connect 4 reactor cores to win a match in Gravity Drop 4.',
    metric: 'victory',
    targetValue: 1,
    unitLabel: 'WIN',
    xpReward: 450,
  },
  {
    id: 'daily_mines_vaults',
    title: 'Sector Zero Recon',
    game: 'mines',
    description: 'Uncover 12 safe gunmetal vaults in a Cyber Mines session.',
    metric: 'secondary',
    targetValue: 12,
    unitLabel: 'VAULTS',
    xpReward: 500,
  },
  {
    id: 'daily_pac_score',
    title: 'Labyrinth Overdrive',
    game: 'pac',
    description: 'Score 800+ points chomping data pellets and drones in Cyber Pac.',
    metric: 'score',
    targetValue: 800,
    unitLabel: 'PTS',
    xpReward: 500,
  },
];

export function getTodayDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateKey(now = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return getTodayDateKey(yesterday);
}

export function getTimeUntilNextDailyReset(now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const totalSec = Math.floor(diffMs / 1000);
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function getActiveDailyChallenge(
  dailyState: DailyChallengeProgress
): DailyChallengeTemplate {
  const baseIdx = hashDateKey(dailyState.dateKey) % DAILY_CHALLENGE_POOL.length;
  const idx =
    (baseIdx + Math.max(0, dailyState.activeIndexOffset)) % DAILY_CHALLENGE_POOL.length;
  return DAILY_CHALLENGE_POOL[idx];
}

export function createInitialDailyProgress(dateKey = getTodayDateKey()): DailyChallengeProgress {
  return {
    dateKey,
    activeIndexOffset: 0,
    currentValue: 0,
    completedIds: [],
    streakDays: 0,
    totalCompleted: 0,
  };
}

export function syncDailyChallengeForToday(
  existing?: Partial<DailyChallengeProgress>
): DailyChallengeProgress {
  const todayKey = getTodayDateKey();
  const yesterdayKey = getYesterdayDateKey();
  if (!existing || !existing.dateKey) {
    return createInitialDailyProgress(todayKey);
  }

  const streakStillValid =
    existing.lastCompletedDateKey === todayKey ||
    existing.lastCompletedDateKey === yesterdayKey;
  const preservedStreak = streakStillValid ? existing.streakDays || 0 : 0;

  if (existing.dateKey !== todayKey) {
    return {
      dateKey: todayKey,
      activeIndexOffset: 0,
      currentValue: 0,
      completedIds: [],
      streakDays: preservedStreak,
      lastCompletedDateKey: existing.lastCompletedDateKey,
      totalCompleted: existing.totalCompleted || 0,
    };
  }

  return {
    dateKey: todayKey,
    activeIndexOffset: existing.activeIndexOffset ?? 0,
    currentValue: existing.currentValue ?? 0,
    completedIds: Array.isArray(existing.completedIds) ? existing.completedIds : [],
    streakDays: preservedStreak,
    lastCompletedDateKey: existing.lastCompletedDateKey,
    totalCompleted: existing.totalCompleted ?? 0,
  };
}

export function evaluateDailyChallengeMatch(
  currentDaily: DailyChallengeProgress,
  outcome: 'VICTORY' | 'GAME_OVER',
  summary: {
    game: GameId;
    score: number;
    linesOrLength: number;
    xoWinner?: 'X' | 'O' | 'DRAW';
  }
): {
  updatedDaily: DailyChallengeProgress;
  completedChallenge: DailyChallengeTemplate | null;
  bonusXpEarned: number;
} {
  const synced = syncDailyChallengeForToday(currentDaily);
  const challenge = getActiveDailyChallenge(synced);

  if (summary.game !== challenge.game) {
    return {
      updatedDaily: synced,
      completedChallenge: null,
      bonusXpEarned: 0,
    };
  }

  const alreadyCompleted = synced.completedIds.includes(challenge.id);

  let matchValue = 0;
  if (challenge.metric === 'score') {
    matchValue = summary.score;
  } else if (challenge.metric === 'secondary') {
    matchValue = summary.linesOrLength;
  } else if (challenge.metric === 'victory') {
    const wonXo = summary.game === 'xo' ? summary.xoWinner === 'X' : true;
    matchValue = outcome === 'VICTORY' && wonXo ? 1 : 0;
  }

  const nextValue = Math.max(synced.currentValue, matchValue);
  const metObjective = nextValue >= challenge.targetValue;

  if (metObjective && !alreadyCompleted) {
    const todayKey = synced.dateKey;
    const yesterdayKey = getYesterdayDateKey();
    const isNewDayCompletion = synced.lastCompletedDateKey !== todayKey;
    const nextStreak = isNewDayCompletion
      ? synced.lastCompletedDateKey === yesterdayKey
        ? synced.streakDays + 1
        : Math.max(1, synced.streakDays + 1)
      : Math.max(1, synced.streakDays);

    const updatedDaily: DailyChallengeProgress = {
      ...synced,
      currentValue: challenge.targetValue,
      completedIds: [...synced.completedIds, challenge.id],
      streakDays: nextStreak,
      lastCompletedDateKey: todayKey,
      totalCompleted: synced.totalCompleted + 1,
    };

    return {
      updatedDaily,
      completedChallenge: challenge,
      bonusXpEarned: challenge.xpReward,
    };
  }

  return {
    updatedDaily: {
      ...synced,
      currentValue: alreadyCompleted ? challenge.targetValue : nextValue,
    },
    completedChallenge: null,
    bonusXpEarned: 0,
  };
}

export const DEFAULT_PROFILE: PlayerProfile = {
  callsign: 'ARCHON-01',
  totalXp: 350,
  gamesPlayed: 0,
  soundEnabled: true,
  hapticsEnabled: true,
  hapticIntensity: 'medium',
  controlScheme: 'both',
  highScores: {
    tetrisScore: 0,
    tetrisMaxLines: 0,
    tetrisMaxLevel: 1,
    xoWinsAI: 0,
    xoWinsUnbeatableDrawsOrWins: 0,
    xoStreak: 0,
    snakeScore: 0,
    snakeMaxLength: 4,
    breakerScore: 0,
    pongWins: 0,
    connect4Wins: 0,
    merge2048BestScore: 0,
    merge2048MaxTile: 2,
    runnerBestScore: 0,
    minesClearedCount: 0,
    invadersScore: 0,
    pacScore: 0,
    pacMaxWave: 1,
    gauntletBestScore: 0,
    gauntletRunsCompleted: 0,
  },
  unlockedAchievementIds: [],
  dailyChallenge: createInitialDailyProgress(),
};

export function loadProfile(): PlayerProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const resolvedIntensity =
      parsed.hapticIntensity && ['off', 'low', 'medium', 'high'].includes(parsed.hapticIntensity)
        ? parsed.hapticIntensity
        : parsed.hapticsEnabled === false
        ? 'off'
        : 'medium';
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      hapticIntensity: resolvedIntensity,
      hapticsEnabled: resolvedIntensity !== 'off',
      highScores: {
        ...DEFAULT_PROFILE.highScores,
        ...(parsed.highScores || {}),
      },
      unlockedAchievementIds: Array.isArray(parsed.unlockedAchievementIds)
        ? parsed.unlockedAchievementIds
        : [],
      dailyChallenge: syncDailyChallengeForToday(parsed.dailyChallenge),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function getRankInfo(totalXp: number) {
  const level = Math.floor(totalXp / 500) + 1;
  const currentLevelXp = totalXp % 500;
  const titles = [
    'NEON INITIATE',
    'CIRCUIT RUNNER',
    'VECTOR SENTINEL',
    'PRISM VANGUARD',
    'QUANTUM KNIGHT',
    'CYBER ARCHON',
    'OBSIDIAN SOVEREIGN',
  ];
  const rankTitle = titles[Math.min(titles.length - 1, Math.floor((level - 1) / 2))];
  return {
    level,
    rankTitle,
    currentLevelXp,
    nextLevelXp: 500,
    progressPct: Math.min(100, Math.round((currentLevelXp / 500) * 100)),
  };
}
