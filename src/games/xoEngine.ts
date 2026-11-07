// Quantum Grid — 3D X-O (Tic-Tac-Toe) Engine with 3x3, 4x4, 5x5 Boards & Alpha-Beta Minimax AI
import { XODifficulty, XOGridSize, XOMode } from '../types/arcade';

export type CellValue = 'X' | 'O' | null;

export interface WinningLineResult {
  winner: 'X' | 'O' | 'DRAW' | null;
  lineIndices: number[];
}

export class QuantumGridEngine {
  public gridSize: XOGridSize = 3;
  public winLength = 3;
  public mode: XOMode = 'ai';
  public difficulty: XODifficulty = 'unbeatable';
  public board: CellValue[] = [];
  public currentTurn: 'X' | 'O' = 'X';
  public moveHistory: number[] = [];
  public result: WinningLineResult = { winner: null, lineIndices: [] };
  public scoreX = 0;
  public scoreO = 0;
  public draws = 0;

  private winLines: number[][] = [];

  constructor(gridSize: XOGridSize = 3, mode: XOMode = 'ai', difficulty: XODifficulty = 'unbeatable') {
    this.configure(gridSize, mode, difficulty, true);
  }

  public configure(
    gridSize: XOGridSize,
    mode: XOMode,
    difficulty: XODifficulty,
    resetScores = false
  ) {
    this.gridSize = gridSize;
    this.winLength = gridSize === 3 ? 3 : 4; // 3-in-a-row on 3x3; 4-in-a-row on 4x4 and 5x5
    this.mode = mode;
    this.difficulty = difficulty;
    if (resetScores) {
      this.scoreX = 0;
      this.scoreO = 0;
      this.draws = 0;
    }
    this.winLines = this.computeAllWinLines(gridSize, this.winLength);
    this.resetRound();
  }

  public resetRound() {
    this.board = Array(this.gridSize * this.gridSize).fill(null);
    this.currentTurn = 'X';
    this.moveHistory = [];
    this.result = { winner: null, lineIndices: [] };
  }

  private computeAllWinLines(n: number, k: number): number[][] {
    const lines: number[][] = [];
    // Rows
    for (let r = 0; r < n; r++) {
      for (let c = 0; c <= n - k; c++) {
        const line: number[] = [];
        for (let i = 0; i < k; i++) line.push(r * n + (c + i));
        lines.push(line);
      }
    }
    // Columns
    for (let c = 0; c < n; c++) {
      for (let r = 0; r <= n - k; r++) {
        const line: number[] = [];
        for (let i = 0; i < k; i++) line.push((r + i) * n + c);
        lines.push(line);
      }
    }
    // Diagonals (top-left to bottom-right)
    for (let r = 0; r <= n - k; r++) {
      for (let c = 0; c <= n - k; c++) {
        const line: number[] = [];
        for (let i = 0; i < k; i++) line.push((r + i) * n + (c + i));
        lines.push(line);
      }
    }
    // Anti-diagonals (top-right to bottom-left)
    for (let r = 0; r <= n - k; r++) {
      for (let c = k - 1; c < n; c++) {
        const line: number[] = [];
        for (let i = 0; i < k; i++) line.push((r + i) * n + (c - i));
        lines.push(line);
      }
    }
    return lines;
  }

  public makeMove(index: number): boolean {
    if (this.result.winner !== null) return false;
    if (index < 0 || index >= this.board.length || this.board[index] !== null) return false;

    this.board[index] = this.currentTurn;
    this.moveHistory.push(index);

    const check = this.evaluateBoardResult(this.board);
    this.result = check;

    if (check.winner === 'X') {
      this.scoreX++;
    } else if (check.winner === 'O') {
      this.scoreO++;
    } else if (check.winner === 'DRAW') {
      this.draws++;
    } else {
      this.currentTurn = this.currentTurn === 'X' ? 'O' : 'X';
    }
    return true;
  }

