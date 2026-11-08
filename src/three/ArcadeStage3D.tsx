import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ALL_GAME_IDS,
  GameConfig,
  GameId,
  LiveGameHUDState,
  ShellState,
} from '../types/arcade';
import {
  create2048MonolithAssembly,
  createAlienDroneAssembly,
  createBunkerSegmentMesh,
  createConnect4DiscAssembly,
  createContactShadowMesh,
  createCyberPacAssembly,
  createCyberPaddleAssembly,
  createDefenseCannonAssembly,
  createHubPedestalAssembly,
  createHunterDroneAssembly,
  createMothershipUfoAssembly,
  createOMarkAssembly,
  createPlasmaCoreAssembly,
  createPrismCellAssembly,
  createStarfighterAssembly,
  createViperHeadAssembly,
  createViperSegmentAssembly,
  createXMarkAssembly,
  getCachedStandardMat,
  getNumberTileTexture,
  getProceduralGridTexture,
} from './proceduralModels';
import {
  MATRIX_HEIGHT,
  MATRIX_WIDTH,
  PrismDropEngine,
  TETROMINO_DEFS,
} from '../games/tetrisEngine';
import { QuantumGridEngine } from '../games/xoEngine';
import { SNAKE_GRID_SIZE, ViperPulseEngine } from '../games/snakeEngine';
import {
  AegisBreakerEngine,
  BREAKER_BOUNDS_X,
  BREAKER_BOUNDS_Z,
  PADDLE_Z,
} from '../games/breakerEngine';
import {
  PONG_BOUNDS_X,
  PONG_BOUNDS_Z,
  PONG_OPPONENT_Z,
  PONG_PLAYER_Z,
  VectorPongEngine,
} from '../games/pongEngine';
import { C4_COLS, C4_ROWS, GravityDrop4Engine } from '../games/connect4Engine';
import { HexaPulse2048Engine } from '../games/merge2048Engine';
import { RUNNER_LANE_WIDTH, VoidRunnerEngine } from '../games/runnerEngine';
import { CyberMinesEngine, MINES_GRID_SIZE } from '../games/minesEngine';
import {
  CANNON_Z,
  NovaInvadersEngine,
  NOVA_BOUNDS_X,
} from '../games/invadersEngine';
import { CyberPacEngine, PAC_GRID_SIZE } from '../games/pacEngine';
import { soundFX } from '../services/soundAndHaptics';

export type StageAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'rotate'
  | 'drop'
  | 'boostOn'
  | 'boostOff'
  | 'undo'
  | 'special'
  | 'toggleFlag'
  | 'restart';

export interface ArcadeStageHandle {
  triggerAction: (action: StageAction) => void;
}

interface ArcadeStageProps {
  shellState: ShellState;
  selectedGame: GameId;
  config: GameConfig;
  onSelectHubGame: (game: GameId) => void;
  onHudUpdate: (hud: LiveGameHUDState) => void;
  onGameEnd: (
    outcome: 'VICTORY' | 'GAME_OVER',
    summary: {
      game: GameId;
      score: number;
      linesOrLength: number;
      level: number;
      hadQuadTetris?: boolean;
      xoWinner?: 'X' | 'O' | 'DRAW';
    }
  ) => void;
}

// Pre-allocated scratch math helpers (Zero GC in animation loop)
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.5, 0);
const _dummyObj = new THREE.Object3D();
const _particleColor = new THREE.Color();
const _targetAccentColor = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _targetFogColor = new THREE.Color();
const _targetFloorEmissive = new THREE.Color();
const _rayMouse = new THREE.Vector2();
const _floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _planeIntersect = new THREE.Vector3();

interface ParticleData {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  colorHex: number;
}

const MAX_PARTICLES = 120;

const GAME_ACCENT_HEX: Record<GameId, number> = {
  tetris: 0x06b6d4,
  xo: 0xf43f5e,
  snake: 0x10b981,
  breaker: 0x8b5cf6,
  pong: 0x38bdf8,
  connect4: 0xf59e0b,
  merge2048: 0xd946ef,
  runner: 0x22d3ee,
  mines: 0xf43f5e,
  invaders: 0x06b6d4,
  pac: 0xfacc15,
};

const GAME_ATMOSPHERE: Record<
  GameId,
  { accent: number; sky: number; fog: number; floorEmissive: number }
> = {
  tetris: { accent: 0x06b6d4, sky: 0x38bdf8, fog: 0x050b14, floorEmissive: 0x042f40 },
  xo: { accent: 0xf43f5e, sky: 0xfb7185, fog: 0x13060c, floorEmissive: 0x3b0a18 },
  snake: { accent: 0x10b981, sky: 0x34d399, fog: 0x04120e, floorEmissive: 0x052e22 },
  breaker: { accent: 0x8b5cf6, sky: 0xa78bfa, fog: 0x0b0616, floorEmissive: 0x221042 },
  pong: { accent: 0x38bdf8, sky: 0x7dd3fc, fog: 0x050c16, floorEmissive: 0x082842 },
  connect4: { accent: 0xf59e0b, sky: 0xfbbf24, fog: 0x120b04, floorEmissive: 0x382005 },
  merge2048: { accent: 0xd946ef, sky: 0xe879f9, fog: 0x120517, floorEmissive: 0x360a40 },
  runner: { accent: 0x22d3ee, sky: 0x67e8f9, fog: 0x040d14, floorEmissive: 0x063242 },
  mines: { accent: 0xf43f5e, sky: 0xfda4af, fog: 0x12060b, floorEmissive: 0x360b16 },
  invaders: { accent: 0x06b6d4, sky: 0x22d3ee, fog: 0x040a14, floorEmissive: 0x052c3e },
  pac: { accent: 0xfacc15, sky: 0xfde047, fog: 0x120e04, floorEmissive: 0x382b04 },
};

