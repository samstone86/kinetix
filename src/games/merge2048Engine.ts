// Hexa Pulse 2048 — 3D Isometric Skyscraper Tile Merger Engine with Undo & Reactor Shockwave

export class HexaPulse2048Engine {
  public grid: number[][] = []; // 4x4 matrix of values (0 = empty, 2, 4, 8, ... 2048+)
  public score = 0;
  public maxTile = 2;
  public shockwaveCharges = 2;
  public isGameOver = false;
  public history: { grid: number[][]; score: number }[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.score = 0;
    this.maxTile = 2;
    this.shockwaveCharges = 2;
    this.isGameOver = false;
    this.history = [];
    this.spawnRandomTile();
    this.spawnRandomTile();
  }

  private cloneGrid(g: number[][]): number[][] {
    return g.map((r) => [...r]);
  }

  private spawnRandomTile() {
    const empty: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.88 ? 2 : 4;
    this.recalcMaxTile();
  }

  private recalcMaxTile() {
    let m = 2;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] > m) m = this.grid[r][c];
      }
    }
    this.maxTile = m;
  }

  public slide(dir: 'left' | 'right' | 'up' | 'down'): {
    moved: boolean;
    mergedPositions: [number, number][];
    largestMerge: number;
  } {
    if (this.isGameOver) return { moved: false, mergedPositions: [], largestMerge: 0 };

    const prevSnapshot = this.cloneGrid(this.grid);
    const prevScore = this.score;
    const mergedPositions: [number, number][] = [];
    let largestMerge = 0;
    let moved = false;

    const processLine = (line: number[]): { newLine: number[]; mergedIdxs: number[] } => {
      const nonZero = line.filter((v) => v !== 0);
      const out: number[] = [];
      const mergedIdxs: number[] = [];
      let i = 0;
      while (i < nonZero.length) {
        if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
          const mergedVal = nonZero[i] * 2;
          out.push(mergedVal);
          mergedIdxs.push(out.length - 1);
          this.score += mergedVal;
          if (mergedVal > largestMerge) largestMerge = mergedVal;
          i += 2;
        } else {
          out.push(nonZero[i]);
          i += 1;
        }
      }
      while (out.length < 4) out.push(0);
      return { newLine: out, mergedIdxs };
    };

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        const row = dir === 'left' ? [...this.grid[r]] : [...this.grid[r]].reverse();
        const { newLine, mergedIdxs } = processLine(row);
        const finalRow = dir === 'left' ? newLine : [...newLine].reverse();
        for (let c = 0; c < 4; c++) {
          if (this.grid[r][c] !== finalRow[c]) moved = true;
          this.grid[r][c] = finalRow[c];
        }
        mergedIdxs.forEach((idx) => {
          const colIdx = dir === 'left' ? idx : 3 - idx;
          mergedPositions.push([r, colIdx]);
        });
      }
    } else {
      for (let c = 0; c < 4; c++) {
        const col = [this.grid[0][c], this.grid[1][c], this.grid[2][c], this.grid[3][c]];
        const input = dir === 'up' ? col : [...col].reverse();
        const { newLine, mergedIdxs } = processLine(input);
        const finalCol = dir === 'up' ? newLine : [...newLine].reverse();
        for (let r = 0; r < 4; r++) {
          if (this.grid[r][c] !== finalCol[r]) moved = true;
          this.grid[r][c] = finalCol[r];
        }
        mergedIdxs.forEach((idx) => {
          const rowIdx = dir === 'up' ? idx : 3 - idx;
          mergedPositions.push([rowIdx, c]);
        });
      }
    }

    if (moved) {
      this.history.push({ grid: prevSnapshot, score: prevScore });
      if (this.history.length > 8) this.history.shift();
      this.spawnRandomTile();
      if (!this.canMove()) {
        this.isGameOver = true;
      }
    }

    return { moved, mergedPositions, largestMerge };
  }

  public triggerShockwave(): [number, number][] {
    if (this.shockwaveCharges <= 0 || this.isGameOver) return [];
    const cleared: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 2 || this.grid[r][c] === 4) {
          cleared.push([r, c]);
        }
      }
    }
    // Keep at least 1 tile on the board
    const totalOccupied = this.grid.flat().filter((v) => v > 0).length;
    if (cleared.length === 0 || totalOccupied <= 1) return [];

    this.history.push({ grid: this.cloneGrid(this.grid), score: this.score });
    this.shockwaveCharges--;

    const toClear = cleared.slice(0, Math.max(1, Math.min(cleared.length, totalOccupied - 1)));
    toClear.forEach(([r, c]) => {
      this.grid[r][c] = 0;
    });
    this.recalcMaxTile();
    return toClear;
  }

  public undo(): boolean {
    if (this.history.length === 0) return false;
    const snap = this.history.pop()!;
    this.grid = snap.grid;
    this.score = snap.score;
    this.isGameOver = false;
    this.recalcMaxTile();
    return true;
  }

  public canMove(): boolean {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = this.grid[r][c];
        if (val === 0) return true;
        if (r + 1 < 4 && this.grid[r + 1][c] === val) return true;
        if (c + 1 < 4 && this.grid[r][c + 1] === val) return true;
      }
    }
    return false;
  }
}
