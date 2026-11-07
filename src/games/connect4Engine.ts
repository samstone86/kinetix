// Gravity Drop 4 — 3D Connect Four Engine (7x6 Vertical Matrix, Pop-Out Mode & Alpha-Beta AI)
import { XODifficulty, XOMode } from '../types/arcade';

export const C4_COLS = 7;
export const C4_ROWS = 6;

export type C4Disc = 1 | 2 | null; // 1 = Player 1 (Cyan), 2 = AI / Player 2 (Rose)

export interface C4WinResult {
  winner: 1 | 2 | 'DRAW' | null;
  cells: [number, number][]; // [col, row]
}

export class GravityDrop4Engine {
  public grid: C4Disc[][] = []; // grid[col][row] where row 0 is bottom
  public currentTurn: 1 | 2 = 1;
  public selectedCol = 3;
  public mode: XOMode = 'ai';
  public difficulty: XODifficulty = 'tactical';
  public popOutMode = false;
  public result: C4WinResult = { winner: null, cells: [] };
  public scoreP1 = 0;
  public scoreP2 = 0;
  public history: { col: number; popOut: boolean; prevGrid: C4Disc[][] }[] = [];

  constructor(mode: XOMode = 'ai', difficulty: XODifficulty = 'tactical', popOutMode = false) {
    this.configure(mode, difficulty, popOutMode, true);
  }

