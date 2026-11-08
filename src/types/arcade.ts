export type GameId =
  | 'tetris'
  | 'xo'
  | 'snake'
  | 'breaker'
  | 'pong'
  | 'connect4'
  | 'merge2048'
  | 'runner'
  | 'mines'
  | 'invaders'
  | 'pac';

export const ALL_GAME_IDS: GameId[] = [
  'tetris',
  'xo',
  'snake',
  'breaker',
  'pong',
  'connect4',
  'merge2048',
  'runner',
  'mines',
  'invaders',
  'pac',
];

export type ShellState = 'HUB' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER';

export type XOMode = 'ai' | 'local2p';
export type XODifficulty = 'casual' | 'tactical' | 'unbeatable';
export type XOGridSize = 3 | 4 | 5;

export type SnakeSpeed = 'normal' | 'turbo' | 'hyper';
export type ControlScheme = 'both' | 'dpad' | 'swipe';
export type MinesDensity = 'standard' | 'dense' | 'extreme';
export type HapticIntensity = 'off' | 'low' | 'medium' | 'high';

export interface GameConfig {
  tetris: {
    startLevel: number;
    ghostPiece: boolean;
  };
  xo: {
    mode: XOMode;
    difficulty: XODifficulty;
    gridSize: XOGridSize;
    playerFirst: boolean;
  };
  snake: {
    speed: SnakeSpeed;
    wrapWalls: boolean;
  };
  breaker: {
    difficulty: 'normal' | 'overdrive';
  };
  pong: {
    mode: XOMode;
    difficulty: XODifficulty;
    winScore: number;
  };
  connect4: {
    mode: XOMode;
    difficulty: XODifficulty;
    popOutMode: boolean;
  };
  merge2048: {
    shockwaveEnabled: boolean;
  };
  runner: {
    speed: SnakeSpeed;
  };
  mines: {
    density: MinesDensity;
    flagMode: boolean;
  };
  invaders: {
    autoFire: boolean;
  };
  pac: {
    speed: SnakeSpeed;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  game: GameId | 'hub';
  xpReward: number;
  unlockedAt?: number;
}

export type DailyChallengeMetric = 'score' | 'secondary' | 'victory';

export interface DailyChallengeTemplate {
  id: string;
  title: string;
  game: GameId;
  description: string;
  metric: DailyChallengeMetric;
  targetValue: number;
  unitLabel: string;
  xpReward: number;
}

export interface DailyChallengeProgress {
  dateKey: string;
  activeIndexOffset: number;
  currentValue: number;
  completedIds: string[];
  streakDays: number;
  lastCompletedDateKey?: string;
  totalCompleted: number;
}

export interface PlayerProfile {
  callsign: string;
  totalXp: number;
  gamesPlayed: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: HapticIntensity;
  controlScheme: ControlScheme;
  highScores: {
    tetrisScore: number;
    tetrisMaxLines: number;
    tetrisMaxLevel: number;
    xoWinsAI: number;
    xoWinsUnbeatableDrawsOrWins: number;
    xoStreak: number;
    snakeScore: number;
    snakeMaxLength: number;
    breakerScore: number;
    pongWins: number;
    connect4Wins: number;
    merge2048BestScore: number;
    merge2048MaxTile: number;
    runnerBestScore: number;
    minesClearedCount: number;
    invadersScore: number;
    pacScore: number;
    pacMaxWave: number;
  };
  unlockedAchievementIds: string[];
  dailyChallenge: DailyChallengeProgress;
}

export interface LiveGameHUDState {
  score: number;
  secondaryValue: number;
  secondaryLabel: string;
  tertiaryValue: string;
  tertiaryLabel: string;
  statusBanner?: string;
  nextPieceType?: string;
  turnOwner?: 'X' | 'O';
  isAiThinking?: boolean;
  canUndo?: boolean;
  specialCharges?: number;
  flagMode?: boolean;
}
