// Aegis Breaker — 3D Brick Breaker / Arkanoid Engine with Multi-Hit Crystal Bricks & Power-up Capsules

export interface BrickItem {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  colorHex: number;
  powerUp?: 'multiball' | 'wide' | 'laser';
}

export interface BallItem {
  x: number;
  z: number;
  vx: number;
  vz: number;
  active: boolean;
}

export interface CapsuleItem {
  x: number;
  z: number;
  type: 'multiball' | 'wide' | 'laser';
  active: boolean;
}

export interface LaserBolt {
  x: number;
  z: number;
  active: boolean;
}

export const BREAKER_BOUNDS_X = 6.2;
export const BREAKER_BOUNDS_Z = 8.0;
export const PADDLE_Z = 6.8;

export class AegisBreakerEngine {
  public paddleX = 0;
  public paddleWidth = 2.5;
  public wideTimer = 0;
  public laserCharges = 2;

  public balls: BallItem[] = [];
  public bricks: BrickItem[] = [];
  public capsules: CapsuleItem[] = [];
  public lasers: LaserBolt[] = [];

  public score = 0;
  public lives = 3;
  public wave = 1;
  public isBallDocked = true;
  public isGameOver = false;
  public isVictory = false;
  public difficulty: 'normal' | 'overdrive' = 'normal';

  constructor(difficulty: 'normal' | 'overdrive' = 'normal') {
    this.reset(difficulty);
  }

  public reset(difficulty: 'normal' | 'overdrive' = 'normal') {
    this.difficulty = difficulty;
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.paddleX = 0;
    this.paddleWidth = 2.5;
    this.wideTimer = 0;
    this.laserCharges = 2;
    this.isGameOver = false;
    this.isVictory = false;
    this.capsules = [];
    this.lasers = [];
    this.buildWaveBricks();
    this.dockBall();
  }

  private dockBall() {
    this.isBallDocked = true;
    this.balls = [
      {
        x: this.paddleX,
        z: PADDLE_Z - 0.55,
        vx: 0,
        vz: 0,
        active: true,
      },
    ];
  }