  public undoMove(): boolean {
    if (this.moveHistory.length === 0 || this.result.winner !== null) return false;
    const stepsToUndo = this.mode === 'ai' && this.currentTurn === 'X' && this.moveHistory.length >= 2 ? 2 : 1;
    for (let i = 0; i < stepsToUndo; i++) {
      const last = this.moveHistory.pop();
      if (last !== undefined) {
        this.board[last] = null;
        this.currentTurn = this.currentTurn === 'X' ? 'O' : 'X';
      }
    }
    this.result = { winner: null, lineIndices: [] };
    return true;
  }

  public evaluateBoardResult(state: CellValue[]): WinningLineResult {
    for (const line of this.winLines) {
      const first = state[line[0]];
      if (first && line.every((idx) => state[idx] === first)) {
        return { winner: first, lineIndices: line };
      }
    }
    if (state.every((c) => c !== null)) {
      return { winner: 'DRAW', lineIndices: [] };
    }
    return { winner: null, lineIndices: [] };
  }

  public computeAIMove(): number {
    const available: number[] = [];
    for (let i = 0; i < this.board.length; i++) {
      if (this.board[i] === null) available.push(i);
    }
    if (available.length === 0) return -1;

    // 1. Casual difficulty: 45% tactical check, 55% exploratory
    if (this.difficulty === 'casual' && Math.random() < 0.55) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Immediate winning move check for O
    for (const idx of available) {
      this.board[idx] = 'O';
      const win = this.evaluateBoardResult(this.board).winner === 'O';
      this.board[idx] = null;
      if (win) return idx;
    }

    // Immediate block against X winning move
    for (const idx of available) {
      this.board[idx] = 'X';
      const loss = this.evaluateBoardResult(this.board).winner === 'X';
      this.board[idx] = null;
      if (loss) return idx;
    }

    if (this.difficulty === 'tactical' && Math.random() < 0.25) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // Full depth Minimax on 3x3; depth-limited Alpha-Beta heuristic search on 4x4 and 5x5
    const maxDepth = this.gridSize === 3 ? 9 : this.gridSize === 4 ? 4 : 3;
    let bestScore = -Infinity;
    let bestMove = available[0];

    // Prefer center cells for move ordering
    const center = (this.gridSize - 1) / 2;
    const ordered = [...available].sort((a, b) => {
      const ar = Math.floor(a / this.gridSize) - center;
      const ac = (a % this.gridSize) - center;
      const br = Math.floor(b / this.gridSize) - center;
      const bc = (b % this.gridSize) - center;
      return ar * ar + ac * ac - (br * br + bc * bc);
    });

    for (const idx of ordered) {
      this.board[idx] = 'O';
      const score = this.minimax(this.board, 0, false, -Infinity, Infinity, maxDepth);
      this.board[idx] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = idx;
      }
    }
    return bestMove;
  }

  private minimax(
    state: CellValue[],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number,
    maxDepth: number
  ): number {
    const evalRes = this.evaluateBoardResult(state);
    if (evalRes.winner === 'O') return 1000 - depth * 10;
    if (evalRes.winner === 'X') return -1000 + depth * 10;
    if (evalRes.winner === 'DRAW') return 0;
    if (depth >= maxDepth) {
      return this.heuristicEvaluate(state);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < state.length; i++) {
        if (state[i] === null) {
          state[i] = 'O';
          const ev = this.minimax(state, depth + 1, false, alpha, beta, maxDepth);
          state[i] = null;
          maxEval = Math.max(maxEval, ev);
          alpha = Math.max(alpha, ev);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < state.length; i++) {
        if (state[i] === null) {
          state[i] = 'X';
          const ev = this.minimax(state, depth + 1, true, alpha, beta, maxDepth);
          state[i] = null;
          minEval = Math.min(minEval, ev);
          beta = Math.min(beta, ev);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  }

  private heuristicEvaluate(state: CellValue[]): number {
    let score = 0;
    for (const line of this.winLines) {
      let oCount = 0;
      let xCount = 0;
      for (const idx of line) {
        if (state[idx] === 'O') oCount++;
        else if (state[idx] === 'X') xCount++;
      }
      if (oCount > 0 && xCount === 0) {
        score += Math.pow(6, oCount);
      } else if (xCount > 0 && oCount === 0) {
        score -= Math.pow(6, xCount);
      }
    }
    return score;
  }
}