  public configure(
    mode: XOMode,
    difficulty: XODifficulty,
    popOutMode: boolean,
    resetScores = false
  ) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.popOutMode = popOutMode;
    if (resetScores) {
      this.scoreP1 = 0;
      this.scoreP2 = 0;
    }
    this.resetRound();
  }

  public resetRound() {
    this.grid = Array.from({ length: C4_COLS }, () => Array(C4_ROWS).fill(null));
    this.currentTurn = 1;
    this.selectedCol = 3;
    this.history = [];
    this.result = { winner: null, cells: [] };
  }

  private cloneGrid(g: C4Disc[][]): C4Disc[][] {
    return g.map((col) => [...col]);
  }

  public getDropRow(col: number, g = this.grid): number {
    if (col < 0 || col >= C4_COLS) return -1;
    for (let r = 0; r < C4_ROWS; r++) {
      if (g[col][r] === null) return r;
    }
    return -1;
  }

  public dropDisc(col: number): { success: boolean; row: number } {
    if (this.result.winner !== null) return { success: false, row: -1 };
    const r = this.getDropRow(col);
    if (r === -1) return { success: false, row: -1 };

    this.history.push({ col, popOut: false, prevGrid: this.cloneGrid(this.grid) });
    this.grid[col][r] = this.currentTurn;
    this.selectedCol = col;
    this.finalizeTurn();
    return { success: true, row: r };
  }

  public popOutBottomDisc(col: number): boolean {
    if (!this.popOutMode || this.result.winner !== null) return false;
    if (col < 0 || col >= C4_COLS || this.grid[col][0] !== this.currentTurn) return false;

    this.history.push({ col, popOut: true, prevGrid: this.cloneGrid(this.grid) });
    for (let r = 0; r < C4_ROWS - 1; r++) {
      this.grid[col][r] = this.grid[col][r + 1];
    }
    this.grid[col][C4_ROWS - 1] = null;
    this.selectedCol = col;
    this.finalizeTurn();
    return true;
  }

  public undo(): boolean {
    if (this.history.length === 0 || this.result.winner !== null) return false;
    const steps = this.mode === 'ai' && this.currentTurn === 1 && this.history.length >= 2 ? 2 : 1;
    for (let i = 0; i < steps; i++) {
      const snap = this.history.pop();
      if (snap) {
        this.grid = snap.prevGrid;
        this.currentTurn = this.currentTurn === 1 ? 2 : 1;
      }
    }
    this.result = { winner: null, cells: [] };
    return true;
  }

  private finalizeTurn() {
    this.result = this.evaluateGrid(this.grid);
    if (this.result.winner === 1) {
      this.scoreP1++;
    } else if (this.result.winner === 2) {
      this.scoreP2++;
    } else if (this.result.winner === null) {
      this.currentTurn = this.currentTurn === 1 ? 2 : 1;
    }
  }

  public evaluateGrid(g: C4Disc[][]): C4WinResult {
    const dirs = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ];
    for (let c = 0; c < C4_COLS; c++) {
      for (let r = 0; r < C4_ROWS; r++) {
        const val = g[c][r];
        if (!val) continue;
        for (const [dc, dr] of dirs) {
          const line: [number, number][] = [[c, r]];
          for (let k = 1; k < 4; k++) {
            const nc = c + dc * k;
            const nr = r + dr * k;
            if (nc >= 0 && nc < C4_COLS && nr >= 0 && nr < C4_ROWS && g[nc][nr] === val) {
              line.push([nc, nr]);
            } else {
              break;
            }
          }
          if (line.length === 4) {
            return { winner: val, cells: line };
          }
        }
      }
    }

    const isFull = g.every((col) => col.every((cell) => cell !== null));
    if (isFull) return { winner: 'DRAW', cells: [] };
    return { winner: null, cells: [] };
  }

  public computeAIMove(): number {
    const validCols: number[] = [];
    for (let c = 0; c < C4_COLS; c++) {
      if (this.getDropRow(c) !== -1) validCols.push(c);
    }
    if (validCols.length === 0) return -1;

    if (this.difficulty === 'casual' && Math.random() < 0.5) {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // Immediate win check
    for (const c of validCols) {
      const r = this.getDropRow(c);
      this.grid[c][r] = 2;
      const win = this.evaluateGrid(this.grid).winner === 2;
      this.grid[c][r] = null;
      if (win) return c;
    }

    // Immediate block check
    for (const c of validCols) {
      const r = this.getDropRow(c);
      this.grid[c][r] = 1;
      const block = this.evaluateGrid(this.grid).winner === 1;
      this.grid[c][r] = null;
      if (block) return c;
    }

    const depth = this.difficulty === 'unbeatable' ? 4 : 2;
    const ordered = [...validCols].sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));
    let bestScore = -Infinity;
    let bestCol = ordered[0];

    for (const c of ordered) {
      const r = this.getDropRow(c);
      this.grid[c][r] = 2;
      const score = this.minimax(this.grid, depth - 1, false, -Infinity, Infinity);
      this.grid[c][r] = null;
      if (score > bestScore) {
        bestScore = score;
        bestCol = c;
      }
    }
    return bestCol;
  }

  private minimax(
    g: C4Disc[][],
    depth: number,
    maximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    const res = this.evaluateGrid(g);
    if (res.winner === 2) return 10000 + depth * 100;
    if (res.winner === 1) return -10000 - depth * 100;
    if (res.winner === 'DRAW' || depth === 0) return this.scorePosition(g);

    const ordered = [3, 2, 4, 1, 5, 0, 6];
    if (maximizing) {
      let maxEval = -Infinity;
      for (const c of ordered) {
        const r = this.getDropRow(c, g);
        if (r === -1) continue;
        g[c][r] = 2;
        const ev = this.minimax(g, depth - 1, false, alpha, beta);
        g[c][r] = null;
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const c of ordered) {
        const r = this.getDropRow(c, g);
        if (r === -1) continue;
        g[c][r] = 1;
        const ev = this.minimax(g, depth - 1, true, alpha, beta);
        g[c][r] = null;
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private scorePosition(g: C4Disc[][]): number {
    let score = 0;
    // Prefer center column
    for (let r = 0; r < C4_ROWS; r++) {
      if (g[3][r] === 2) score += 6;
      else if (g[3][r] === 1) score -= 6;
    }
    return score;
  }
}
