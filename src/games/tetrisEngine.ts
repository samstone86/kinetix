// Prism Drop — 3D Tetris Simulation Engine (10x20 Matrix, 7-Bag Randomizer, Wall Kicks, Ghost Projection)

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoDef {
  type: TetrominoType;
  color: number;
  shapes: number[][][]; // 4 rotation states of [x, y] offsets
}

export const TETROMINO_DEFS: Record<TetrominoType, TetrominoDef> = {
  I: {
    type: 'I',
    color: 0x06b6d4, // Electric Cyan
    shapes: [
      [[-1, 0], [0, 0], [1, 0], [2, 0]],
      [[1, 1], [1, 0], [1, -1], [1, -2]],
      [[-1, -1], [0, -1], [1, -1], [2, -1]],
      [[0, 1], [0, 0], [0, -1], [0, -2]],
    ],
  },
  O: {
    type: 'O',
    color: 0xf59e0b, // Solar Amber
    shapes: [
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
      [[0, 0], [1, 0], [0, 1], [1, 1]],
    ],
  },
  T: {
    type: 'T',
    color: 0x8b5cf6, // Ultraviolet
    shapes: [
      [[-1, 0], [0, 0], [1, 0], [0, 1]],
      [[0, 1], [0, 0], [1, 0], [0, -1]],
      [[-1, 0], [0, 0], [1, 0], [0, -1]],
      [[0, 1], [-1, 0], [0, 0], [0, -1]],
    ],
  },
  S: {
    type: 'S',
    color: 0x10b981, // Bioluminescent Emerald
    shapes: [
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
      [[0, 1], [0, 0], [1, 0], [1, -1]],
      [[-1, -1], [0, -1], [0, 0], [1, 0]],
      [[-1, 1], [-1, 0], [0, 0], [0, -1]],
    ],
  },
  Z: {
    type: 'Z',
    color: 0xf43f5e, // Crimson Rose
    shapes: [
      [[-1, 1], [0, 1], [0, 0], [1, 0]],
      [[1, 1], [1, 0], [0, 0], [0, -1]],
      [[-1, 0], [0, 0], [0, -1], [1, -1]],
      [[0, 1], [0, 0], [-1, 0], [-1, -1]],
    ],
  },
  J: {
    type: 'J',
    color: 0x3b82f6, // Cobalt Blue
    shapes: [
      [[-1, 1], [-1, 0], [0, 0], [1, 0]],
      [[0, 1], [1, 1], [0, 0], [0, -1]],
      [[-1, 0], [0, 0], [1, 0], [1, -1]],
      [[0, 1], [0, 0], [-1, -1], [0, -1]],
    ],
  },
  L: {
    type: 'L',
    color: 0xf97316, // Tangerine Glow
    shapes: [
      [[-1, 0], [0, 0], [1, 0], [1, 1]],
      [[0, 1], [0, 0], [0, -1], [1, -1]],
      [[-1, -1], [-1, 0], [0, 0], [1, 0]],
      [[-1, 1], [0, 1], [0, 0], [0, -1]],
    ],
  },
};

export const MATRIX_WIDTH = 10;
export const MATRIX_HEIGHT = 20;

export class PrismDropEngine {
  public board: (number | null)[][] = [];
  public activeType: TetrominoType = 'T';
  public nextType: TetrominoType = 'I';
  public activeX = 4;
  public activeY = 18;
  public activeRot = 0;

  public score = 0;
  public lines = 0;
  public level = 1;
  public startLevel = 1;
  public maxComboQuad = false;
  public isGameOver = false;

  private bag: TetrominoType[] = [];
  private dropTimer = 0;

  constructor(startLevel = 1) {
    this.reset(startLevel);
  }

  public reset(startLevel = 1) {
    this.startLevel = startLevel;
    this.level = startLevel;
    this.score = 0;
    this.lines = 0;
    this.maxComboQuad = false;
    this.isGameOver = false;
    this.dropTimer = 0;
    this.bag = [];
    this.board = Array.from({ length: MATRIX_HEIGHT }, () =>
      Array(MATRIX_WIDTH).fill(null)
    );
    this.nextType = this.pullFromBag();
    this.spawnNext();
  }

  private pullFromBag(): TetrominoType {
    if (this.bag.length === 0) {
      const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      this.bag = types;
    }
    return this.bag.pop()!;
  }

  private spawnNext() {
    this.activeType = this.nextType;
    this.nextType = this.pullFromBag();
    this.activeX = 4;
    this.activeY = 18;
    this.activeRot = 0;

    if (!this.isValidPosition(this.activeX, this.activeY, this.activeRot)) {
      this.isGameOver = true;
    }
  }

  public getCells(x: number, y: number, rot: number, type = this.activeType): [number, number][] {
    const offsets = TETROMINO_DEFS[type].shapes[rot % 4];
    return offsets.map(([dx, dy]) => [x + dx, y + dy]);
  }

