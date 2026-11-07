// Void Runner — 3D Endless Starfighter Lane Dodger with Jump, Warp Rings & Phase Shift Overdrive
import { SnakeSpeed } from '../types/arcade';

export interface RunnerObstacle {
  id: number;
  lane: -1 | 0 | 1; // -1 = Left (-2.8), 0 = Center (0), 1 = Right (+2.8)
  z: number;
  kind: 'pillar' | 'barrier' | 'ring';
  active: boolean;
}

export const RUNNER_LANE_WIDTH = 2.8;

export class VoidRunnerEngine {
  public targetLane: -1 | 0 | 1 = 0;
  public shipX = 0;
  public shipY = 0;
  public shipVy = 0;
  public isJumping = false;

  public score = 0;
  public ringsCollected = 0;
  public phaseShiftTimer = 0; // Invulnerable overdrive when > 0
  public speedMode: SnakeSpeed = 'normal';
  public forwardSpeed = 18;
  public obstacles: RunnerObstacle[] = [];
  public isGameOver = false;

  private spawnTimer = 0;
  private nextId = 1;

  constructor(speedMode: SnakeSpeed = 'normal') {
    this.reset(speedMode);
  }

  public reset(speedMode: SnakeSpeed = 'normal') {
    this.speedMode = speedMode;
    this.targetLane = 0;
    this.shipX = 0;
    this.shipY = 0;
    this.shipVy = 0;
    this.isJumping = false;
    this.score = 0;
    this.ringsCollected = 0;
    this.phaseShiftTimer = 0;
    this.isGameOver = false;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.forwardSpeed =
      speedMode === 'hyper' ? 25 : speedMode === 'turbo' ? 21 : 17.5;
  }

  public shiftLane(dir: -1 | 1): boolean {
    if (this.isGameOver) return false;
    const next = Math.max(-1, Math.min(1, this.targetLane + dir)) as -1 | 0 | 1;
    if (next !== this.targetLane) {
      this.targetLane = next;
      return true;
    }
    return false;
  }

  public jump(): boolean {
    if (this.isGameOver || this.isJumping) return false;
    this.isJumping = true;
    this.shipVy = 9.8;
    return true;
  }

  public activatePhaseShift(): boolean {
    if (this.isGameOver || this.phaseShiftTimer > 0 || this.ringsCollected < 3) return false;
    this.ringsCollected -= 3;
    this.phaseShiftTimer = 5.5;
    return true;
  }

  private spawnRow() {
    const lanes: (-1 | 0 | 1)[] = [-1, 0, 1];
    // Shuffle lanes
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }

    // Spawn 1 or 2 obstacles and 1 optional warp ring so there is always a clear or jumpable path
    const count = Math.random() < 0.55 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const kind = Math.random() < 0.42 ? 'barrier' : 'pillar';
      this.obstacles.push({
        id: this.nextId++,
        lane: lanes[i],
        z: -48,
        kind,
        active: true,
      });
    }
    if (Math.random() < 0.68) {
      this.obstacles.push({
        id: this.nextId++,
        lane: lanes[2],
        z: -48,
        kind: 'ring',
        active: true,
      });
    }
  }

  public update(dt: number): {
    ringPicked: { x: number; z: number } | null;
    shatteredObstacle: { x: number; z: number } | null;
    crashed: boolean;
  } {
    let ringPicked: { x: number; z: number } | null = null;
    let shatteredObstacle: { x: number; z: number } | null = null;
    let crashed = false;

    if (this.isGameOver) return { ringPicked, shatteredObstacle, crashed };

    // Smoothly ramp speed and score
    const base =
      this.speedMode === 'hyper' ? 25 : this.speedMode === 'turbo' ? 21 : 17.5;
    this.forwardSpeed = Math.min(34, base + this.score * 0.003) * (this.phaseShiftTimer > 0 ? 1.25 : 1);
    this.score += Math.round(this.forwardSpeed * dt * 2.2);

    if (this.phaseShiftTimer > 0) {
      this.phaseShiftTimer = Math.max(0, this.phaseShiftTimer - dt);
    }

    // Horizontal lane damping
    const targetX = this.targetLane * RUNNER_LANE_WIDTH;
    this.shipX += (targetX - this.shipX) * (1 - Math.exp(-14 * dt));

    // Jump physics
    if (this.isJumping) {
      this.shipY += this.shipVy * dt;
      this.shipVy -= 24.5 * dt;
      if (this.shipY <= 0) {
        this.shipY = 0;
        this.shipVy = 0;
        this.isJumping = false;
      }
    }

    // Spawn obstacles
    this.spawnTimer += dt;
    const spawnInterval = Math.max(0.42, 11.5 / this.forwardSpeed);
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval;
      this.spawnRow();
    }

    // Advance obstacles toward ship at z = 4.5
    const shipZ = 4.5;
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      obs.z += this.forwardSpeed * dt;
      const obsX = obs.lane * RUNNER_LANE_WIDTH;

      if (Math.abs(obs.z - shipZ) < 0.85 && Math.abs(obsX - this.shipX) < 1.1) {
        if (obs.kind === 'ring') {
          obs.active = false;
          this.ringsCollected++;
          this.score += 120;
          ringPicked = { x: obsX, z: obs.z };
          if (this.ringsCollected >= 5 && this.phaseShiftTimer <= 0) {
            this.ringsCollected -= 5;
            this.phaseShiftTimer = 5.5;
          }
        } else {
          // Barrier can be jumped over if shipY > 1.05
          const clearedBarrier = obs.kind === 'barrier' && this.shipY > 1.0;
          if (!clearedBarrier) {
            if (this.phaseShiftTimer > 0) {
              obs.active = false;
              this.score += 150;
              shatteredObstacle = { x: obsX, z: obs.z };
            } else {
              this.isGameOver = true;
              crashed = true;
            }
          }
        }
      }

      if (obs.z > 12) {
        obs.active = false;
      }
    }

    this.obstacles = this.obstacles.filter((o) => o.active);
    return { ringPicked, shatteredObstacle, crashed };
  }
}
