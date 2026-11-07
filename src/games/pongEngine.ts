// Vector Pong: Overdrive — 3D Cyber Air Hockey / Pong Engine with AI Tiers, 2P Mode & Dash Strike
import { XODifficulty, XOMode } from '../types/arcade';

export const PONG_BOUNDS_X = 5.4;
export const PONG_BOUNDS_Z = 7.8;
export const PONG_PLAYER_Z = 6.8;
export const PONG_OPPONENT_Z = -6.8;

export class VectorPongEngine {
  public playerX = 0;
  public opponentX = 0;
  public paddleWidth = 2.2;

  public puckX = 0;
  public puckZ = 0;
  public puckVx = 0;
  public puckVz = 0;

  public scorePlayer = 0;
  public scoreOpponent = 0;
  public winScore = 5;
  public mode: XOMode = 'ai';
  public difficulty: XODifficulty = 'tactical';
  public dashCooldown = 0;
  public overchargeGateX = 0;
  public overchargeActive = false;

  public isGameOver = false;
  public winner: 'PLAYER' | 'OPPONENT' | null = null;
  public serveTimer = 0;

  constructor(mode: XOMode = 'ai', difficulty: XODifficulty = 'tactical', winScore = 5) {
    this.reset(mode, difficulty, winScore);
  }

  public reset(mode: XOMode = 'ai', difficulty: XODifficulty = 'tactical', winScore = 5) {
    this.mode = mode;
    this.difficulty = difficulty;
    this.winScore = winScore;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.playerX = 0;
    this.opponentX = 0;
    this.isGameOver = false;
    this.winner = null;
    this.servePuck(1);
  }

  private servePuck(dirZ: 1 | -1) {
    this.puckX = 0;
    this.puckZ = 0;
    const baseSpeed = 9.8;
    this.puckVx = (Math.random() - 0.5) * 5.0;
    this.puckVz = dirZ * baseSpeed;
    this.overchargeActive = false;
    this.serveTimer = 1.25;
  }

  public movePlayer(deltaX: number) {
    const limit = PONG_BOUNDS_X - this.paddleWidth / 2;
    this.playerX = Math.max(-limit, Math.min(limit, this.playerX + deltaX));
  }

  public setPlayerTargetX(worldX: number) {
    const limit = PONG_BOUNDS_X - this.paddleWidth / 2;
    this.playerX = Math.max(-limit, Math.min(limit, worldX));
  }

  public moveOpponentManual(deltaX: number) {
    const limit = PONG_BOUNDS_X - this.paddleWidth / 2;
    this.opponentX = Math.max(-limit, Math.min(limit, this.opponentX + deltaX));
  }

  public triggerDashStrike(): boolean {
    if (this.dashCooldown > 0 || this.isGameOver) return false;
    this.dashCooldown = 2.0;
    if (Math.abs(this.puckZ - PONG_PLAYER_Z) < 1.8 && Math.abs(this.puckX - this.playerX) < 2.2) {
      this.puckVz = -15.5;
      this.puckVx = (this.puckX - this.playerX) * 4.5;
      this.overchargeActive = true;
      return true;
    }
    return false;
  }