  public isValidPosition(x: number, y: number, rot: number): boolean {
    const cells = this.getCells(x, y, rot);
    for (const [cx, cy] of cells) {
      if (cx < 0 || cx >= MATRIX_WIDTH || cy < 0) return false;
      if (cy < MATRIX_HEIGHT && this.board[cy][cx] !== null) return false;
    }
    return true;
  }

  public getGhostY(): number {
    let gy = this.activeY;
    while (this.isValidPosition(this.activeX, gy - 1, this.activeRot)) {
      gy--;
    }
    return gy;
  }

  public moveHorizontal(dir: -1 | 1): boolean {
    if (this.isGameOver) return false;
    if (this.isValidPosition(this.activeX + dir, this.activeY, this.activeRot)) {
      this.activeX += dir;
      return true;
    }
    return false;
  }

  public rotate(): boolean {
    if (this.isGameOver) return false;
    const nextRot = (this.activeRot + 1) % 4;
    const kicks: [number, number][] = [
      [0, 0],
      [-1, 0],
      [1, 0],
      [0, 1],
      [-2, 0],
      [2, 0],
    ];
    for (const [kx, ky] of kicks) {
      if (this.isValidPosition(this.activeX + kx, this.activeY + ky, nextRot)) {
        this.activeX += kx;
        this.activeY += ky;
        this.activeRot = nextRot;
        return true;
      }
    }
    return false;
  }

  public softDrop(): { moved: boolean; locked: boolean; clearedLines: number } {
    if (this.isGameOver) return { moved: false, locked: false, clearedLines: 0 };
    if (this.isValidPosition(this.activeX, this.activeY - 1, this.activeRot)) {
      this.activeY--;
      this.score += 1;
      this.dropTimer = 0;
      return { moved: true, locked: false, clearedLines: 0 };
    } else {
      const cleared = this.lockPiece();
      return { moved: false, locked: true, clearedLines: cleared };
    }
  }

  public hardDrop(): { dropDistance: number; clearedLines: number; lockCells: [number, number][] } {
    if (this.isGameOver) return { dropDistance: 0, clearedLines: 0, lockCells: [] };
    let dist = 0;
    while (this.isValidPosition(this.activeX, this.activeY - 1, this.activeRot)) {
      this.activeY--;
      dist++;
    }
    this.score += dist * 2;
    const lockCells = this.getCells(this.activeX, this.activeY, this.activeRot);
    const clearedLines = this.lockPiece();
    this.dropTimer = 0;
    return { dropDistance: dist, clearedLines, lockCells };
  }

  private lockPiece(): number {
    const color = TETROMINO_DEFS[this.activeType].color;
    const cells = this.getCells(this.activeX, this.activeY, this.activeRot);
    for (const [cx, cy] of cells) {
      if (cy >= 0 && cy < MATRIX_HEIGHT && cx >= 0 && cx < MATRIX_WIDTH) {
        this.board[cy][cx] = color;
      } else if (cy >= MATRIX_HEIGHT) {
        this.isGameOver = true;
      }
    }

    // Check full lines
    let cleared = 0;
    const nextBoard: (number | null)[][] = [];
    for (let r = 0; r < MATRIX_HEIGHT; r++) {
      if (this.board[r].every((cell) => cell !== null)) {
        cleared++;
      } else {
        nextBoard.push(this.board[r]);
      }
    }
    while (nextBoard.length < MATRIX_HEIGHT) {
      nextBoard.push(Array(MATRIX_WIDTH).fill(null));
    }
    this.board = nextBoard;

    if (cleared > 0) {
      const linePoints = [0, 100, 300, 500, 800];
      this.score += (linePoints[cleared] || 800) * this.level;
      this.lines += cleared;
      if (cleared >= 4) {
        this.maxComboQuad = true;
      }
      this.level = Math.max(this.startLevel, Math.floor(this.lines / 10) + this.startLevel);
    }

    if (!this.isGameOver) {
      this.spawnNext();
    }
    return cleared;
  }

  public getDropInterval(): number {
    return Math.max(0.11, 0.82 - (this.level - 1) * 0.068);
  }

  public update(dt: number): { locked: boolean; clearedLines: number } {
    if (this.isGameOver) return { locked: false, clearedLines: 0 };
    this.dropTimer += dt;
    const interval = this.getDropInterval();
    if (this.dropTimer >= interval) {
      this.dropTimer -= interval;
      if (this.isValidPosition(this.activeX, this.activeY - 1, this.activeRot)) {
        this.activeY--;
        return { locked: false, clearedLines: 0 };
      } else {
        const clearedLines = this.lockPiece();
        return { locked: true, clearedLines };
      }
    }
    return { locked: false, clearedLines: 0 };
  }
}