  private buildWaveBricks() {
    this.bricks = [];
    const rows = 5;
    const cols = 7;
    const rowColors = [0xf43f5e, 0xf59e0b, 0x8b5cf6, 0x06b6d4, 0x10b981];
    let idCounter = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * 1.65;
        const z = -6.2 + r * 0.95;
        const hp = r < 2 ? 2 : 1;
        const rand = Math.random();
        const powerUp =
          rand < 0.14 ? 'multiball' : rand < 0.26 ? 'wide' : rand < 0.36 ? 'laser' : undefined;
        this.bricks.push({
          id: idCounter++,
          x,
          z,
          hp,
          maxHp: hp,
          colorHex: rowColors[r % rowColors.length],
          powerUp,
        });
      }
    }
  }

  public movePaddle(deltaX: number) {
    if (this.isGameOver) return;
    const maxOffset = BREAKER_BOUNDS_X - this.paddleWidth / 2;
    this.paddleX = Math.max(-maxOffset, Math.min(maxOffset, this.paddleX + deltaX));
    if (this.isBallDocked && this.balls[0]) {
      this.balls[0].x = this.paddleX;
    }
  }

  public setPaddleTargetX(worldX: number) {
    if (this.isGameOver) return;
    const maxOffset = BREAKER_BOUNDS_X - this.paddleWidth / 2;
    this.paddleX = Math.max(-maxOffset, Math.min(maxOffset, worldX));
    if (this.isBallDocked && this.balls[0]) {
      this.balls[0].x = this.paddleX;
    }
  }

  public launchOrFire(): 'launched' | 'laser' | 'none' {
    if (this.isGameOver) return 'none';
    if (this.isBallDocked && this.balls[0]) {
      this.isBallDocked = false;
      const baseSpeed = this.difficulty === 'overdrive' ? 11.2 : 9.2;
      this.balls[0].vx = (Math.random() - 0.5) * 3.5;
      this.balls[0].vz = -baseSpeed;
      return 'launched';
    }
    if (this.laserCharges > 0) {
      this.laserCharges--;
      this.lasers.push(
        { x: this.paddleX - this.paddleWidth * 0.35, z: PADDLE_Z - 0.4, active: true },
        { x: this.paddleX + this.paddleWidth * 0.35, z: PADDLE_Z - 0.4, active: true }
      );
      return 'laser';
    }
    return 'none';
  }

  public update(dt: number): {
    brickHits: { x: number; z: number; color: number }[];
    paddleHit: boolean;
    powerUpCollected: boolean;
    lostLife: boolean;
  } {
    const brickHits: { x: number; z: number; color: number }[] = [];
    let paddleHit = false;
    let powerUpCollected = false;
    let lostLife = false;

    if (this.isGameOver) {
      return { brickHits, paddleHit, powerUpCollected, lostLife };
    }

    if (this.wideTimer > 0) {
      this.wideTimer = Math.max(0, this.wideTimer - dt);
      this.paddleWidth = this.wideTimer > 0 ? 3.6 : 2.5;
    }

    // Update lasers
    for (const bolt of this.lasers) {
      if (!bolt.active) continue;
      bolt.z -= 16 * dt;
      if (bolt.z < -BREAKER_BOUNDS_Z) {
        bolt.active = false;
        continue;
      }
      for (const brick of this.bricks) {
        if (brick.hp > 0 && Math.abs(bolt.x - brick.x) < 0.78 && Math.abs(bolt.z - brick.z) < 0.45) {
          bolt.active = false;
          brick.hp--;
          this.score += 50;
          brickHits.push({ x: brick.x, z: brick.z, color: brick.colorHex });
          if (brick.hp <= 0 && brick.powerUp) {
            this.capsules.push({ x: brick.x, z: brick.z, type: brick.powerUp, active: true });
          }
          break;
        }
      }
    }
    this.lasers = this.lasers.filter((l) => l.active);

    // Update falling power-up capsules
    for (const cap of this.capsules) {
      if (!cap.active) continue;
      cap.z += 5.2 * dt;
      if (
        Math.abs(cap.z - PADDLE_Z) < 0.55 &&
        Math.abs(cap.x - this.paddleX) < this.paddleWidth * 0.58
      ) {
        cap.active = false;
        powerUpCollected = true;
        this.score += 120;
        if (cap.type === 'wide') {
          this.wideTimer = 12;
          this.paddleWidth = 3.6;
        } else if (cap.type === 'laser') {
          this.laserCharges += 3;
        } else if (cap.type === 'multiball') {
          const refBall = this.balls.find((b) => b.active) || {
            x: this.paddleX,
            z: PADDLE_Z - 0.6,
            vx: 3,
            vz: -9,
          };
          const launchVz = -Math.max(8.5, Math.abs(refBall.vz));
          this.balls.push(
            { x: refBall.x, z: refBall.z, vx: -4.2, vz: launchVz, active: true },
            { x: refBall.x, z: refBall.z, vx: 4.2, vz: launchVz, active: true }
          );
        }
      } else if (cap.z > BREAKER_BOUNDS_Z + 1) {
        cap.active = false;
      }
    }
    this.capsules = this.capsules.filter((c) => c.active);

    if (this.isBallDocked) {
      return { brickHits, paddleHit, powerUpCollected, lostLife };
    }

    // Update balls
    for (const ball of this.balls) {
      if (!ball.active) continue;
      ball.x += ball.vx * dt;
      ball.z += ball.vz * dt;

      // Side walls
      if (ball.x < -BREAKER_BOUNDS_X + 0.3) {
        ball.x = -BREAKER_BOUNDS_X + 0.3;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x > BREAKER_BOUNDS_X - 0.3) {
        ball.x = BREAKER_BOUNDS_X - 0.3;
        ball.vx = -Math.abs(ball.vx);
      }

      // Top wall
      if (ball.z < -BREAKER_BOUNDS_Z + 0.3) {
        ball.z = -BREAKER_BOUNDS_Z + 0.3;
        ball.vz = Math.abs(ball.vz);
      }

      // Paddle deflection
      if (
        ball.vz > 0 &&
        ball.z >= PADDLE_Z - 0.45 &&
        ball.z <= PADDLE_Z + 0.35 &&
        Math.abs(ball.x - this.paddleX) <= this.paddleWidth * 0.56
      ) {
        const rawOffset = (ball.x - this.paddleX) / (this.paddleWidth * 0.5);
        const hitOffset = Math.max(-0.78, Math.min(0.78, rawOffset));
        const speed = Math.hypot(ball.vx, ball.vz) * 1.015;
        const clampedSpeed = Math.max(9.2, Math.min(14.5, speed));
        const bounceAngle = hitOffset * (Math.PI / 3); // clamped to ~46.8 deg max
        ball.vx = Math.sin(bounceAngle) * clampedSpeed;
        ball.vz = -Math.cos(bounceAngle) * clampedSpeed;
        ball.z = PADDLE_Z - 0.46;
        paddleHit = true;
      }

      // Brick collisions
      for (const brick of this.bricks) {
        if (brick.hp <= 0) continue;
        const dx = ball.x - brick.x;
        const dz = ball.z - brick.z;
        if (Math.abs(dx) < 0.85 && Math.abs(dz) < 0.48) {
          brick.hp--;
          this.score += brick.hp <= 0 ? 75 : 35;
          brickHits.push({ x: brick.x, z: brick.z, color: brick.colorHex });
          if (Math.abs(dx) / 0.85 > Math.abs(dz) / 0.48) {
            ball.vx = -ball.vx;
            ball.x = brick.x + (dx >= 0 ? 0.86 : -0.86);
          } else {
            ball.vz = -ball.vz;
            ball.z = brick.z + (dz >= 0 ? 0.49 : -0.49);
          }
          if (brick.hp <= 0 && brick.powerUp) {
            this.capsules.push({ x: brick.x, z: brick.z, type: brick.powerUp, active: true });
          }
          break;
        }
      }

      // Guarantee minimum vertical velocity so ball can never get trapped bouncing left-to-right
      const currentSpeed = Math.max(9.0, Math.min(14.5, Math.hypot(ball.vx, ball.vz)));
      const minVz = currentSpeed * 0.38;
      if (Math.abs(ball.vz) < minVz) {
        const signZ = ball.vz === 0 ? -1 : Math.sign(ball.vz);
        ball.vz = signZ * minVz;
        const remVx = Math.sqrt(Math.max(0, currentSpeed * currentSpeed - ball.vz * ball.vz));
        ball.vx = (ball.vx >= 0 ? 1 : -1) * remVx;
      }

      // Bottom out of bounds
      if (ball.z > BREAKER_BOUNDS_Z + 0.8) {
        ball.active = false;
      }
    }

    this.balls = this.balls.filter((b) => b.active);

    if (this.balls.length === 0) {
      this.lives--;
      lostLife = true;
      if (this.lives <= 0) {
        this.isGameOver = true;
      } else {
        this.dockBall();
      }
    }

    // Check if all bricks shattered
    if (this.bricks.every((b) => b.hp <= 0)) {
      this.wave++;
      this.score += 500;
      if (this.wave > 2) {
        this.isVictory = true;
        this.isGameOver = true;
      } else {
        this.buildWaveBricks();
        this.dockBall();
      }
    }

    return { brickHits, paddleHit, powerUpCollected, lostLife };
  }
}
