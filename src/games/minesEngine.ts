// Cyber Mines: Sector Zero — 3D Tactical Minesweeper Engine with Safe First Click, Flag Mode & Sonar Scanner
import { MinesDensity } from '../types/arcade';

export interface MineCell {
  index: number;
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export const MINES_GRID_SIZE = 7; // 7x7 3D Vault Grid

export class CyberMinesEngine {
  public cells: MineCell[] = [];
  public totalMines = 7;
  public flagsPlaced = 0;
  public revealedSafeCount = 0;
  public sonarCharges = 2;
  public flagMode = false;
  public score = 0;
  public isFirstMove = true;
  public isGameOver = false;
  public isVictory = false;
  public triggeredMineIndex = -1;

  constructor(density: MinesDensity = 'standard') {
    this.reset(density);
  }

  public reset(density: MinesDensity = 'standard') {
    this.totalMines = density === 'extreme' ? 11 : density === 'dense' ? 9 : 7;
    this.flagsPlaced = 0;
    this.revealedSafeCount = 0;
    this.sonarCharges = 2;
    this.score = 0;
    this.isFirstMove = true;
    this.isGameOver = false;
    this.isVictory = false;
    this.triggeredMineIndex = -1;

    this.cells = [];
    for (let i = 0; i < MINES_GRID_SIZE * MINES_GRID_SIZE; i++) {
      this.cells.push({
        index: i,
        row: Math.floor(i / MINES_GRID_SIZE),
        col: i % MINES_GRID_SIZE,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      });
    }
  }

  private getNeighbors(index: number): number[] {
    const r = Math.floor(index / MINES_GRID_SIZE);
    const c = index % MINES_GRID_SIZE;
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < MINES_GRID_SIZE && nc >= 0 && nc < MINES_GRID_SIZE) {
          out.push(nr * MINES_GRID_SIZE + nc);
        }
      }
    }
    return out;
  }

  private populateMinesSafe(safeIndex: number) {
    const forbidden = new Set<number>([safeIndex, ...this.getNeighbors(safeIndex)]);
    const candidates: number[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (!forbidden.has(i)) candidates.push(i);
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (let i = 0; i < Math.min(this.totalMines, candidates.length); i++) {
      this.cells[candidates[i]].isMine = true;
    }
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i].isMine) continue;
      const count = this.getNeighbors(i).filter((n) => this.cells[n].isMine).length;
      this.cells[i].neighborMines = count;
    }
  }

  public interactCell(index: number): {
    action: 'revealed' | 'flagged' | 'exploded' | 'none';
    newlyRevealed: number[];
  } {
    if (this.isGameOver || index < 0 || index >= this.cells.length) {
      return { action: 'none', newlyRevealed: [] };
    }
    const cell = this.cells[index];

    if (this.flagMode && !cell.isRevealed) {
      cell.isFlagged = !cell.isFlagged;
      this.flagsPlaced += cell.isFlagged ? 1 : -1;
      return { action: 'flagged', newlyRevealed: [] };
    }

    if (cell.isFlagged) return { action: 'none', newlyRevealed: [] };

    // Chord reveal if tapping an already revealed numbered cell whose neighbor flags match
    if (cell.isRevealed) {
      if (cell.neighborMines > 0) {
        const neighbors = this.getNeighbors(index);
        const flaggedNeighbors = neighbors.filter((n) => this.cells[n].isFlagged).length;
        if (flaggedNeighbors === cell.neighborMines) {
          const batch: number[] = [];
          for (const n of neighbors) {
            if (!this.cells[n].isRevealed && !this.cells[n].isFlagged) {
              const res = this.revealSingleOrFlood(n);
              if (res.exploded) return { action: 'exploded', newlyRevealed: batch };
              batch.push(...res.revealed);
            }
          }
          this.checkVictory();
          return { action: batch.length > 0 ? 'revealed' : 'none', newlyRevealed: batch };
        }
      }
      return { action: 'none', newlyRevealed: [] };
    }

    if (this.isFirstMove) {
      this.isFirstMove = false;
      this.populateMinesSafe(index);
    }

    const res = this.revealSingleOrFlood(index);
    if (res.exploded) {
      return { action: 'exploded', newlyRevealed: res.revealed };
    }
    this.checkVictory();
    return { action: 'revealed', newlyRevealed: res.revealed };
  }

  private revealSingleOrFlood(startIndex: number): { exploded: boolean; revealed: number[] } {
    const startCell = this.cells[startIndex];
    if (startCell.isMine) {
      startCell.isRevealed = true;
      this.triggeredMineIndex = startIndex;
      this.isGameOver = true;
      // Reveal all mines
      this.cells.forEach((c) => {
        if (c.isMine) c.isRevealed = true;
      });
      return { exploded: true, revealed: [startIndex] };
    }

    const revealed: number[] = [];
    const queue = [startIndex];
    const visited = new Set<number>([startIndex]);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const cell = this.cells[curr];
      if (!cell.isRevealed && !cell.isFlagged) {
        cell.isRevealed = true;
        this.revealedSafeCount++;
        this.score += 35 + cell.neighborMines * 15;
        revealed.push(curr);

        if (cell.neighborMines === 0) {
          for (const n of this.getNeighbors(curr)) {
            if (!visited.has(n) && !this.cells[n].isMine) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
      }
    }
    return { exploded: false, revealed };
  }

  public useSonarPulse(): number {
    if (this.isGameOver || this.sonarCharges <= 0) return -1;
    if (this.isFirstMove) {
      // Reveal center cell safely if used before first move
      this.interactCell(Math.floor(this.cells.length / 2));
      this.sonarCharges--;
      return Math.floor(this.cells.length / 2);
    }
    // Find an unflagged hidden mine and flag it automatically
    const unflaggedMine = this.cells.find((c) => c.isMine && !c.isFlagged);
    if (unflaggedMine) {
      this.sonarCharges--;
      unflaggedMine.isFlagged = true;
      this.flagsPlaced++;
      this.score += 50;
      return unflaggedMine.index;
    }
    return -1;
  }

  private checkVictory() {
    const totalSafe = this.cells.length - this.totalMines;
    if (this.revealedSafeCount >= totalSafe) {
      this.isVictory = true;
      this.isGameOver = true;
      this.score += 450;
    }
  }
}