export const ArcadeStage3D = forwardRef<ArcadeStageHandle, ArcadeStageProps>(
  (
    {
      shellState,
      selectedGame,
      config,
      onSelectHubGame,
      onHudUpdate,
      onGameEnd,
    },
    ref
  ) => {
    const canvasMountRef = useRef<HTMLDivElement | null>(null);

    const stateRef = useRef({
      shellState,
      selectedGame,
      config,
      onSelectHubGame,
      onHudUpdate,
      onGameEnd,
    });
    useEffect(() => {
      stateRef.current = {
        shellState,
        selectedGame,
        config,
        onSelectHubGame,
        onHudUpdate,
        onGameEnd,
      };
    }, [shellState, selectedGame, config, onSelectHubGame, onHudUpdate, onGameEnd]);

    const actionsRef = useRef<ArcadeStageHandle['triggerAction']>(() => {});

    useImperativeHandle(ref, () => ({
      triggerAction: (action) => actionsRef.current(action),
    }));

    useEffect(() => {
      const container = canvasMountRef.current;
      if (!container) return;

      // 1. Mobile & Software WebGL Detection
      const isMobileDevice =
        window.innerWidth < 820 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

      const isSoftwareGl = (() => {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      })();

      const renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2)
      );
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = !isSoftwareGl;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07090e);
      scene.fog = new THREE.FogExp2(0x07090e, 0.019);

      // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();

      // 3. Camera
      const camera = new THREE.PerspectiveCamera(
        46,
        container.clientWidth / Math.max(1, container.clientHeight),
        0.1,
        140
      );
      camera.position.set(0, 4.2, 14.5);

      // 4. Balanced 3-Point Studio Lighting Rig
      const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x090d16, 0.85);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
      keyLight.position.set(8, 18, 12);
      keyLight.castShadow = !isSoftwareGl;
      const shadowRes = 512;
      keyLight.shadow.mapSize.set(shadowRes, shadowRes);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 50;
      const d = 16;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x06b6d4, 5.2, 34, 1.35);
      rimLight.position.set(0, 6.5, -6);
      scene.add(rimLight);

      const stageAccentLight = new THREE.PointLight(0x06b6d4, 3.0, 28, 1.5);
      stageAccentLight.position.set(-6, 8, 6);
      scene.add(stageAccentLight);

      // 5. Studio Floor with Dynamic Per-Game Emissive Grid Tint
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      const floorTex = getProceduralGridTexture(maxAniso);
      floorTex.repeat.set(44, 44);
      const floorGeo = new THREE.PlaneGeometry(110, 110);
      const floorMat = new THREE.MeshStandardMaterial({
        map: floorTex,
        color: 0xffffff,
        emissive: 0x042f40,
        emissiveIntensity: 0.32,
        roughness: 0.68,
        metalness: 0.28,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // 6. Pooled InstancedMesh Particle System
      const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
      const particleMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      });
      const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
      particleMesh.frustumCulled = false;
      particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const particles: ParticleData[] = Array.from({ length: MAX_PARTICLES }, () => ({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        scale: 1,
        colorHex: 0x06b6d4,
      }));
      for (let i = 0; i < MAX_PARTICLES; i++) {
        _dummyObj.position.set(0, -100, 0);
        _dummyObj.scale.setScalar(0.001);
        _dummyObj.updateMatrix();
        particleMesh.setMatrixAt(i, _dummyObj.matrix);
        particleMesh.setColorAt(i, _particleColor.setHex(0x06b6d4));
      }
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
      scene.add(particleMesh);

      let shakeIntensity = 0;
      let hitstopTimer = 0;

      const spawnBurst = (wx: number, wy: number, wz: number, colorHex: number, count = 16) => {
        let spawned = 0;
        for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
          if (!particles[i].active) {
            const p = particles[i];
            p.active = true;
            p.x = wx;
            p.y = wy;
            p.z = wz;
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 4.5;
            p.vx = Math.cos(angle) * speed;
            p.vy = 2.0 + Math.random() * 4.5;
            p.vz = Math.sin(angle) * speed;
            p.maxLife = 0.42 + Math.random() * 0.35;
            p.life = p.maxLife;
            p.scale = 0.7 + Math.random() * 0.9;
            p.colorHex = colorHex;
            particleMesh.setColorAt(i, _particleColor.setHex(colorHex));
            spawned++;
          }
        }
        if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
      };

      // ========================================================================
      // SCENE GROUP 0: 9-PEDESTAL ORBITAL HUB CAROUSEL
      // ========================================================================
      const hubGroup = new THREE.Group();
      scene.add(hubGroup);

      const HUB_RING_RADIUS = 7.4;
      const hubConduitMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.25,
        roughness: 0.2,
        metalness: 0.5,
      });
      const outerConduitRing = new THREE.Mesh(
        new THREE.TorusGeometry(HUB_RING_RADIUS, 0.045, 12, 64),
        hubConduitMat
      );
      outerConduitRing.rotation.x = Math.PI / 2;
      outerConduitRing.position.y = 0.04;
      const innerConduitRing = new THREE.Mesh(
        new THREE.TorusGeometry(HUB_RING_RADIUS - 1.65, 0.025, 10, 48),
        hubConduitMat
      );
      innerConduitRing.rotation.x = Math.PI / 2;
      innerConduitRing.position.y = 0.03;
      hubGroup.add(outerConduitRing, innerConduitRing);

      const hubPedestals = ALL_GAME_IDS.map((id, idx) => {
        const theta = (idx / ALL_GAME_IDS.length) * Math.PI * 2;
        const x = Math.sin(theta) * HUB_RING_RADIUS;
        const z = Math.cos(theta) * HUB_RING_RADIUS;
        const accent = GAME_ACCENT_HEX[id];
        const built = createHubPedestalAssembly(accent, id);
        built.root.position.set(x, 0, z);
        built.root.rotation.y = theta;
        built.root.userData = { hubGameId: id };
        hubGroup.add(built.root);
        return { id, theta, x, z, accent, ...built };
      });

      // ========================================================================
      // GAME 1: PRISM DROP (3D TETRIS)
      // ========================================================================
      const tetrisGroup = new THREE.Group();
      tetrisGroup.visible = false;
      scene.add(tetrisGroup);

      const tetrisEngine = new PrismDropEngine(1);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x162032,
        roughness: 0.25,
        metalness: 0.88,
      });
      const neonStripMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      });

      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 20.6, 1.25), frameMat);
      leftPillar.position.set(-5.25, 10.4, 0);
      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 20.6, 1.25), frameMat);
      rightPillar.position.set(5.25, 10.4, 0);
      const bottomBase = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.5, 1.45), frameMat);
      bottomBase.position.set(0, 0.25, 0);
      const leftNeon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 20.4, 1.32), neonStripMat);
      leftNeon.position.set(-4.98, 10.4, 0);
      const rightNeon = new THREE.Mesh(new THREE.BoxGeometry(0.08, 20.4, 1.32), neonStripMat);
      rightNeon.position.set(4.98, 10.4, 0);

      const backPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 20),
        new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.82 })
      );
      backPanel.position.set(0, 10.5, -0.55);
      const gridHelper = new THREE.GridHelper(20, 20, 0x1e293b, 0x1e293b);
      gridHelper.rotation.x = Math.PI / 2;
      gridHelper.scale.x = 0.5;
      gridHelper.position.set(0, 10.5, -0.52);

      tetrisGroup.add(leftPillar, rightPillar, bottomBase, leftNeon, rightNeon, backPanel, gridHelper);

      const tetrisLockedGroup = new THREE.Group();
      tetrisGroup.add(tetrisLockedGroup);

      const activeTetrominoMeshes: THREE.Group[] = Array.from({ length: 4 }, () => {
        const g = createPrismCellAssembly(0x06b6d4, false);
        tetrisGroup.add(g);
        return g;
      });
      const ghostTetrominoMeshes: THREE.Group[] = Array.from({ length: 4 }, () => {
        const g = createPrismCellAssembly(0x06b6d4, true);
        tetrisGroup.add(g);
        return g;
      });

      let tetrisBoardDirty = true;
      let lastActiveColor = -1;
      let lastActiveX = -999;
      let lastActiveY = -999;
      let lastActiveRot = -999;
      let lastShowGhost = false;

      const rebuildTetrisVisuals = () => {
        const currentColor = TETROMINO_DEFS[tetrisEngine.activeType].color;
        const colorChanged = currentColor !== lastActiveColor;
        if (colorChanged) {
          lastActiveColor = currentColor;
          activeTetrominoMeshes.forEach((m, idx) => {
            tetrisGroup.remove(m);
            const nextM = createPrismCellAssembly(currentColor, false);
            activeTetrominoMeshes[idx] = nextM;
            tetrisGroup.add(nextM);
          });
          ghostTetrominoMeshes.forEach((m, idx) => {
            tetrisGroup.remove(m);
            const nextG = createPrismCellAssembly(currentColor, true);
            ghostTetrominoMeshes[idx] = nextG;
            tetrisGroup.add(nextG);
          });
        }

        const ghostPref = stateRef.current.config.tetris.ghostPiece;
        const poseChanged =
          colorChanged ||
          tetrisBoardDirty ||
          tetrisEngine.activeX !== lastActiveX ||
          tetrisEngine.activeY !== lastActiveY ||
          tetrisEngine.activeRot !== lastActiveRot ||
          ghostPref !== lastShowGhost;

        if (poseChanged) {
          lastActiveX = tetrisEngine.activeX;
          lastActiveY = tetrisEngine.activeY;
          lastActiveRot = tetrisEngine.activeRot;
          lastShowGhost = ghostPref;

          const activeCells = tetrisEngine.getCells(
            tetrisEngine.activeX,
            tetrisEngine.activeY,
            tetrisEngine.activeRot
          );
          const ghostY = tetrisEngine.getGhostY();
          const ghostCells = tetrisEngine.getCells(
            tetrisEngine.activeX,
            ghostY,
            tetrisEngine.activeRot
          );
          const showGhost = ghostPref && ghostY !== tetrisEngine.activeY;

          for (let i = 0; i < 4; i++) {
            const [ax, ay] = activeCells[i];
            activeTetrominoMeshes[i].visible = !tetrisEngine.isGameOver;
            activeTetrominoMeshes[i].position.set(ax - 4.5, ay + 1.0, 0);

            const [gx, gy] = ghostCells[i];
            ghostTetrominoMeshes[i].visible = showGhost && !tetrisEngine.isGameOver;
            ghostTetrominoMeshes[i].position.set(gx - 4.5, gy + 1.0, 0);
          }
        }

        if (tetrisBoardDirty) {
          tetrisBoardDirty = false;
          while (tetrisLockedGroup.children.length > 0) {
            tetrisLockedGroup.remove(tetrisLockedGroup.children[0]);
          }
          for (let r = 0; r < MATRIX_HEIGHT; r++) {
            for (let c = 0; c < MATRIX_WIDTH; c++) {
              const cellColor = tetrisEngine.board[r][c];
              if (cellColor !== null) {
                const cellMesh = createPrismCellAssembly(cellColor, false);
                cellMesh.position.set(c - 4.5, r + 1.0, 0);
                tetrisLockedGroup.add(cellMesh);
              }
            }
          }
        }
      };

      // ========================================================================
      // GAME 2: QUANTUM GRID (3D X-O)
      // ========================================================================
      const xoGroup = new THREE.Group();
      xoGroup.visible = false;
      scene.add(xoGroup);

      const xoEngine = new QuantumGridEngine(3, 'ai', 'unbeatable');
      const xoBoardRoot = new THREE.Group();
      xoGroup.add(xoBoardRoot);

      const xoInteractiveTiles: THREE.Mesh[] = [];
      const xoPlacedMarks: { mesh: THREE.Group; targetScale: number }[] = [];
      let xoWinBeamMesh: THREE.Mesh | null = null;
      let aiMoveTimeout: number | null = null;

      const getXoCellWorldPos = (index: number, gridSize: number) => {
        const cellSize = gridSize === 3 ? 2.15 : gridSize === 4 ? 1.68 : 1.38;
        const r = Math.floor(index / gridSize);
        const c = index % gridSize;
        const half = (gridSize - 1) / 2;
        return { x: (c - half) * cellSize, z: (r - half) * cellSize, cellSize };
      };

      const rebuildXoBoardGeometry = () => {
        while (xoBoardRoot.children.length > 0) {
          xoBoardRoot.remove(xoBoardRoot.children[0]);
        }
        xoInteractiveTiles.length = 0;
        xoPlacedMarks.length = 0;
        xoWinBeamMesh = null;

        const n = xoEngine.gridSize;
        const cellSize = n === 3 ? 2.15 : n === 4 ? 1.68 : 1.38;
        const boardSpan = n * cellSize + 0.65;

        const baseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(boardSpan, 0.34, boardSpan),
          frameMat
        );
        baseMesh.position.y = 0.17;
        baseMesh.receiveShadow = true;
        xoBoardRoot.add(baseMesh, createContactShadowMesh(boardSpan * 0.68, 0.65));

        const barMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.95,
          roughness: 0.2,
          metalness: 0.5,
        });
        const half = (n - 1) / 2;
        for (let i = 1; i < n; i++) {
          const offset = (i - 0.5 - half) * cellSize;
          const vBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.12, n * cellSize - 0.1),
            barMat
          );
          vBar.position.set(offset, 0.36, 0);
          const hBar = new THREE.Mesh(
            new THREE.BoxGeometry(n * cellSize - 0.1, 0.12, 0.08),
            barMat
          );
          hBar.position.set(0, 0.36, offset);
          xoBoardRoot.add(vBar, hBar);
        }

        const padGeo = new THREE.BoxGeometry(cellSize * 0.86, 0.08, cellSize * 0.86);
        for (let idx = 0; idx < n * n; idx++) {
          const { x, z } = getXoCellWorldPos(idx, n);
          const pad = new THREE.Mesh(
            padGeo,
            new THREE.MeshStandardMaterial({ color: 0x162136, roughness: 0.4, metalness: 0.65 })
          );
          pad.position.set(x, 0.36, z);
          pad.userData = { xoCellIndex: idx };
          xoInteractiveTiles.push(pad);
          xoBoardRoot.add(pad);
        }

        const markScale = n === 3 ? 1.0 : n === 4 ? 0.78 : 0.64;
        xoEngine.board.forEach((val, idx) => {
          if (val) {
            const { x, z } = getXoCellWorldPos(idx, n);
            const mesh = val === 'X' ? createXMarkAssembly() : createOMarkAssembly();
            mesh.position.set(x, 0.38, z);
            mesh.scale.setScalar(markScale);
            xoBoardRoot.add(mesh);
            xoPlacedMarks.push({ mesh, targetScale: markScale });
          }
        });
      };

      const addXoMarkVisual = (index: number, mark: 'X' | 'O') => {
        const n = xoEngine.gridSize;
        const { x, z } = getXoCellWorldPos(index, n);
        const markScale = n === 3 ? 1.0 : n === 4 ? 0.78 : 0.64;
        const mesh = mark === 'X' ? createXMarkAssembly() : createOMarkAssembly();
        mesh.position.set(x, 1.35, z);
        mesh.scale.setScalar(0.05);
        xoBoardRoot.add(mesh);
        xoPlacedMarks.push({ mesh, targetScale: markScale });
        spawnBurst(x, 0.6, z, mark === 'X' ? 0x06b6d4 : 0xf43f5e, 16);
      };

      const drawXoWinningLaser = (lineIndices: number[]) => {
        if (lineIndices.length < 2) return;
        const n = xoEngine.gridSize;
        const first = getXoCellWorldPos(lineIndices[0], n);
        const last = getXoCellWorldPos(lineIndices[lineIndices.length - 1], n);
        const dx = last.x - first.x;
        const dz = last.z - first.z;
        const len = Math.hypot(dx, dz) + first.cellSize * 0.65;
        const midX = (first.x + last.x) / 2;
        const midZ = (first.z + last.z) / 2;
        const angle = Math.atan2(dx, dz);

        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, len, 16),
          new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x34d399,
            emissiveIntensity: 2.0,
            roughness: 0.1,
          })
        );
        beam.rotation.x = Math.PI / 2;
        beam.rotation.z = -angle;
        beam.position.set(midX, 0.68, midZ);
        xoWinBeamMesh = beam;
        xoBoardRoot.add(beam);
      };

      // ========================================================================
      // GAME 3: VIPER PULSE (3D CYBER SNAKE)
      // ========================================================================
      const snakeGroup = new THREE.Group();
      snakeGroup.visible = false;
      scene.add(snakeGroup);

      const snakeEngine = new ViperPulseEngine('normal', false);
      const halfArena = SNAKE_GRID_SIZE / 2 + 0.35;
      const wallGlowRefs: THREE.Mesh[] = [];
      const wallGlowMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.0,
        roughness: 0.2,
      });
      [
        { x: 0, z: -halfArena, w: SNAKE_GRID_SIZE + 1.0, d: 0.45 },
        { x: 0, z: halfArena, w: SNAKE_GRID_SIZE + 1.0, d: 0.45 },
        { x: -halfArena, z: 0, w: 0.45, d: SNAKE_GRID_SIZE + 1.0 },
        { x: halfArena, z: 0, w: 0.45, d: SNAKE_GRID_SIZE + 1.0 },
      ].forEach((wc) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(wc.w, 0.55, wc.d), frameMat);
        wall.position.set(wc.x, 0.275, wc.z);
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(wc.w * 0.98, 0.08, wc.d * 0.98),
          wallGlowMat
        );
        strip.position.set(wc.x, 0.57, wc.z);
        wallGlowRefs.push(strip);
        snakeGroup.add(wall, strip);
      });

      const snakeHeadMesh = createViperHeadAssembly();
      snakeGroup.add(snakeHeadMesh);

      const snakeSegmentsPool: THREE.Group[] = [];
      const MAX_SNAKE_SEGMENTS = 90;
      for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
        const seg = createViperSegmentAssembly();
        seg.visible = false;
        snakeSegmentsPool.push(seg);
        snakeGroup.add(seg);
      }

      const plasmaCoreMesh = createPlasmaCoreAssembly();
      snakeGroup.add(plasmaCoreMesh);

      // ========================================================================
      // GAME 4: AEGIS BREAKER (3D BRICK BREAKER)
      // ========================================================================
      const breakerGroup = new THREE.Group();
      breakerGroup.visible = false;
      scene.add(breakerGroup);

      const breakerEngine = new AegisBreakerEngine('normal');
      const breakerBricksRoot = new THREE.Group();
      const breakerDynamicRoot = new THREE.Group();
      breakerGroup.add(breakerBricksRoot, breakerDynamicRoot);

      // Arena perimeter walls
      [
        { x: -BREAKER_BOUNDS_X - 0.25, z: 0, w: 0.4, d: BREAKER_BOUNDS_Z * 2 },
        { x: BREAKER_BOUNDS_X + 0.25, z: 0, w: 0.4, d: BREAKER_BOUNDS_Z * 2 },
        { x: 0, z: -BREAKER_BOUNDS_Z - 0.25, w: BREAKER_BOUNDS_X * 2 + 0.9, d: 0.4 },
      ].forEach((w) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, 0.6, w.d), frameMat);
        m.position.set(w.x, 0.3, w.z);
        breakerGroup.add(m);
      });

      const breakerPaddleMesh = createCyberPaddleAssembly(0x8b5cf6);
      breakerGroup.add(breakerPaddleMesh);

      // Pooled Breaker Balls, PowerUp Capsules, and Laser Bolts (Zero Per-Frame Allocations)
      const sharedBallGeo = new THREE.SphereGeometry(0.28, 12, 12);
      const sharedBallMat = getCachedStandardMat('breaker_ball_mat', {
        color: 0x06b6d4,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.8,
      });
      const breakerBallPool: THREE.Mesh[] = Array.from({ length: 10 }, () => {
        const m = new THREE.Mesh(sharedBallGeo, sharedBallMat);
        m.visible = false;
        breakerDynamicRoot.add(m);
        return m;
      });

      const sharedCapGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10);
      const breakerCapsulePool: THREE.Mesh[] = Array.from({ length: 8 }, () => {
        const m = new THREE.Mesh(
          sharedCapGeo,
          getCachedStandardMat('cap_0xf59e0b', {
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 1.4,
          })
        );
        m.rotation.z = Math.PI / 2;
        m.visible = false;
        breakerDynamicRoot.add(m);
        return m;
      });

      const sharedLaserGeo = new THREE.BoxGeometry(0.14, 0.14, 0.65);
      const playerLaserMat = getCachedStandardMat('player_laser_cyan', {
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 2.2,
      });
      const enemyLaserMat = getCachedStandardMat('enemy_laser_rose', {
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 2.2,
      });

      const breakerLaserPool: THREE.Mesh[] = Array.from({ length: 16 }, () => {
        const m = new THREE.Mesh(sharedLaserGeo, playerLaserMat);
        m.visible = false;
        breakerDynamicRoot.add(m);
        return m;
      });

      const rebuildBreakerBricks = () => {
        while (breakerBricksRoot.children.length > 0) {
          breakerBricksRoot.remove(breakerBricksRoot.children[0]);
        }
        breakerEngine.bricks.forEach((b) => {
          if (b.hp > 0) {
            const cell = createPrismCellAssembly(b.colorHex, false);
            cell.scale.set(1.45, 0.55, 0.72);
            cell.position.set(b.x, 0.35 + (b.hp - 1) * 0.2, b.z);
            breakerBricksRoot.add(cell);
          }
        });
      };

      // ========================================================================
      // GAME 5: VECTOR PONG: OVERDRIVE (3D AIR HOCKEY / PONG)
      // ========================================================================
      const pongGroup = new THREE.Group();
      pongGroup.visible = false;
      scene.add(pongGroup);

      const pongEngine = new VectorPongEngine('ai', 'tactical', 5);
      [
        { x: -PONG_BOUNDS_X - 0.25, z: 0, w: 0.4, d: PONG_BOUNDS_Z * 2 },
        { x: PONG_BOUNDS_X + 0.25, z: 0, w: 0.4, d: PONG_BOUNDS_Z * 2 },
      ].forEach((w) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, 0.55, w.d), frameMat);
        m.position.set(w.x, 0.28, w.z);
        pongGroup.add(m);
      });

      const pongPlayerPaddle = createCyberPaddleAssembly(0x06b6d4);
      pongPlayerPaddle.position.z = PONG_PLAYER_Z;
      const pongOpponentPaddle = createCyberPaddleAssembly(0xf43f5e);
      pongOpponentPaddle.position.z = PONG_OPPONENT_Z;
      const pongPuckMesh = createPlasmaCoreAssembly();
      const pongGateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.12, 0.22),
        getCachedStandardMat('pong_gate_gold', {
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.5,
        })
      );
      pongGateMesh.position.y = 0.08;
      const pongGoalLineMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.35,
      });
      const pongTopLine = new THREE.Mesh(
        new THREE.BoxGeometry(PONG_BOUNDS_X * 2, 0.06, 0.08),
        pongGoalLineMat
      );
      pongTopLine.position.set(0, 0.05, -PONG_BOUNDS_Z);
      const pongBottomLine = new THREE.Mesh(
        new THREE.BoxGeometry(PONG_BOUNDS_X * 2, 0.06, 0.08),
        pongGoalLineMat
      );
      pongBottomLine.position.set(0, 0.05, PONG_BOUNDS_Z);
      pongGroup.add(
        pongPlayerPaddle,
        pongOpponentPaddle,
        pongPuckMesh,
        pongGateMesh,
        pongTopLine,
        pongBottomLine
      );

      // ========================================================================
      // GAME 6: GRAVITY DROP 4 (3D CONNECT FOUR)
      // ========================================================================
      const connect4Group = new THREE.Group();
      connect4Group.visible = false;
      scene.add(connect4Group);

      const connect4Engine = new GravityDrop4Engine('ai', 'tactical', false);
      const c4DiscsRoot = new THREE.Group();
      connect4Group.add(c4DiscsRoot);
      const c4HitColumns: THREE.Mesh[] = [];

      // Build vertical rack pillars & column hit targets
      const c4Width = C4_COLS * 1.15;
      const c4Height = C4_ROWS * 1.15;
      const c4Base = new THREE.Mesh(new THREE.BoxGeometry(c4Width + 1.0, 0.45, 1.4), frameMat);
      c4Base.position.set(0, 0.225, 0);
      connect4Group.add(c4Base);

      for (let c = 0; c <= C4_COLS; c++) {
        const px = (c - C4_COLS / 2) * 1.15;
        const divider = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, c4Height + 0.4, 0.45),
          neonStripMat
        );
        divider.position.set(px, c4Height / 2 + 0.45, 0);
        connect4Group.add(divider);
      }

      for (let c = 0; c < C4_COLS; c++) {
        const cx = (c - (C4_COLS - 1) / 2) * 1.15;
        const hitCol = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, c4Height + 1.5, 0.8),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
        );
        hitCol.position.set(cx, c4Height / 2 + 0.6, 0);
        hitCol.userData = { c4Col: c };
        c4HitColumns.push(hitCol);
        connect4Group.add(hitCol);
      }

      const c4PreviewDisc = createConnect4DiscAssembly(1);
      connect4Group.add(c4PreviewDisc);

      const rebuildConnect4Discs = () => {
        while (c4DiscsRoot.children.length > 0) {
          c4DiscsRoot.remove(c4DiscsRoot.children[0]);
        }
        for (let c = 0; c < C4_COLS; c++) {
          for (let r = 0; r < C4_ROWS; r++) {
            const val = connect4Engine.grid[c][r];
            if (val) {
              const disc = createConnect4DiscAssembly(val);
              disc.position.set((c - (C4_COLS - 1) / 2) * 1.15, 0.95 + r * 1.15, 0);
              c4DiscsRoot.add(disc);
            }
          }
        }
        if (connect4Engine.result.cells.length === 4) {
          const first = connect4Engine.result.cells[0];
          const last = connect4Engine.result.cells[3];
          const x1 = (first[0] - 3) * 1.15;
          const y1 = 0.95 + first[1] * 1.15;
          const x2 = (last[0] - 3) * 1.15;
          const y2 = 0.95 + last[1] * 1.15;
          const len = Math.hypot(x2 - x1, y2 - y1) + 0.8;
          const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, len, 12),
            getCachedStandardMat('win_beam_emerald', {
              color: 0x10b981,
              emissive: 0x34d399,
              emissiveIntensity: 2.0,
            })
          );
          beam.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0.25);
          beam.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
          c4DiscsRoot.add(beam);
        }
      };

      // ========================================================================
      // GAME 7: HEXA PULSE 2048 (3D SKYSCRAPER MERGER)
      // ========================================================================
      const merge2048Group = new THREE.Group();
      merge2048Group.visible = false;
      scene.add(merge2048Group);

      const merge2048Engine = new HexaPulse2048Engine();
      const mergeBoardBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.34, 7.6), frameMat);
      mergeBoardBase.position.y = 0.17;
      merge2048Group.add(mergeBoardBase, createContactShadowMesh(5.2, 0.65));

      const mergeTilesRoot = new THREE.Group();
      merge2048Group.add(mergeTilesRoot);

      const sharedMergeSlotGeo = new THREE.BoxGeometry(1.5, 0.05, 1.5);
      const sharedMergeSlotMat = getCachedStandardMat('merge_slot_mat', {
        color: 0x0b111e,
        roughness: 0.6,
      });

      const rebuildMerge2048Visuals = () => {
        while (mergeTilesRoot.children.length > 0) {
          mergeTilesRoot.remove(mergeTilesRoot.children[0]);
        }
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            const val = merge2048Engine.grid[r][c];
            const x = (c - 1.5) * 1.75;
            const z = (r - 1.5) * 1.75;
            if (val > 0) {
              const monolith = create2048MonolithAssembly(val);
              monolith.position.set(x, 0.34, z);
              mergeTilesRoot.add(monolith);
            } else {
              const slot = new THREE.Mesh(sharedMergeSlotGeo, sharedMergeSlotMat);
              slot.position.set(x, 0.35, z);
              mergeTilesRoot.add(slot);
            }
          }
        }
      };

      // ========================================================================
      // GAME 8: VOID RUNNER (3D ENDLESS STARFIGHTER)
      // ========================================================================
      const runnerGroup = new THREE.Group();
      runnerGroup.visible = false;
      scene.add(runnerGroup);

      const runnerEngine = new VoidRunnerEngine('normal');
      const runnerShipMesh = createStarfighterAssembly();
      runnerShipMesh.position.z = 4.5;
      const runnerObstaclesRoot = new THREE.Group();
      runnerGroup.add(runnerShipMesh, runnerObstaclesRoot);

      // Pooled Void Runner Obstacles (Zero Per-Frame Allocations)
      const sharedRunnerRingGeo = new THREE.TorusGeometry(0.75, 0.09, 10, 20);
      const sharedRunnerRingMat = getCachedStandardMat('runner_ring_mat', {
        color: 0x06b6d4,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.6,
      });
      const runnerRingPool: THREE.Mesh[] = Array.from({ length: 14 }, () => {
        const m = new THREE.Mesh(sharedRunnerRingGeo, sharedRunnerRingMat);
        m.visible = false;
        runnerObstaclesRoot.add(m);
        return m;
      });

      const sharedRunnerBarGeo = new THREE.BoxGeometry(2.2, 0.75, 0.45);
      const sharedRunnerBarMat = getCachedStandardMat('runner_bar_mat', {
        color: 0xf97316,
        emissive: 0xf97316,
        emissiveIntensity: 1.2,
      });
      const runnerBarrierPool: THREE.Mesh[] = Array.from({ length: 14 }, () => {
        const m = new THREE.Mesh(sharedRunnerBarGeo, sharedRunnerBarMat);
        m.visible = false;
        runnerObstaclesRoot.add(m);
        return m;
      });

      const sharedRunnerPillarGeo = new THREE.BoxGeometry(1.4, 2.8, 0.8);
      const sharedRunnerPillarMat = getCachedStandardMat('runner_pillar_mat', {
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.1,
      });
      const runnerPillarPool: THREE.Mesh[] = Array.from({ length: 14 }, () => {
        const m = new THREE.Mesh(sharedRunnerPillarGeo, sharedRunnerPillarMat);
        m.visible = false;
        runnerObstaclesRoot.add(m);
        return m;
      });

      // 3 Lane Neon Rails
      [-1.5, -0.5, 0.5, 1.5].forEach((laneEdge) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.08, 68),
          neonStripMat
        );
        rail.position.set(laneEdge * RUNNER_LANE_WIDTH, 0.05, -20);
        runnerGroup.add(rail);
      });

      // ========================================================================
      // GAME 9: CYBER MINES: SECTOR ZERO (3D TACTICAL MINESWEEPER)
      // ========================================================================
      const minesGroup = new THREE.Group();
      minesGroup.visible = false;
      scene.add(minesGroup);

      const minesEngine = new CyberMinesEngine('standard');
      const minesBase = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.32, 9.6), frameMat);
      minesBase.position.y = 0.16;
      minesGroup.add(minesBase, createContactShadowMesh(6.2, 0.65));

      const minesCellsRoot = new THREE.Group();
      minesGroup.add(minesCellsRoot);
      const minesInteractiveMeshes: THREE.Mesh[] = [];

      const sharedVaultGeo = new THREE.BoxGeometry(1.12, 0.32, 1.12);
      const sharedBeaconGeo = new THREE.ConeGeometry(0.28, 0.65, 6);
      const sharedMineCoreGeo = new THREE.OctahedronGeometry(0.42, 1);
      const sharedMinePadGeo = new THREE.BoxGeometry(1.1, 0.08, 1.1);
      const sharedMineLabelGeo = new THREE.PlaneGeometry(0.95, 0.95);

      const rebuildMinesVisuals = () => {
        while (minesCellsRoot.children.length > 0) {
          minesCellsRoot.remove(minesCellsRoot.children[0]);
        }
        minesInteractiveMeshes.length = 0;

        const half = (MINES_GRID_SIZE - 1) / 2;
        const spacing = 1.26;
        const numColors = ['#07090E', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E', '#EC4899'];

        minesEngine.cells.forEach((cell) => {
          const x = (cell.col - half) * spacing;
          const z = (cell.row - half) * spacing;

          if (!cell.isRevealed) {
            const vaultMat = getCachedStandardMat(
              cell.isFlagged ? 'mines_vault_flagged' : 'mines_vault_unflagged',
              {
                color: cell.isFlagged ? 0x3b0764 : 0x1e293b,
                roughness: 0.3,
                metalness: 0.82,
              }
            );
            const vault = new THREE.Mesh(sharedVaultGeo, vaultMat);
            vault.position.set(x, 0.48, z);
            vault.castShadow = true;
            vault.userData = { mineCellIndex: cell.index };
            minesInteractiveMeshes.push(vault);
            minesCellsRoot.add(vault);

            if (cell.isFlagged) {
              const beacon = new THREE.Mesh(
                sharedBeaconGeo,
                getCachedStandardMat('mines_beacon_mat', {
                  color: 0xf43f5e,
                  emissive: 0xf43f5e,
                  emissiveIntensity: 1.5,
                })
              );
              beacon.position.set(x, 0.95, z);
              minesCellsRoot.add(beacon);
            }
          } else if (cell.isMine) {
            const mineCore = new THREE.Mesh(
              sharedMineCoreGeo,
              getCachedStandardMat('mines_core_mat', {
                color: 0xf43f5e,
                emissive: 0xff1144,
                emissiveIntensity: 2.0,
              })
            );
            mineCore.position.set(x, 0.58, z);
            minesCellsRoot.add(mineCore);
          } else {
            const floorPad = new THREE.Mesh(
              sharedMinePadGeo,
              getCachedStandardMat('mines_floor_pad', { color: 0x090d16, roughness: 0.5 })
            );
            floorPad.position.set(x, 0.35, z);
            floorPad.userData = { mineCellIndex: cell.index };
            minesInteractiveMeshes.push(floorPad);
            minesCellsRoot.add(floorPad);

            if (cell.neighborMines > 0) {
              const colStr = numColors[cell.neighborMines] || '#F43F5E';
              const tex = getNumberTileTexture(String(cell.neighborMines), '#0F172A', colStr);
              const labelPlane = new THREE.Mesh(
                sharedMineLabelGeo,
                new THREE.MeshBasicMaterial({ map: tex })
              );
              labelPlane.rotation.x = -Math.PI / 2;
              labelPlane.position.set(x, 0.4, z);
              minesCellsRoot.add(labelPlane);
            }
          }
        });
      };

      // ========================================================================
      // GAME 10: NOVA INVADERS: AEGIS DESCENT (3D SPACE INVADERS)
      // ========================================================================
      const invadersGroup = new THREE.Group();
      invadersGroup.visible = false;
      scene.add(invadersGroup);

      const invadersEngine = new NovaInvadersEngine();

      // Playfield Base & Holographic Defense Grid
      const invadersBase = new THREE.Mesh(
        new THREE.BoxGeometry(NOVA_BOUNDS_X * 2 + 1.2, 0.28, 19.2),
        frameMat
      );
      invadersBase.position.set(0, 0.14, -0.6);
      invadersGroup.add(invadersBase, createContactShadowMesh(7.2, 0.65));

      // Side Guard Rails & Energy Thresholds
      [-NOVA_BOUNDS_X - 0.35, NOVA_BOUNDS_X + 0.35].forEach((rx) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.24, 19.2),
          neonStripMat
        );
        rail.position.set(rx, 0.3, -0.6);
        invadersGroup.add(rail);
      });

      // Breach Alert Perimeter Strip
      const breachLine = new THREE.Mesh(
        new THREE.BoxGeometry(NOVA_BOUNDS_X * 2, 0.04, 0.08),
        getCachedStandardMat('invaders_breach_strip', {
          color: 0xf43f5e,
          emissive: 0xf43f5e,
          emissiveIntensity: 0.9,
        })
      );
      breachLine.position.set(0, 0.29, 4.3);
      invadersGroup.add(breachLine);

      // Defense Cannon Assembly
      const invadersCannonMesh = createDefenseCannonAssembly();
      invadersCannonMesh.position.set(0, 0, CANNON_Z);
      invadersGroup.add(invadersCannonMesh);

      // Pooled Alien Drone Hive (32 fixed drones, ZERO per-frame allocations!)
      const invadersAliensRoot = new THREE.Group();
      invadersGroup.add(invadersAliensRoot);
      const invadersAlienPool: THREE.Group[] = invadersEngine.aliens.map((alien) => {
        const drone = createAlienDroneAssembly(alien.colorHex, alien.row);
        drone.position.set(alien.x, 0.42, alien.z);
        invadersAliensRoot.add(drone);
        return drone;
      });

      // Destructible Crystal Bunkers Root
      const invadersBunkersRoot = new THREE.Group();
      invadersGroup.add(invadersBunkersRoot);

      // Pooled Lasers and Plasma Projectiles (24 fixed meshes, ZERO per-frame allocations!)
      const invadersBulletsRoot = new THREE.Group();
      invadersGroup.add(invadersBulletsRoot);
      const invadersBulletPool: THREE.Mesh[] = Array.from({ length: 24 }, () => {
        const bMesh = new THREE.Mesh(sharedLaserGeo, playerLaserMat);
        bMesh.visible = false;
        invadersBulletsRoot.add(bMesh);
        return bMesh;
      });

      // Mystery Mothership UFO Assembly
      const invadersUfoMesh = createMothershipUfoAssembly();
      invadersUfoMesh.position.set(0, 0.65, -8.6);
      invadersUfoMesh.visible = false;
      invadersGroup.add(invadersUfoMesh);

      const rebuildInvadersBunkersVisuals = () => {
        while (invadersBunkersRoot.children.length > 0) {
          invadersBunkersRoot.remove(invadersBunkersRoot.children[0]);
        }
        invadersEngine.bunkers.forEach((bunker) => {
          bunker.segments.forEach((seg, sIdx) => {
            if (!seg.alive) return;
            const segMesh = createBunkerSegmentMesh(seg.hp);
            segMesh.position.set(bunker.x + seg.offsetX, 0.42, bunker.z + seg.offsetZ);
            segMesh.userData = { bunkerId: bunker.id, segmentIndex: sIdx };
            invadersBunkersRoot.add(segMesh);
          });
        });
      };

      // ========================================================================
      // GAME 11: CYBER PAC: NEON LABYRINTH (3D MAZE CHASER)
      // ========================================================================
      const pacGroup = new THREE.Group();
      pacGroup.visible = false;
      scene.add(pacGroup);

      const pacEngine = new CyberPacEngine();
      const pacHalf = (PAC_GRID_SIZE - 1) / 2;

      const pacFloor = new THREE.Mesh(
        new THREE.BoxGeometry(PAC_GRID_SIZE + 0.8, 0.28, PAC_GRID_SIZE + 0.8),
        frameMat
      );
      pacFloor.position.set(0, -0.14, 0);
      pacFloor.receiveShadow = true;
      pacGroup.add(pacFloor, createContactShadowMesh(8.2, 0.65));

      const pacWallGeo = new THREE.BoxGeometry(0.94, 0.62, 0.94);
      const pacWallBaseMat = getCachedStandardMat('pac_wall_base', {
        color: 0x0f172a,
        roughness: 0.28,
        metalness: 0.86,
      });
      const pacWallCapGeo = new THREE.BoxGeometry(0.84, 0.1, 0.84);
      const pacWallCapMat = getCachedStandardMat('pac_wall_cap', {
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      });
      const pacGateGeo = new THREE.BoxGeometry(0.92, 0.16, 0.22);
      const pacGateMat = getCachedStandardMat('pac_gate_mat', {
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 1.3,
      });

      const pacPelletGeo = new THREE.SphereGeometry(0.13, 10, 10);
      const pacPelletMat = getCachedStandardMat('pac_pellet_mat', {
        color: 0x67e8f9,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.5,
        roughness: 0.15,
      });

      const pacPelletGrid: (THREE.Object3D | null)[][] = Array.from({ length: PAC_GRID_SIZE }, () =>
        Array(PAC_GRID_SIZE).fill(null)
      );
      const pacPowerCores: THREE.Object3D[] = [];

      // Build static Maze Walls & Pre-allocated Pellet/Power-Core Pool (Zero Runtime Allocations)
      for (let r = 0; r < PAC_GRID_SIZE; r++) {
        for (let c = 0; c < PAC_GRID_SIZE; c++) {
          const cell = pacEngine.grid[r][c];
          const wx = (c - pacHalf) * 1.0;
          const wz = (r - pacHalf) * 1.0;

          if (cell === 1) {
            const wall = new THREE.Mesh(pacWallGeo, pacWallBaseMat);
            wall.position.set(wx, 0.31, wz);
            wall.castShadow = true;
            wall.receiveShadow = true;
            const cap = new THREE.Mesh(pacWallCapGeo, pacWallCapMat);
            cap.position.set(wx, 0.63, wz);
            pacGroup.add(wall, cap);
          } else if (cell === 5) {
            const gate = new THREE.Mesh(pacGateGeo, pacGateMat);
            gate.position.set(wx, 0.32, wz);
            pacGroup.add(gate);
          } else if (cell === 2) {
            const pellet = new THREE.Mesh(pacPelletGeo, pacPelletMat);
            pellet.position.set(wx, 0.34, wz);
            pacGroup.add(pellet);
            pacPelletGrid[r][c] = pellet;
          } else if (cell === 3) {
            const powerCore = createPlasmaCoreAssembly();
            powerCore.scale.setScalar(0.76);
            powerCore.position.set(wx, 0.05, wz);
            pacGroup.add(powerCore);
            pacPelletGrid[r][c] = powerCore;
            pacPowerCores.push(powerCore);
          }
        }
      }

      const pacActor = createCyberPacAssembly();
      pacGroup.add(pacActor.group);

      const pacGhostActors = pacEngine.ghosts.map((g) => {
        const built = createHunterDroneAssembly(g.colorHex);
        pacGroup.add(built.group);
        return built;
      });

      const syncPacPelletsVisuals = () => {
        for (let r = 0; r < PAC_GRID_SIZE; r++) {
          for (let c = 0; c < PAC_GRID_SIZE; c++) {
            const mesh = pacPelletGrid[r][c];
            if (mesh) {
              const cell = pacEngine.grid[r][c];
              mesh.visible = cell === 2 || cell === 3;
            }
          }
        }
      };

      // ========================================================================
      // HUD SYNCHRONIZATION & GAME LIFECYCLE HELPERS
      // ========================================================================
      const emitHudState = (isAiThinking = false) => {
        const { selectedGame: g } = stateRef.current;
        if (g === 'tetris') {
          stateRef.current.onHudUpdate({
            score: tetrisEngine.score,
            secondaryValue: tetrisEngine.lines,
            secondaryLabel: 'LINES',
            tertiaryValue: `LVL ${tetrisEngine.level}`,
            tertiaryLabel: 'SPEED',
            nextPieceType: tetrisEngine.nextType,
          });
        } else if (g === 'xo') {
          stateRef.current.onHudUpdate({
            score: xoEngine.scoreX,
            secondaryValue: xoEngine.scoreO,
            secondaryLabel: xoEngine.mode === 'ai' ? 'AI (O)' : 'P2 (O)',
            tertiaryValue: `${xoEngine.gridSize}×${xoEngine.gridSize}`,
            tertiaryLabel: xoEngine.mode === 'ai' ? xoEngine.difficulty.toUpperCase() : '2P LOCAL',
            turnOwner: xoEngine.currentTurn,
            isAiThinking,
            canUndo:
              xoEngine.moveHistory.length > 0 &&
              xoEngine.result.winner === null &&
              !isAiThinking,
          });
        } else if (g === 'snake') {
          stateRef.current.onHudUpdate({
            score: snakeEngine.score,
            secondaryValue: snakeEngine.segments.length,
            secondaryLabel: 'LENGTH',
            tertiaryValue: `${snakeEngine.combo}x`,
            tertiaryLabel: 'COMBO',
          });
        } else if (g === 'breaker') {
          stateRef.current.onHudUpdate({
            score: breakerEngine.score,
            secondaryValue: breakerEngine.lives,
            secondaryLabel: 'LIVES',
            tertiaryValue: `LASER ×${breakerEngine.laserCharges}`,
            tertiaryLabel: 'ORDNANCE',
            specialCharges: breakerEngine.laserCharges,
          });
        } else if (g === 'pong') {
          stateRef.current.onHudUpdate({
            score: pongEngine.scorePlayer,
            secondaryValue: pongEngine.scoreOpponent,
            secondaryLabel: pongEngine.mode === 'ai' ? 'AI BOT' : 'P2 TOP',
            tertiaryValue: `FIRST TO ${pongEngine.winScore}`,
            tertiaryLabel: pongEngine.difficulty.toUpperCase(),
          });
        } else if (g === 'connect4') {
          stateRef.current.onHudUpdate({
            score: connect4Engine.scoreP1,
            secondaryValue: connect4Engine.scoreP2,
            secondaryLabel: connect4Engine.mode === 'ai' ? 'AI (ROSE)' : 'P2 (ROSE)',
            tertiaryValue: connect4Engine.popOutMode ? 'POP-OUT' : 'CLASSIC',
            tertiaryLabel: '7×6 RACK',
            turnOwner: connect4Engine.currentTurn === 1 ? 'X' : 'O',
            isAiThinking,
            canUndo: connect4Engine.history.length > 0 && connect4Engine.result.winner === null,
          });
        } else if (g === 'merge2048') {
          stateRef.current.onHudUpdate({
            score: merge2048Engine.score,
            secondaryValue: merge2048Engine.maxTile,
            secondaryLabel: 'MAX MONOLITH',
            tertiaryValue: `PULSE ×${merge2048Engine.shockwaveCharges}`,
            tertiaryLabel: 'REACTOR',
            canUndo: merge2048Engine.history.length > 0,
            specialCharges: merge2048Engine.shockwaveCharges,
          });
        } else if (g === 'runner') {
          stateRef.current.onHudUpdate({
            score: runnerEngine.score,
            secondaryValue: runnerEngine.ringsCollected,
            secondaryLabel: 'WARP RINGS',
            tertiaryValue:
              runnerEngine.phaseShiftTimer > 0
                ? 'OVERDRIVE!'
                : `${Math.round(runnerEngine.forwardSpeed)} M/S`,
            tertiaryLabel: 'VELOCITY',
            specialCharges: Math.floor(runnerEngine.ringsCollected / 3),
          });
        } else if (g === 'mines') {
          stateRef.current.onHudUpdate({
            score: minesEngine.score,
            secondaryValue: Math.max(0, minesEngine.totalMines - minesEngine.flagsPlaced),
            secondaryLabel: 'MINES LEFT',
            tertiaryValue: minesEngine.flagMode ? 'FLAG MODE' : 'REVEAL MODE',
            tertiaryLabel: `SONAR ×${minesEngine.sonarCharges}`,
            flagMode: minesEngine.flagMode,
            specialCharges: minesEngine.sonarCharges,
          });
        } else if (g === 'invaders') {
          stateRef.current.onHudUpdate({
            score: invadersEngine.score,
            secondaryValue: invadersEngine.lives,
            secondaryLabel: 'DEFENDERS',
            tertiaryValue: `WAVE ${invadersEngine.wave}`,
            tertiaryLabel: 'FORMATION',
            specialCharges: invadersEngine.empCharges,
          });
        } else if (g === 'pac') {
          stateRef.current.onHudUpdate({
            score: pacEngine.score,
            secondaryValue: pacEngine.lives,
            secondaryLabel: 'LIVES',
            tertiaryValue:
              pacEngine.frightenedTimer > 0
                ? 'OVERDRIVE!'
                : `WAVE ${pacEngine.wave}`,
            tertiaryLabel: `DASH ×${pacEngine.dashCharges}`,
            specialCharges: pacEngine.dashCharges,
          });
        }
      };

      const executeXoCellMove = (cellIndex: number) => {
        if (stateRef.current.shellState !== 'PLAYING' || stateRef.current.selectedGame !== 'xo')
          return;
        if (aiMoveTimeout !== null || xoEngine.result.winner !== null) return;

        const currentMark = xoEngine.currentTurn;
        if (!xoEngine.makeMove(cellIndex)) return;

        if (currentMark === 'X') soundFX.playPlaceX();
        else soundFX.playPlaceO();

        addXoMarkVisual(cellIndex, currentMark);
        emitHudState(false);

        if (xoEngine.result.winner !== null) {
          if (xoEngine.result.lineIndices.length > 0) {
            drawXoWinningLaser(xoEngine.result.lineIndices);
          }
          shakeIntensity = 0.35;
          const winner = xoEngine.result.winner;
          if (winner === 'X' || (xoEngine.mode === 'local2p' && winner === 'O')) {
            soundFX.playVictory();
          } else {
            soundFX.playGameOver();
          }
          window.setTimeout(() => {
            stateRef.current.onGameEnd(
              winner === 'O' && xoEngine.mode === 'ai' ? 'GAME_OVER' : 'VICTORY',
              {
                game: 'xo',
                score: xoEngine.scoreX * 150 + (winner === 'X' ? 200 : winner === 'DRAW' ? 75 : 0),
                linesOrLength: xoEngine.gridSize,
                level: 1,
                xoWinner: winner,
              }
            );
          }, 650);
          return;
        }

        if (xoEngine.mode === 'ai' && xoEngine.currentTurn === 'O') {
          emitHudState(true);
          aiMoveTimeout = window.setTimeout(() => {
            aiMoveTimeout = null;
            if (stateRef.current.shellState !== 'PLAYING' || stateRef.current.selectedGame !== 'xo')
              return;
            const aiIdx = xoEngine.computeAIMove();
            if (aiIdx >= 0 && xoEngine.makeMove(aiIdx)) {
              soundFX.playPlaceO();
              addXoMarkVisual(aiIdx, 'O');
              emitHudState(false);

              if (xoEngine.result.winner !== null) {
                if (xoEngine.result.lineIndices.length > 0) {
                  drawXoWinningLaser(xoEngine.result.lineIndices);
                }
                shakeIntensity = 0.35;
                const w = xoEngine.result.winner;
                if (w === 'X') soundFX.playVictory();
                else soundFX.playGameOver();
                window.setTimeout(() => {
                  stateRef.current.onGameEnd(w === 'O' ? 'GAME_OVER' : 'VICTORY', {
                    game: 'xo',
                    score: xoEngine.scoreX * 150 + (w === 'DRAW' ? 75 : 0),
                    linesOrLength: xoEngine.gridSize,
                    level: 1,
                    xoWinner: w,
                  });
                }, 650);
              }
            }
          }, 420);
        }
      };

      const executeConnect4Drop = (col: number) => {
        if (
          stateRef.current.shellState !== 'PLAYING' ||
          stateRef.current.selectedGame !== 'connect4'
        )
          return;
        if (aiMoveTimeout !== null || connect4Engine.result.winner !== null) return;

        const res = connect4Engine.dropDisc(col);
        if (!res.success) return;

        soundFX.playPlaceX();
        rebuildConnect4Discs();
        spawnBurst((col - 3) * 1.15, 0.95 + res.row * 1.15, 0.2, 0x06b6d4, 14);
        emitHudState(false);

        if (connect4Engine.result.winner !== null) {
          const w = connect4Engine.result.winner;
          if (w === 1) soundFX.playVictory();
          else soundFX.playGameOver();
          window.setTimeout(() => {
            stateRef.current.onGameEnd(w === 2 && connect4Engine.mode === 'ai' ? 'GAME_OVER' : 'VICTORY', {
              game: 'connect4',
              score: w === 1 ? 450 : 120,
              linesOrLength: 4,
              level: 1,
            });
          }, 650);
          return;
        }

        if (connect4Engine.mode === 'ai' && connect4Engine.currentTurn === 2) {
          emitHudState(true);
          aiMoveTimeout = window.setTimeout(() => {
            aiMoveTimeout = null;
            if (
              stateRef.current.shellState !== 'PLAYING' ||
              stateRef.current.selectedGame !== 'connect4'
            )
              return;
            const aiCol = connect4Engine.computeAIMove();
            if (aiCol >= 0) {
              const aiRes = connect4Engine.dropDisc(aiCol);
              if (aiRes.success) {
                soundFX.playPlaceO();
                rebuildConnect4Discs();
                spawnBurst((aiCol - 3) * 1.15, 0.95 + aiRes.row * 1.15, 0.2, 0xf43f5e, 14);
                emitHudState(false);

                if (connect4Engine.result.winner !== null) {
                  const w = connect4Engine.result.winner;
                  if (w === 1) soundFX.playVictory();
                  else soundFX.playGameOver();
                  window.setTimeout(() => {
                    stateRef.current.onGameEnd(w === 2 ? 'GAME_OVER' : 'VICTORY', {
                      game: 'connect4',
                      score: w === 1 ? 450 : 100,
                      linesOrLength: 4,
                      level: 1,
                    });
                  }, 650);
                }
              }
            }
          }, 420);
        }
      };

      const startOrResetActiveGame = () => {
        if (aiMoveTimeout !== null) {
          clearTimeout(aiMoveTimeout);
          aiMoveTimeout = null;
        }
        const { selectedGame: g, config: cfg } = stateRef.current;
        if (g === 'tetris') {
          tetrisEngine.reset(cfg.tetris.startLevel);
          tetrisBoardDirty = true;
          lastActiveColor = -1;
          rebuildTetrisVisuals();
        } else if (g === 'xo') {
          xoEngine.configure(cfg.xo.gridSize, cfg.xo.mode, cfg.xo.difficulty, false);
          rebuildXoBoardGeometry();
        } else if (g === 'snake') {
          snakeEngine.reset(cfg.snake.speed, cfg.snake.wrapWalls);
          const wallColor = cfg.snake.wrapWalls ? 0x06b6d4 : 0x10b981;
          wallGlowRefs.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.color.setHex(wallColor);
            mat.emissive.setHex(wallColor);
          });
        } else if (g === 'breaker') {
          breakerEngine.reset(cfg.breaker.difficulty);
          rebuildBreakerBricks();
        } else if (g === 'pong') {
          pongEngine.reset(cfg.pong.mode, cfg.pong.difficulty, cfg.pong.winScore);
        } else if (g === 'connect4') {
          connect4Engine.configure(
            cfg.connect4.mode,
            cfg.connect4.difficulty,
            cfg.connect4.popOutMode,
            false
          );
          rebuildConnect4Discs();
        } else if (g === 'merge2048') {
          merge2048Engine.reset();
          rebuildMerge2048Visuals();
        } else if (g === 'runner') {
          runnerEngine.reset(cfg.runner.speed);
        } else if (g === 'mines') {
          minesEngine.reset(cfg.mines.density);
          minesEngine.flagMode = cfg.mines.flagMode;
          rebuildMinesVisuals();
        } else if (g === 'invaders') {
          invadersEngine.reset();
          rebuildInvadersBunkersVisuals();
        } else if (g === 'pac') {
          pacEngine.reset(cfg.pac?.speed || 'normal');
          syncPacPelletsVisuals();
        }
        emitHudState(false);
      };

      // Wire Imperative Stage Actions
      actionsRef.current = (action) => {
        const { shellState: st, selectedGame: g } = stateRef.current;
        if (action === 'restart') {
          startOrResetActiveGame();
          return;
        }
        if (st !== 'PLAYING') return;

        if (g === 'tetris') {
          if (action === 'left' && tetrisEngine.moveHorizontal(-1)) {
            soundFX.playMove();
            rebuildTetrisVisuals();
          } else if (action === 'right' && tetrisEngine.moveHorizontal(1)) {
            soundFX.playMove();
            rebuildTetrisVisuals();
          } else if ((action === 'rotate' || action === 'up') && tetrisEngine.rotate()) {
            soundFX.playRotate();
            rebuildTetrisVisuals();
          } else if (action === 'down') {
            const res = tetrisEngine.softDrop();
            if (res.moved) {
              soundFX.playSoftDrop();
              rebuildTetrisVisuals();
              emitHudState();
            } else if (res.locked) {
              tetrisBoardDirty = true;
              if (res.clearedLines > 0) {
                soundFX.playLineClear(res.clearedLines);
                shakeIntensity = 0.28;
                spawnBurst(0, 6, 0.5, 0x06b6d4, 22);
              }
              rebuildTetrisVisuals();
              emitHudState();
              if (tetrisEngine.isGameOver) {
                soundFX.playGameOver();
                stateRef.current.onGameEnd('GAME_OVER', {
                  game: 'tetris',
                  score: tetrisEngine.score,
                  linesOrLength: tetrisEngine.lines,
                  level: tetrisEngine.level,
                  hadQuadTetris: tetrisEngine.maxComboQuad,
                });
              }
            }
          } else if (action === 'drop') {
            const res = tetrisEngine.hardDrop();
            soundFX.playHardDrop();
            tetrisBoardDirty = true;
            shakeIntensity = 0.25;
            res.lockCells.forEach(([cx, cy]) => {
              spawnBurst(cx - 4.5, cy + 1.0, 0.3, TETROMINO_DEFS[tetrisEngine.activeType].color, 5);
            });
            if (res.clearedLines > 0) soundFX.playLineClear(res.clearedLines);
            rebuildTetrisVisuals();
            emitHudState();
            if (tetrisEngine.isGameOver) {
              soundFX.playGameOver();
              stateRef.current.onGameEnd('GAME_OVER', {
                game: 'tetris',
                score: tetrisEngine.score,
                linesOrLength: tetrisEngine.lines,
                level: tetrisEngine.level,
                hadQuadTetris: tetrisEngine.maxComboQuad,
              });
            }
          }
        } else if (g === 'xo') {
          if (action === 'undo' && xoEngine.undoMove()) {
            soundFX.playUiTap();
            rebuildXoBoardGeometry();
            emitHudState(false);
          }
        } else if (g === 'snake') {
          if (action === 'up' && snakeEngine.queueDirection(0, -1)) soundFX.playMove();
          else if (action === 'down' && snakeEngine.queueDirection(0, 1)) soundFX.playMove();
          else if (action === 'left' && snakeEngine.queueDirection(-1, 0)) soundFX.playMove();
          else if (action === 'right' && snakeEngine.queueDirection(1, 0)) soundFX.playMove();
          else if (action === 'boostOn') snakeEngine.isBoosting = true;
          else if (action === 'boostOff') snakeEngine.isBoosting = false;
        } else if (g === 'breaker') {
          if (action === 'left') {
            breakerEngine.movePaddle(-1.15);
            soundFX.playMove();
          } else if (action === 'right') {
            breakerEngine.movePaddle(1.15);
            soundFX.playMove();
          } else if (action === 'drop' || action === 'special' || action === 'up') {
            const res = breakerEngine.launchOrFire();
            if (res === 'launched') soundFX.playRotate();
            else if (res === 'laser') {
              soundFX.playPlaceX();
              emitHudState();
            }
          }
        } else if (g === 'pong') {
          if (action === 'left') {
            pongEngine.movePlayer(-1.15);
            soundFX.playMove();
          } else if (action === 'right') {
            pongEngine.movePlayer(1.15);
            soundFX.playMove();
          } else if (action === 'special' || action === 'drop' || action === 'up') {
            if (pongEngine.triggerDashStrike()) {
              soundFX.playHardDrop();
              shakeIntensity = 0.25;
              spawnBurst(pongEngine.puckX, 0.4, pongEngine.puckZ, 0x06b6d4, 16);
            }
          }
        } else if (g === 'connect4') {
          if (action === 'left') {
            connect4Engine.selectedCol = Math.max(0, connect4Engine.selectedCol - 1);
            soundFX.playMove();
          } else if (action === 'right') {
            connect4Engine.selectedCol = Math.min(C4_COLS - 1, connect4Engine.selectedCol + 1);
            soundFX.playMove();
          } else if (action === 'drop') {
            executeConnect4Drop(connect4Engine.selectedCol);
          } else if (action === 'special') {
            if (connect4Engine.popOutBottomDisc(connect4Engine.selectedCol)) {
              soundFX.playRotate();
              rebuildConnect4Discs();
              emitHudState(false);
            }
          } else if (action === 'undo' && connect4Engine.undo()) {
            soundFX.playUiTap();
            rebuildConnect4Discs();
            emitHudState(false);
          }
        } else if (g === 'merge2048') {
          if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
            const res = merge2048Engine.slide(action);
            if (res.moved) {
              if (res.largestMerge >= 64) soundFX.playLineClear(2);
              else if (res.largestMerge > 0) soundFX.playSnakeEat(2);
              else soundFX.playMove();
              res.mergedPositions.forEach(([r, c]) => {
                spawnBurst((c - 1.5) * 1.75, 0.7, (r - 1.5) * 1.75, 0xd946ef, 12);
              });
              rebuildMerge2048Visuals();
              emitHudState();
              if (merge2048Engine.isGameOver) {
                soundFX.playGameOver();
                stateRef.current.onGameEnd(
                  merge2048Engine.maxTile >= 2048 ? 'VICTORY' : 'GAME_OVER',
                  {
                    game: 'merge2048',
                    score: merge2048Engine.score,
                    linesOrLength: merge2048Engine.maxTile,
                    level: 1,
                  }
                );
              }
            }
          } else if (action === 'undo' && merge2048Engine.undo()) {
            soundFX.playUiTap();
            rebuildMerge2048Visuals();
            emitHudState();
          } else if (action === 'special') {
            const cleared = merge2048Engine.triggerShockwave();
            if (cleared.length > 0) {
              soundFX.playHardDrop();
              shakeIntensity = 0.3;
              cleared.forEach(([r, c]) => {
                spawnBurst((c - 1.5) * 1.75, 0.6, (r - 1.5) * 1.75, 0x06b6d4, 14);
              });
              rebuildMerge2048Visuals();
              emitHudState();
            }
          }
        } else if (g === 'runner') {
          if (action === 'left' && runnerEngine.shiftLane(-1)) soundFX.playMove();
          else if (action === 'right' && runnerEngine.shiftLane(1)) soundFX.playMove();
          else if ((action === 'up' || action === 'drop') && runnerEngine.jump())
            soundFX.playRotate();
          else if (action === 'special' && runnerEngine.activatePhaseShift()) {
            soundFX.playLineClear(4);
            emitHudState();
          }
        } else if (g === 'mines') {
          if (action === 'toggleFlag') {
            minesEngine.flagMode = !minesEngine.flagMode;
            soundFX.playUiTap();
            emitHudState();
          } else if (action === 'special') {
            const idx = minesEngine.useSonarPulse();
            if (idx >= 0) {
              soundFX.playPlaceX();
              const r = Math.floor(idx / MINES_GRID_SIZE);
              const c = idx % MINES_GRID_SIZE;
              const half = (MINES_GRID_SIZE - 1) / 2;
              spawnBurst((c - half) * 1.26, 0.7, (r - half) * 1.26, 0x06b6d4, 18);
              rebuildMinesVisuals();
              emitHudState();
            }
          }
        } else if (g === 'invaders') {
          if (action === 'left') {
            invadersEngine.movePlayer(-1.15);
            soundFX.playMove();
          } else if (action === 'right') {
            invadersEngine.movePlayer(1.15);
            soundFX.playMove();
          } else if (action === 'drop' || action === 'up') {
            if (invadersEngine.fireLaser()) {
              soundFX.playLaserShoot();
            }
          } else if (action === 'special') {
            const res = invadersEngine.triggerEmpBomb();
            if (res.triggered) {
              soundFX.playEmpBlast();
              shakeIntensity = 0.45;
              res.hits.forEach((h) => {
                spawnBurst(h.x, 0.6, h.z, h.colorHex, 16);
              });
              emitHudState();
            }
          }
        } else if (g === 'pac') {
          if (action === 'up' && pacEngine.queueDirection(-1, 0)) soundFX.playMove();
          else if (action === 'down' && pacEngine.queueDirection(1, 0)) soundFX.playMove();
          else if (action === 'left' && pacEngine.queueDirection(0, -1)) soundFX.playMove();
          else if (action === 'right' && pacEngine.queueDirection(0, 1)) soundFX.playMove();
          else if ((action === 'special' || action === 'drop') && pacEngine.triggerPhaseDash()) {
            soundFX.playHardDrop();
            shakeIntensity = 0.22;
            const px = (pacEngine.playerCol - pacHalf) * 1.0;
            const pz = (pacEngine.playerRow - pacHalf) * 1.0;
            spawnBurst(px, 0.5, pz, 0x06b6d4, 16);
            emitHudState();
          }
        }
      };

      // ========================================================================
      // POINTER RAYCASTING & TOUCH SWIPE GESTURES
      // ========================================================================
      const raycaster = new THREE.Raycaster();
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let swipeConsumed = false;
      let tetrisDragMoved = false;
      let isPointerDown = false;

      const updateNormalizedPointer = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_rayMouse, camera);
      };

      const handlePointerDown = (e: PointerEvent) => {
        isPointerDown = true;
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        touchStartTime = performance.now();
        swipeConsumed = false;
        tetrisDragMoved = false;

        const { shellState: st, selectedGame: g } = stateRef.current;
        if (st === 'PLAYING' && (g === 'breaker' || g === 'pong' || g === 'invaders')) {
          updateNormalizedPointer(e);
          if (raycaster.ray.intersectPlane(_floorPlane, _planeIntersect)) {
            if (g === 'breaker') breakerEngine.setPaddleTargetX(_planeIntersect.x);
            else if (g === 'pong') pongEngine.setPlayerTargetX(_planeIntersect.x);
            else if (g === 'invaders') invadersEngine.setPlayerTargetX(_planeIntersect.x);
          }
        }
      };

      const handlePointerMove = (e: PointerEvent) => {
        const { shellState: st, selectedGame: g } = stateRef.current;

        // Direct 1:1 horizontal paddle tracking for Aegis Breaker, Vector Pong & Nova Invaders
        if (st === 'PLAYING' && isPointerDown && (g === 'breaker' || g === 'pong' || g === 'invaders')) {
          updateNormalizedPointer(e);
          if (raycaster.ray.intersectPlane(_floorPlane, _planeIntersect)) {
            if (g === 'breaker') breakerEngine.setPaddleTargetX(_planeIntersect.x);
            else if (g === 'pong') pongEngine.setPlayerTargetX(_planeIntersect.x);
            else if (g === 'invaders') invadersEngine.setPlayerTargetX(_planeIntersect.x);
          }
          return;
        }

        if (touchStartTime === 0 || swipeConsumed) return;
        if (st === 'PLAYING') {
          const dx = e.clientX - touchStartX;
          const dy = e.clientY - touchStartY;
          const dist = Math.hypot(dx, dy);

          if (dist > 28) {
            if (g === 'snake' || g === 'merge2048' || g === 'pac') {
              swipeConsumed = true;
              if (Math.abs(dx) > Math.abs(dy)) {
                actionsRef.current(dx > 0 ? 'right' : 'left');
              } else {
                actionsRef.current(dy > 0 ? 'down' : 'up');
              }
            } else if (g === 'runner') {
              swipeConsumed = true;
              if (Math.abs(dx) > Math.abs(dy)) {
                actionsRef.current(dx > 0 ? 'right' : 'left');
              } else if (dy < -22) {
                actionsRef.current('up');
              }
            } else if (g === 'tetris') {
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) {
                tetrisDragMoved = true;
                actionsRef.current(dx > 0 ? 'right' : 'left');
                touchStartX = e.clientX;
                touchStartY = e.clientY;
              } else if (!tetrisDragMoved && dy > 54 && Math.abs(dy) > Math.abs(dx) * 1.6) {
                swipeConsumed = true;
                actionsRef.current('drop');
              }
            }
          }
        }
      };

      const handlePointerUp = (e: PointerEvent) => {
        isPointerDown = false;
        const dt = performance.now() - touchStartTime;
        const dist = Math.hypot(e.clientX - touchStartX, e.clientY - touchStartY);
        touchStartTime = 0;

        if (swipeConsumed || tetrisDragMoved) return;

        updateNormalizedPointer(e);
        const { shellState: st, selectedGame: g } = stateRef.current;

        if (st === 'HUB') {
          if (dist > 36) {
            const idx = ALL_GAME_IDS.indexOf(g);
            const dx = e.clientX - touchStartX;
            const nextIdx =
              dx < -30
                ? (idx + 1) % ALL_GAME_IDS.length
                : (idx - 1 + ALL_GAME_IDS.length) % ALL_GAME_IDS.length;
            soundFX.playHubSwitch();
            stateRef.current.onSelectHubGame(ALL_GAME_IDS[nextIdx]);
            return;
          }
          const hits = raycaster.intersectObjects(hubGroup.children, true);
          if (hits.length > 0) {
            let obj: THREE.Object3D | null = hits[0].object;
            while (obj && !obj.userData?.hubGameId) {
              obj = obj.parent;
            }
            if (obj?.userData?.hubGameId) {
              soundFX.playHubSwitch();
              stateRef.current.onSelectHubGame(obj.userData.hubGameId as GameId);
            }
          }
        } else if (st === 'PLAYING') {
          if (g === 'xo' && dist < 24) {
            const hits = raycaster.intersectObjects(xoInteractiveTiles, false);
            if (hits.length > 0) {
              const cellIdx = hits[0].object.userData.xoCellIndex;
              if (typeof cellIdx === 'number') executeXoCellMove(cellIdx);
            }
          } else if (g === 'connect4' && dist < 24) {
            const hits = raycaster.intersectObjects(c4HitColumns, false);
            if (hits.length > 0) {
              const col = hits[0].object.userData.c4Col;
              if (typeof col === 'number') {
                connect4Engine.selectedCol = col;
                executeConnect4Drop(col);
              }
            }
          } else if (g === 'mines' && dist < 24) {
            const hits = raycaster.intersectObjects(minesInteractiveMeshes, false);
            if (hits.length > 0) {
              const cellIdx = hits[0].object.userData.mineCellIndex;
              if (typeof cellIdx === 'number') {
                // Long press (>340ms) plants flag automatically even in Reveal mode
                const prevFlagMode = minesEngine.flagMode;
                if (dt > 340 && !minesEngine.cells[cellIdx].isRevealed) {
                  minesEngine.flagMode = true;
                }
                const res = minesEngine.interactCell(cellIdx);
                minesEngine.flagMode = prevFlagMode;

                if (res.action === 'flagged') {
                  soundFX.playPlaceO();
                  rebuildMinesVisuals();
                  emitHudState();
                } else if (res.action === 'revealed') {
                  soundFX.playPlaceX();
                  rebuildMinesVisuals();
                  emitHudState();
                  if (minesEngine.isVictory) {
                    soundFX.playVictory();
                    stateRef.current.onGameEnd('VICTORY', {
                      game: 'mines',
                      score: minesEngine.score,
                      linesOrLength: minesEngine.revealedSafeCount,
                      level: 1,
                    });
                  }
                } else if (res.action === 'exploded') {
                  shakeIntensity = 0.55;
                  soundFX.playGameOver();
                  const r = Math.floor(cellIdx / MINES_GRID_SIZE);
                  const c = cellIdx % MINES_GRID_SIZE;
                  const half = (MINES_GRID_SIZE - 1) / 2;
                  spawnBurst((c - half) * 1.26, 0.6, (r - half) * 1.26, 0xf43f5e, 32);
                  rebuildMinesVisuals();
                  window.setTimeout(() => {
                    stateRef.current.onGameEnd('GAME_OVER', {
                      game: 'mines',
                      score: minesEngine.score,
                      linesOrLength: minesEngine.revealedSafeCount,
                      level: 1,
                    });
                  }, 550);
                }
              }
            }
          } else if (g === 'breaker' && dist < 22 && dt < 260) {
            actionsRef.current('special');
          } else if (g === 'invaders' && dist < 22 && dt < 260) {
            actionsRef.current('drop');
          }
        }
      };

      const handlePointerCancel = () => {
        isPointerDown = false;
        touchStartTime = 0;
      };

      const domElem = renderer.domElement;
      domElem.addEventListener('pointerdown', handlePointerDown);
      domElem.addEventListener('pointermove', handlePointerMove);
      domElem.addEventListener('pointerup', handlePointerUp);
      domElem.addEventListener('pointercancel', handlePointerCancel);

      // Keyboard Controls
      const handleKeyDown = (e: KeyboardEvent) => {
        if (stateRef.current.shellState !== 'PLAYING') return;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            actionsRef.current('left');
            break;
          case 'ArrowRight':
          case 'KeyD':
            actionsRef.current('right');
            break;
          case 'ArrowUp':
          case 'KeyW':
            actionsRef.current('up');
            break;
          case 'ArrowDown':
          case 'KeyS':
            actionsRef.current('down');
            break;
          case 'Space':
            if (stateRef.current.selectedGame === 'snake') actionsRef.current('boostOn');
            else actionsRef.current('drop');
            break;
          case 'KeyB':
          case 'KeyE':
            if (
              stateRef.current.selectedGame === 'invaders' ||
              stateRef.current.selectedGame === 'pac'
            ) {
              actionsRef.current('special');
            }
            break;
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space' && stateRef.current.selectedGame === 'snake') {
          actionsRef.current('boostOff');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // ========================================================================
      // 60FPS SIMULATION & RENDER LOOP (ZERO RUNTIME GPU ALLOCATIONS)
      // ========================================================================
      let frameId = 0;
      let frameCount = 0;
      let prevShellState: ShellState = stateRef.current.shellState;
      let prevGameId: GameId = stateRef.current.selectedGame;
      let lastTime = performance.now();
      let invadersAutoFireAccum = 0;
      let invadersUfoHumAccum = 0;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      function tick() {
        const now = performance.now();
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(rawDt, 0.05);
        const elapsed = now * 0.001;

        const { shellState: st, selectedGame: g } = stateRef.current;

        if (st !== prevShellState || g !== prevGameId) {
          if (
            st === 'PLAYING' &&
            ((prevShellState !== 'PLAYING' && prevShellState !== 'PAUSED') || g !== prevGameId)
          ) {
            startOrResetActiveGame();
          }
          prevShellState = st;
          prevGameId = g;
        }

        const inHub = st === 'HUB';
        hubGroup.visible = inHub;
        tetrisGroup.visible = !inHub && g === 'tetris';
        xoGroup.visible = !inHub && g === 'xo';
        snakeGroup.visible = !inHub && g === 'snake';
        breakerGroup.visible = !inHub && g === 'breaker';
        pongGroup.visible = !inHub && g === 'pong';
        connect4Group.visible = !inHub && g === 'connect4';
        merge2048Group.visible = !inHub && g === 'merge2048';
        runnerGroup.visible = !inHub && g === 'runner';
        minesGroup.visible = !inHub && g === 'mines';
        invadersGroup.visible = !inHub && g === 'invaders';
        pacGroup.visible = !inHub && g === 'pac';

        // Dynamic Per-Game 3D Atmospheric Lighting & Floor Grid Chromatics
        const atmo = GAME_ATMOSPHERE[g] || GAME_ATMOSPHERE.tetris;
        const colorLerp = 1 - Math.exp(-4.5 * dt);
        _targetAccentColor.setHex(atmo.accent);
        _targetSkyColor.setHex(atmo.sky);
        _targetFogColor.setHex(atmo.fog);
        _targetFloorEmissive.setHex(atmo.floorEmissive);

        rimLight.color.lerp(_targetAccentColor, colorLerp);
        stageAccentLight.color.lerp(_targetAccentColor, colorLerp);
        hemiLight.color.lerp(_targetSkyColor, colorLerp);
        floorMat.emissive.lerp(_targetFloorEmissive, colorLerp);
        hubConduitMat.color.lerp(_targetAccentColor, colorLerp);
        hubConduitMat.emissive.lerp(_targetAccentColor, colorLerp);
        neonStripMat.color.lerp(_targetAccentColor, colorLerp);
        neonStripMat.emissive.lerp(_targetAccentColor, colorLerp);

        if (scene.background instanceof THREE.Color) {
          scene.background.lerp(_targetFogColor, colorLerp);
        }
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.lerp(_targetFogColor, colorLerp);
        }

        rimLight.intensity = 5.2 + Math.sin(elapsed * 2.5) * 0.35;
        floorMat.emissiveIntensity = 0.32;

        const aspect = camera.aspect;
        // Responsive Portrait Factor for tall 20:9 phones (e.g., Google Pixel 8a)
        const portraitFactor = aspect < 1 ? Math.min(2.05, 0.94 / Math.max(0.42, aspect)) : 1.0;
        const portraitZOffset = aspect < 1 ? (portraitFactor - 1) * 0.9 : 0;

        if (inHub) {
          const selPed = hubPedestals.find((p) => p.id === g) || hubPedestals[0];
          const camRadius = HUB_RING_RADIUS + (aspect < 1 ? 4.8 * portraitFactor : 6.4);
          _camTargetPos.set(
            Math.sin(selPed.theta) * camRadius,
            3.15 + (portraitFactor - 1) * 0.85,
            Math.cos(selPed.theta) * camRadius
          );
          _camLookTarget.set(selPed.x, 1.55 - (portraitFactor - 1) * 0.45, selPed.z);

          hubPedestals.forEach((ped, idx) => {
            const isSelected = ped.id === g;
            ped.hologram.rotation.y = elapsed * (isSelected ? 1.2 : 0.45) + idx;
            ped.hologram.position.y = 1.85 + Math.sin(elapsed * 2.2 + idx) * 0.12;
            const targetScale = isSelected ? 1.15 : 0.86;
            ped.root.scale.lerp(_dummyObj.scale.setScalar(targetScale), 1 - Math.exp(-8 * dt));
          });
        } else if (g === 'tetris') {
          _camTargetPos.set(0, 10.2, 35.5 * Math.max(1, portraitFactor * 0.84));
          _camLookTarget.set(0, 9.5 - (portraitFactor - 1) * 0.85, 0);
        } else if (g === 'xo') {
          _camTargetPos.set(0, 11.4 * portraitFactor, 9.6 * portraitFactor);
          _camLookTarget.set(0, 0.1, 1.0 + portraitZOffset);
        } else if (g === 'snake') {
          _camTargetPos.set(0, 24.8 * portraitFactor, 19.6 * portraitFactor);
          _camLookTarget.set(0, 0, 2.25 + portraitZOffset);
        } else if (g === 'breaker') {
          _camTargetPos.set(0, 22.8 * portraitFactor, 18.8 * portraitFactor);
          _camLookTarget.set(0, 0, 1.95 + portraitZOffset);
        } else if (g === 'pong') {
          _camTargetPos.set(0, 22.4 * portraitFactor, 18.4 * portraitFactor);
          _camLookTarget.set(0, 0, 1.85 + portraitZOffset);
        } else if (g === 'connect4') {
          _camTargetPos.set(0, 4.4, 15.8 * portraitFactor);
          _camLookTarget.set(0, 3.5 - (portraitFactor - 1) * 0.55, 0);
        } else if (g === 'merge2048') {
          _camTargetPos.set(0, 13.8 * portraitFactor, 11.2 * portraitFactor);
          _camLookTarget.set(0, 0.3, 1.05 + portraitZOffset);
        } else if (g === 'runner') {
          _camTargetPos.set(
            runnerEngine.shipX * 0.35,
            5.4 * Math.max(1, portraitFactor * 0.75),
            13.2 * Math.max(1, portraitFactor * 0.78)
          );
          _camLookTarget.set(runnerEngine.shipX * 0.5, 0.5 - (portraitFactor - 1) * 0.4, -6);
        } else if (g === 'mines') {
          _camTargetPos.set(0, 15.6 * portraitFactor, 11.4 * portraitFactor);
          _camLookTarget.set(0, 0.1, 1.15 + portraitZOffset);
        } else if (g === 'invaders') {
          _camTargetPos.set(0, 23.6 * portraitFactor, 19.2 * portraitFactor);
          _camLookTarget.set(0, 0, 1.95 + portraitZOffset);
        } else if (g === 'pac') {
          _camTargetPos.set(0, 23.8 * portraitFactor, 18.0 * portraitFactor);
          _camLookTarget.set(0, 0, 2.1 + portraitZOffset);
        }

        if (shakeIntensity > 0.001) {
          _camTargetPos.x += (Math.random() - 0.5) * shakeIntensity;
          _camTargetPos.y += (Math.random() - 0.5) * shakeIntensity;
          shakeIntensity *= Math.exp(-12 * dt);
        } else {
          shakeIntensity = 0;
        }

        const dampFactor = 1 - Math.exp(-7.5 * dt);
        camera.position.lerp(_camTargetPos, dampFactor);
        _currentLook.lerp(_camLookTarget, dampFactor);
        camera.lookAt(_currentLook);

        // Advance active game simulation
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else if (st === 'PLAYING') {
          if (g === 'tetris') {
            const step = tetrisEngine.update(dt);
            if (step.locked) {
              tetrisBoardDirty = true;
              if (step.clearedLines > 0) {
                soundFX.playLineClear(step.clearedLines);
                shakeIntensity = 0.28;
                spawnBurst(0, 6, 0.5, 0x8b5cf6, 24);
              }
              emitHudState();
              if (tetrisEngine.isGameOver) {
                soundFX.playGameOver();
                stateRef.current.onGameEnd('GAME_OVER', {
                  game: 'tetris',
                  score: tetrisEngine.score,
                  linesOrLength: tetrisEngine.lines,
                  level: tetrisEngine.level,
                  hadQuadTetris: tetrisEngine.maxComboQuad,
                });
              }
            }
            rebuildTetrisVisuals();
          } else if (g === 'xo') {
            xoPlacedMarks.forEach((item) => {
              item.mesh.position.y = THREE.MathUtils.damp(item.mesh.position.y, 0.38, 12, dt);
              const s = THREE.MathUtils.damp(item.mesh.scale.x, item.targetScale, 12, dt);
              item.mesh.scale.setScalar(s);
            });
            if (xoWinBeamMesh) {
              const mat = xoWinBeamMesh.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = 1.6 + Math.sin(elapsed * 10) * 0.5;
            }
          } else if (g === 'snake') {
            const res = snakeEngine.update(dt);
            if (res.ateFood && res.eatWorldPos) {
              soundFX.playSnakeEat(snakeEngine.combo);
              shakeIntensity = 0.22;
              spawnBurst(res.eatWorldPos.x, 0.5, res.eatWorldPos.z, 0xf59e0b, 20);
              emitHudState();
            }
            if (res.died) {
              shakeIntensity = 0.48;
              soundFX.playGameOver();
              const head = snakeEngine.segments[0];
              spawnBurst(head.x, 0.5, head.z, 0xf43f5e, 28);
              stateRef.current.onGameEnd('GAME_OVER', {
                game: 'snake',
                score: snakeEngine.score,
                linesOrLength: snakeEngine.segments.length,
                level: snakeEngine.combo,
              });
            }

            const alpha = snakeEngine.moveProgress;
            const headCurr = snakeEngine.segments[0];
            const headPrev = snakeEngine.prevSegments[0] || headCurr;
            snakeHeadMesh.position.set(
              THREE.MathUtils.lerp(headPrev.x, headCurr.x, alpha),
              0,
              THREE.MathUtils.lerp(headPrev.z, headCurr.z, alpha)
            );
            snakeHeadMesh.rotation.y = Math.atan2(snakeEngine.dir.x, snakeEngine.dir.z);

            for (let i = 0; i < MAX_SNAKE_SEGMENTS; i++) {
              const segIdx = i + 1;
              const segMesh = snakeSegmentsPool[i];
              if (segIdx < snakeEngine.segments.length) {
                segMesh.visible = true;
                const curr = snakeEngine.segments[segIdx];
                const prev = snakeEngine.prevSegments[segIdx] || curr;
                const jumpDist = Math.hypot(curr.x - prev.x, curr.z - prev.z);
                const ix = jumpDist > 2 ? curr.x : THREE.MathUtils.lerp(prev.x, curr.x, alpha);
                const iz = jumpDist > 2 ? curr.z : THREE.MathUtils.lerp(prev.z, curr.z, alpha);
                segMesh.position.set(ix, 0, iz);
                const taper = Math.max(0.48, 1 - (segIdx / (snakeEngine.segments.length + 4)) * 0.45);
                segMesh.scale.setScalar(taper);
              } else {
                segMesh.visible = false;
              }
            }

            plasmaCoreMesh.position.set(snakeEngine.food.x, 0, snakeEngine.food.z);
            plasmaCoreMesh.children[0].rotation.y = elapsed * 2.8;
            plasmaCoreMesh.children[1].rotation.x = elapsed * 2.2;
            plasmaCoreMesh.children[2].rotation.z = elapsed * 2.5;
          } else if (g === 'breaker') {
            const step = breakerEngine.update(dt);
            if (step.paddleHit) soundFX.playMove();
            if (step.powerUpCollected) {
              soundFX.playSnakeEat(3);
              emitHudState();
            }
            if (step.brickHits.length > 0) {
              soundFX.playRotate();
              step.brickHits.forEach((h) => spawnBurst(h.x, 0.5, h.z, h.color, 10));
              rebuildBreakerBricks();
              emitHudState();
            }
            if (step.lostLife) {
              shakeIntensity = 0.35;
              soundFX.playSoftDrop();
              emitHudState();
            }
            if (breakerEngine.isGameOver) {
              if (breakerEngine.isVictory) soundFX.playVictory();
              else soundFX.playGameOver();
              stateRef.current.onGameEnd(breakerEngine.isVictory ? 'VICTORY' : 'GAME_OVER', {
                game: 'breaker',
                score: breakerEngine.score,
                linesOrLength: breakerEngine.wave,
                level: 1,
              });
            }

            breakerPaddleMesh.position.set(breakerEngine.paddleX, 0, PADDLE_Z);
            breakerPaddleMesh.scale.x = breakerEngine.paddleWidth / 2.2;

            // Update Pooled Balls, Capsules, and Lasers (Zero Allocations)
            for (let i = 0; i < breakerBallPool.length; i++) {
              const b = breakerEngine.balls[i];
              const m = breakerBallPool[i];
              if (b) {
                m.visible = true;
                m.position.set(b.x, 0.32, b.z);
              } else {
                m.visible = false;
              }
            }

            for (let i = 0; i < breakerCapsulePool.length; i++) {
              const cap = breakerEngine.capsules[i];
              const m = breakerCapsulePool[i];
              if (cap) {
                const col =
                  cap.type === 'multiball' ? 0xf59e0b : cap.type === 'wide' ? 0x10b981 : 0xf43f5e;
                m.visible = true;
                m.material = getCachedStandardMat(`cap_${col}`, {
                  color: col,
                  emissive: col,
                  emissiveIntensity: 1.4,
                });
                m.position.set(cap.x, 0.35, cap.z);
              } else {
                m.visible = false;
              }
            }

            for (let i = 0; i < breakerLaserPool.length; i++) {
              const l = breakerEngine.lasers[i];
              const m = breakerLaserPool[i];
              if (l) {
                m.visible = true;
                m.position.set(l.x, 0.35, l.z);
              } else {
                m.visible = false;
              }
            }
          } else if (g === 'pong') {
            const res = pongEngine.update(dt);
            if (res.paddleHit) {
              soundFX.playRotate();
              spawnBurst(pongEngine.puckX, 0.3, pongEngine.puckZ, 0x06b6d4, 10);
            } else if (res.wallHit) {
              soundFX.playMove();
            }
            if (res.scoredBy) {
              shakeIntensity = 0.32;
              if (res.scoredBy === 'PLAYER') soundFX.playSnakeEat(2);
              else soundFX.playSoftDrop();
              emitHudState();
            }
            if (pongEngine.isGameOver) {
              const won = pongEngine.winner === 'PLAYER';
              if (won) soundFX.playVictory();
              else soundFX.playGameOver();
              stateRef.current.onGameEnd(won ? 'VICTORY' : 'GAME_OVER', {
                game: 'pong',
                score: pongEngine.scorePlayer * 200 + (won ? 300 : 0),
                linesOrLength: pongEngine.scorePlayer,
                level: 1,
              });
            }

            pongPlayerPaddle.position.x = pongEngine.playerX;
            pongOpponentPaddle.position.x = pongEngine.opponentX;
            pongPuckMesh.position.set(pongEngine.puckX, 0, pongEngine.puckZ);
            pongPuckMesh.children[0].rotation.y = elapsed * 4;
            pongGateMesh.position.x = pongEngine.overchargeGateX;
          } else if (g === 'connect4') {
            c4PreviewDisc.visible = connect4Engine.result.winner === null;
            c4PreviewDisc.position.set(
              (connect4Engine.selectedCol - 3) * 1.15,
              C4_ROWS * 1.15 + 1.05 + Math.sin(elapsed * 5) * 0.1,
              0
            );
          } else if (g === 'runner') {
            const step = runnerEngine.update(dt);
            if (step.ringPicked) {
              soundFX.playSnakeEat(3);
              spawnBurst(step.ringPicked.x, 0.8, step.ringPicked.z, 0x06b6d4, 16);
              emitHudState();
            }
            if (step.shatteredObstacle) {
              soundFX.playHardDrop();
              shakeIntensity = 0.25;
              spawnBurst(step.shatteredObstacle.x, 1.0, step.shatteredObstacle.z, 0xf59e0b, 20);
            }
            if (step.crashed) {
              shakeIntensity = 0.55;
              soundFX.playGameOver();
              spawnBurst(runnerEngine.shipX, 0.8, 4.5, 0xf43f5e, 32);
              stateRef.current.onGameEnd('GAME_OVER', {
                game: 'runner',
                score: runnerEngine.score,
                linesOrLength: runnerEngine.ringsCollected,
                level: 1,
              });
            }
            if (Math.floor(now / 150) !== Math.floor((now - rawDt * 1000) / 150)) {
              emitHudState();
            }

            runnerShipMesh.position.x = runnerEngine.shipX;
            runnerShipMesh.position.y = 0;

            const bankAngle =
              (runnerEngine.shipX - runnerEngine.targetLane * RUNNER_LANE_WIDTH) * 0.24;
            const pitchAngle = runnerEngine.isJumping
              ? Math.max(-0.22, Math.min(0.28, runnerEngine.shipVy * 0.025))
              : Math.sin(elapsed * 8) * 0.015;

            const shipAirframe = runnerShipMesh.userData.airframe as THREE.Group | undefined;
            const leftPlume = runnerShipMesh.userData.leftPlume as THREE.Group | undefined;
            const rightPlume = runnerShipMesh.userData.rightPlume as THREE.Group | undefined;
            const shieldMesh = runnerShipMesh.userData.shieldMesh as THREE.Mesh | undefined;
            const shipShadow = runnerShipMesh.userData.shadow as THREE.Mesh | undefined;

            if (shipAirframe) {
              shipAirframe.position.y = runnerEngine.shipY;
              shipAirframe.rotation.z = bankAngle;
              shipAirframe.rotation.x = pitchAngle;
            } else {
              runnerShipMesh.position.y = runnerEngine.shipY;
              runnerShipMesh.rotation.z = bankAngle;
              runnerShipMesh.rotation.x = pitchAngle;
            }

            const plumeBoost =
              (runnerEngine.phaseShiftTimer > 0 ? 1.45 : 1.0) +
              (runnerEngine.isJumping ? 0.25 : 0) +
              Math.sin(elapsed * 42) * 0.16;
            if (leftPlume && rightPlume) {
              leftPlume.scale.set(1, 1, plumeBoost);
              rightPlume.scale.set(1, 1, plumeBoost);
            }

            if (shieldMesh) {
              shieldMesh.visible = runnerEngine.phaseShiftTimer > 0;
              if (shieldMesh.visible) {
                shieldMesh.rotation.y = elapsed * 2.4;
              }
            }

            if (shipShadow) {
              const shadowScale = Math.max(0.45, 1 - runnerEngine.shipY * 0.22);
              shipShadow.scale.setScalar(shadowScale);
            }

            // Update Pooled Void Runner Obstacles (Zero Allocations)
            let ringIdx = 0;
            let barIdx = 0;
            let pilIdx = 0;

            for (let i = 0; i < runnerEngine.obstacles.length; i++) {
              const obs = runnerEngine.obstacles[i];
              const ox = obs.lane * RUNNER_LANE_WIDTH;
              if (obs.kind === 'ring' && ringIdx < runnerRingPool.length) {
                const m = runnerRingPool[ringIdx++];
                m.visible = true;
                m.position.set(ox, 1.0, obs.z);
                m.rotation.z = elapsed * 3;
              } else if (obs.kind === 'barrier' && barIdx < runnerBarrierPool.length) {
                const m = runnerBarrierPool[barIdx++];
                m.visible = true;
                m.position.set(ox, 0.4, obs.z);
              } else if (obs.kind === 'pillar' && pilIdx < runnerPillarPool.length) {
                const m = runnerPillarPool[pilIdx++];
                m.visible = true;
                m.position.set(ox, 1.4, obs.z);
              }
            }

            for (let i = ringIdx; i < runnerRingPool.length; i++) runnerRingPool[i].visible = false;
            for (let i = barIdx; i < runnerBarrierPool.length; i++) runnerBarrierPool[i].visible = false;
            for (let i = pilIdx; i < runnerPillarPool.length; i++) runnerPillarPool[i].visible = false;
          } else if (g === 'invaders') {
            if (stateRef.current.config.invaders?.autoFire || isPointerDown) {
              invadersAutoFireAccum += dt;
              if (invadersAutoFireAccum >= 0.25) {
                invadersAutoFireAccum = 0;
                if (invadersEngine.fireLaser()) soundFX.playLaserShoot();
              }
            } else {
              invadersAutoFireAccum = 0;
            }

            const prevWave = invadersEngine.wave;
            const step = invadersEngine.update(dt);
            if (invadersEngine.wave !== prevWave) {
              emitHudState();
            }
            if (step.marchStepped) {
              soundFX.playInvaderMarch();
            }
            if (step.alienKilled) {
              soundFX.playLineClear(1);
              shakeIntensity = 0.2;
              spawnBurst(step.alienKilled.x, 0.5, step.alienKilled.z, step.alienKilled.colorHex, 14);
              emitHudState();
            }
            if (step.ufoKilled) {
              soundFX.playVictory();
              shakeIntensity = 0.35;
              spawnBurst(step.ufoKilled.x, 0.8, -8.6, 0xfacc15, 28);
              emitHudState();
            }
            if (step.bunkerHit) {
              soundFX.playHardDrop();
              spawnBurst(step.bunkerHit.x, 0.4, step.bunkerHit.z, 0x06b6d4, 8);
              rebuildInvadersBunkersVisuals();
            }
            if (step.playerHit) {
              soundFX.playGameOver();
              shakeIntensity = 0.45;
              spawnBurst(invadersEngine.playerX, 0.5, CANNON_Z, 0xf43f5e, 26);
              emitHudState();
            }
            if (invadersEngine.ufo.active) {
              invadersUfoHumAccum += dt;
              if (invadersUfoHumAccum >= 0.38) {
                invadersUfoHumAccum = 0;
                soundFX.playUfoHum();
              }
            } else {
              invadersUfoHumAccum = 0;
            }

            if (invadersEngine.isGameOver) {
              const won = invadersEngine.isVictory;
              if (won) soundFX.playVictory();
              else soundFX.playGameOver();
              stateRef.current.onGameEnd(won ? 'VICTORY' : 'GAME_OVER', {
                game: 'invaders',
                score: invadersEngine.score,
                linesOrLength: invadersEngine.wave,
                level: invadersEngine.wave,
              });
            }

            // Sync Cannon Position
            invadersCannonMesh.position.x = invadersEngine.playerX;

            // Sync UFO Mothership
            invadersUfoMesh.visible = invadersEngine.ufo.active;
            if (invadersEngine.ufo.active) {
              invadersUfoMesh.position.set(invadersEngine.ufo.x, 0.65, invadersEngine.ufo.z);
              invadersUfoMesh.rotation.y = elapsed * 4.5;
            }

            // Sync Pooled Aliens (ZERO allocations!)
            for (let i = 0; i < invadersAlienPool.length; i++) {
              const alien = invadersEngine.aliens[i];
              const drone = invadersAlienPool[i];
              if (alien && alien.alive) {
                drone.visible = true;
                drone.position.set(
                  alien.x,
                  0.42 + Math.sin(elapsed * 4 + alien.col) * 0.04,
                  alien.z
                );
              } else {
                drone.visible = false;
              }
            }

            // Sync Pooled Bullets (ZERO allocations!)
            for (let i = 0; i < invadersBulletPool.length; i++) {
              const b = invadersEngine.bullets[i];
              const bMesh = invadersBulletPool[i];
              if (b && b.active) {
                bMesh.visible = true;
                bMesh.material = b.isPlayer ? playerLaserMat : enemyLaserMat;
                bMesh.position.set(b.x, 0.38, b.z);
              } else {
                bMesh.visible = false;
              }
            }
          } else if (g === 'pac') {
            const step = pacEngine.update(dt);
            if (step.atePellet) {
              soundFX.playSoftDrop();
              syncPacPelletsVisuals();
              emitHudState();
            }
            if (step.atePowerCore) {
              soundFX.playSnakeEat(3);
              shakeIntensity = 0.22;
              const px = (pacEngine.playerCol - pacHalf) * 1.0;
              const pz = (pacEngine.playerRow - pacHalf) * 1.0;
              spawnBurst(px, 0.5, pz, 0xfacc15, 20);
              syncPacPelletsVisuals();
              emitHudState();
            }
            if (step.ateGhost) {
              soundFX.playLineClear(2);
              shakeIntensity = 0.28;
              spawnBurst(step.ateGhost.x, 0.6, step.ateGhost.z, 0x3b82f6, 22);
              emitHudState();
            }
            if (step.waveCleared) {
              soundFX.playVictory();
              shakeIntensity = 0.35;
              spawnBurst(0, 0.8, 0, 0x06b6d4, 30);
              syncPacPelletsVisuals();
              emitHudState();
            }
            if (step.playerHit) {
              shakeIntensity = 0.45;
              soundFX.playGameOver();
              const px = (pacEngine.playerCol - pacHalf) * 1.0;
              const pz = (pacEngine.playerRow - pacHalf) * 1.0;
              spawnBurst(px, 0.5, pz, 0xf43f5e, 26);
              emitHudState();
            }
            if (pacEngine.isGameOver) {
              stateRef.current.onGameEnd('GAME_OVER', {
                game: 'pac',
                score: pacEngine.score,
                linesOrLength: pacEngine.wave,
                level: pacEngine.wave,
              });
            }

            // Smoothly interpolate Cyber Pac position & chomping animation
            const alpha = pacEngine.moveProgress;
            const colDiff = Math.abs(pacEngine.playerCol - pacEngine.prevPlayerCol);
            const interpCol =
              colDiff > 2
                ? pacEngine.playerCol
                : THREE.MathUtils.lerp(pacEngine.prevPlayerCol, pacEngine.playerCol, alpha);
            const interpRow = THREE.MathUtils.lerp(
              pacEngine.prevPlayerRow,
              pacEngine.playerRow,
              alpha
            );

            pacActor.group.position.set((interpCol - pacHalf) * 1.0, 0, (interpRow - pacHalf) * 1.0);
            if (pacEngine.dirRow !== 0 || pacEngine.dirCol !== 0) {
              pacActor.group.rotation.y = Math.atan2(pacEngine.dirCol, pacEngine.dirRow);
            }

            const chompAngle = Math.abs(Math.sin(elapsed * 14)) * 0.42;
            pacActor.upperJaw.rotation.x = -chompAngle;
            pacActor.lowerJaw.rotation.x = chompAngle;
            pacActor.shieldRing.visible = pacEngine.dashTimer > 0;
            if (pacEngine.dashTimer > 0) {
              pacActor.shieldRing.rotation.z = elapsed * 8;
            }

            // Animate Overdrive Power Cores
            for (let i = 0; i < pacPowerCores.length; i++) {
              const pc = pacPowerCores[i];
              if (pc.visible) {
                pc.rotation.y = elapsed * 2.5;
              }
            }

            // Smoothly interpolate Hunter Drones & Overdrive vulnerability materials
            const isFrightened = pacEngine.frightenedTimer > 0;
            const isFlashing =
              isFrightened &&
              pacEngine.frightenedTimer < 1.8 &&
              Math.floor(elapsed * 8) % 2 === 0;

            for (let i = 0; i < pacEngine.ghosts.length; i++) {
              const ghost = pacEngine.ghosts[i];
              const actor = pacGhostActors[i];
              if (!actor) continue;

              const gColDiff = Math.abs(ghost.col - ghost.prevCol);
              const gCol =
                gColDiff > 2
                  ? ghost.col
                  : THREE.MathUtils.lerp(ghost.prevCol, ghost.col, alpha);
              const gRow = THREE.MathUtils.lerp(ghost.prevRow, ghost.row, alpha);

              actor.group.position.set(
                (gCol - pacHalf) * 1.0,
                Math.sin(elapsed * 5 + i) * 0.04,
                (gRow - pacHalf) * 1.0
              );
              if (ghost.dirRow !== 0 || ghost.dirCol !== 0) {
                actor.group.rotation.y = Math.atan2(ghost.dirCol, ghost.dirRow);
              }

              const targetMat = isFrightened
                ? isFlashing
                  ? actor.frightFlashMat
                  : actor.frightBodyMat
                : actor.normalBodyMat;

              if (actor.shroudMesh.material !== targetMat) {
                actor.shroudMesh.material = targetMat;
                (actor.shroudMesh.children[0] as THREE.Mesh).material = targetMat;
              }
              actor.skirtRing.material = isFrightened ? actor.frightFlashMat : actor.normalGlowMat;
            }
          }
        }

        // Update pooled InstancedMesh particles
        let anyActiveParticle = false;
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const p = particles[i];
          if (p.active) {
            anyActiveParticle = true;
            p.life -= dt;
            if (p.life <= 0) {
              p.active = false;
              _dummyObj.position.set(0, -100, 0);
              _dummyObj.scale.setScalar(0.001);
              _dummyObj.updateMatrix();
              particleMesh.setMatrixAt(i, _dummyObj.matrix);
            } else {
              p.vy -= 9.8 * dt;
              p.x += p.vx * dt;
              p.y = Math.max(0.08, p.y + p.vy * dt);
              p.z += p.vz * dt;
              const lifeRatio = p.life / p.maxLife;
              _dummyObj.position.set(p.x, p.y, p.z);
              _dummyObj.rotation.set(elapsed * 4 + i, elapsed * 3, 0);
              _dummyObj.scale.setScalar(p.scale * lifeRatio);
              _dummyObj.updateMatrix();
              particleMesh.setMatrixAt(i, _dummyObj.matrix);
            }
          }
        }
        if (anyActiveParticle) {
          particleMesh.instanceMatrix.needsUpdate = true;
        }

        frameCount++;
        if (!isSoftwareGl && frameCount % 2 === 0) {
          renderer.shadowMap.needsUpdate = true;
        }
        renderer.render(scene, camera);
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      }

      // Pre-compile all WebGL shaders & upload GPU textures outside requestAnimationFrame
      // so the first RAF tick and game switches never stall the frame budget.
      const allStageGroups = [
        hubGroup,
        tetrisGroup,
        xoGroup,
        snakeGroup,
        breakerGroup,
        pongGroup,
        connect4Group,
        merge2048Group,
        runnerGroup,
        minesGroup,
        invadersGroup,
        pacGroup,
      ];
      allStageGroups.forEach((grp) => {
        grp.visible = true;
      });
      renderer.compile(scene, camera);
      allStageGroups.forEach((grp) => {
        grp.visible = grp === hubGroup;
      });
      renderer.render(scene, camera);
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);

      const handleResize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = Math.max(1, container.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        if (aiMoveTimeout !== null) clearTimeout(aiMoveTimeout);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        domElem.removeEventListener('pointerdown', handlePointerDown);
        domElem.removeEventListener('pointermove', handlePointerMove);
        domElem.removeEventListener('pointerup', handlePointerUp);
        domElem.removeEventListener('pointercancel', handlePointerCancel);
        renderer.dispose();
      };
    }, []);

    return (
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full z-0 overflow-hidden bg-[#07090E] touch-none select-none"
        aria-label="Kinetix Arcade 3D Stage"
      />
    );
  }
);