  public update(dt: number): {
    paddleHit: boolean;
    wallHit: boolean;
    scoredBy: 'PLAYER' | 'OPPONENT' | null;
  } {
    let paddleHit = false;
    let wallHit = false;
    let scoredBy: 'PLAYER' | 'OPPONENT' | null;
    scoredBy = null;

    if (this.isGameOver) return { paddleHit, wallHit, scoredBy };

    if (this.dashCooldown > 0) {
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    }

    // Oscillate center Overcharge Gate
    this.overchargeGateX = Math.sin(performance.now() * 0.002) * 2.6;

    if (this.serveTimer > 0) {
      this.serveTimer = Math.max(0, this.serveTimer - dt);
      return { paddleHit, wallHit, scoredBy };
    }

    // AI Opponent Tracking (or reactive auto-tracking in 2P if keyboard/single touch)
    const aiSpeed =
      this.difficulty === 'unbeatable'
        ? 10.5
        : this.difficulty === 'tactical'
        ? 7.8
        : 5.2;
    const targetX = this.puckVz < 0 ? this.puckX : this.puckX * 0.35;
    const diff = targetX - this.opponentX;
    const limit = PONG_BOUNDS_X - this.paddleWidth / 2;
    const maxStep = aiSpeed * dt;
    this.opponentX = Math.max(
      -limit,
      Math.min(limit, this.opponentX + Math.sign(diff) * Math.min(Math.abs(diff), maxStep))
    );

    // Advance Puck
    const prevZ = this.puckZ;
    this.puckX += this.puckVx * dt;
    this.puckZ += this.puckVz * dt;

    // Check passage through center Overcharge Gate
    if (
      Math.sign(prevZ) !== Math.sign(this.puckZ) &&
      Math.abs(this.puckX - this.overchargeGateX) < 1.15
    ) {
      this.puckVx *= 1.18;
      this.puckVz = Math.sign(this.puckVz) * Math.min(16.5, Math.abs(this.puckVz) * 1.22);
      this.overchargeActive = true;
    }

    // Side wall bounce
    if (this.puckX < -PONG_BOUNDS_X + 0.35) {
      this.puckX = -PONG_BOUNDS_X + 0.35;
      this.puckVx = Math.abs(this.puckVx);
      wallHit = true;
    } else if (this.puckX > PONG_BOUNDS_X - 0.35) {
      this.puckX = PONG_BOUNDS_X - 0.35;
      this.puckVx = -Math.abs(this.puckVx);
      wallHit = true;
    }

    // Player paddle bounce
    if (
      this.puckVz > 0 &&
      this.puckZ >= PONG_PLAYER_Z - 0.45 &&
      this.puckZ <= PONG_PLAYER_Z + 0.4 &&
      Math.abs(this.puckX - this.playerX) <= this.paddleWidth * 0.58
    ) {
      const offset = (this.puckX - this.playerX) / (this.paddleWidth * 0.5);
      const speed = Math.min(16.0, Math.hypot(this.puckVx, this.puckVz) * 1.05);
      const angle = offset * (Math.PI / 3);
      this.puckVx = Math.sin(angle) * speed;
      this.puckVz = -Math.cos(angle) * speed;
      this.puckZ = PONG_PLAYER_Z - 0.46;
      paddleHit = true;
    }

    // Opponent paddle bounce
    if (
      this.puckVz < 0 &&
      this.puckZ <= PONG_OPPONENT_Z + 0.45 &&
      this.puckZ >= PONG_OPPONENT_Z - 0.4 &&
      Math.abs(this.puckX - this.opponentX) <= this.paddleWidth * 0.58
    ) {
      const offset = (this.puckX - this.opponentX) / (this.paddleWidth * 0.5);
      const speed = Math.min(16.0, Math.hypot(this.puckVx, this.puckVz) * 1.04);
      const angle = offset * (Math.PI / 3);
      this.puckVx = Math.sin(angle) * speed;
      this.puckVz = Math.cos(angle) * speed;
      this.puckZ = PONG_OPPONENT_Z + 0.46;
      paddleHit = true;
    }

    // Goal detection
    if (this.puckZ < -PONG_BOUNDS_Z) {
      this.scorePlayer++;
      scoredBy = 'PLAYER';
      if (this.scorePlayer >= this.winScore) {
        this.isGameOver = true;
        this.winner = 'PLAYER';
      } else {
        this.servePuck(1);
      }
    } else if (this.puckZ > PONG_BOUNDS_Z) {
      this.scoreOpponent++;
      scoredBy = 'OPPONENT';
      if (this.scoreOpponent >= this.winScore) {
        this.isGameOver = true;
        this.winner = 'OPPONENT';
      } else {
        this.servePuck(-1);
      }
    }

    return { paddleHit, wallHit, scoredBy };
  }
}
