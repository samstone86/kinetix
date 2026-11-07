import * as THREE from 'three';
import { GameId } from '../types/arcade';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
let sharedGridTex: THREE.CanvasTexture | null = null;
const numberLabelTexCache = new Map<string, THREE.CanvasTexture>();

// Shared Geometry & Material Caches (Zero Runtime GPU Leaks on Mobile)
const geoCache = new Map<string, THREE.BufferGeometry>();
const stdMatCache = new Map<string, THREE.MeshStandardMaterial>();
const basicMatCache = new Map<string, THREE.MeshBasicMaterial>();
const lineMatCache = new Map<string, THREE.LineBasicMaterial>();

function getBoxGeo(w: number, h: number, d: number): THREE.BufferGeometry {
  const key = `box_${w}_${h}_${d}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

function getCylGeo(rt: number, rb: number, h: number, segs = 16): THREE.BufferGeometry {
  const key = `cyl_${rt}_${rb}_${h}_${segs}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, segs);
    geoCache.set(key, g);
  }
  return g;
}

function getConeGeo(r: number, h: number, segs = 8): THREE.BufferGeometry {
  const key = `cone_${r}_${h}_${segs}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.ConeGeometry(r, h, segs);
    geoCache.set(key, g);
  }
  return g;
}

function getTorusGeo(r: number, tube: number, rSegs = 12, tSegs = 24): THREE.BufferGeometry {
  const key = `torus_${r}_${tube}_${rSegs}_${tSegs}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.TorusGeometry(r, tube, rSegs, tSegs);
    geoCache.set(key, g);
  }
  return g;
}

function getSphereGeo(r: number, wSegs = 12, hSegs = 12): THREE.BufferGeometry {
  const key = `sphere_${r}_${wSegs}_${hSegs}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.SphereGeometry(r, wSegs, hSegs);
    geoCache.set(key, g);
  }
  return g;
}

function getOctaGeo(r: number, detail = 0): THREE.BufferGeometry {
  const key = `octa_${r}_${detail}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.OctahedronGeometry(r, detail);
    geoCache.set(key, g);
  }
  return g;
}

function getPlaneGeo(w: number, h: number): THREE.BufferGeometry {
  const key = `plane_${w}_${h}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.PlaneGeometry(w, h);
    geoCache.set(key, g);
  }
  return g;
}

function getPrismExtrudeGeo(): THREE.BufferGeometry {
  const key = 'prism_extrude';
  let g = geoCache.get(key);
  if (!g) {
    const shape = new THREE.Shape();
    const s = 0.41;
    shape.moveTo(-s, -s);
    shape.lineTo(s, -s);
    shape.lineTo(s, s);
    shape.lineTo(-s, s);
    shape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    });
    extrudeGeo.center();
    g = extrudeGeo;
    geoCache.set(key, g);
  }
  return g;
}

function getGhostEdgesGeo(): THREE.BufferGeometry {
  const key = 'ghost_edges';
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.EdgesGeometry(getBoxGeo(0.9, 0.9, 0.9));
    geoCache.set(key, g);
  }
  return g;
}

export function getCachedStandardMat(
  key: string,
  params: THREE.MeshStandardMaterialParameters
): THREE.MeshStandardMaterial {
  let m = stdMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial(params);
    stdMatCache.set(key, m);
  }
  return m;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedContactShadowTex) return sharedContactShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedContactShadowTex = tex;
  return tex;
}

export function getProceduralGridTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  if (sharedGridTex) return sharedGridTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 254, 254);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  sharedGridTex = tex;
  return tex;
}

export function getNumberTileTexture(
  text: string,
  bgHex: string,
  fgHex = '#FFFFFF'
): THREE.CanvasTexture {
  const key = `${text}_${bgHex}_${fgHex}`;
  const cached = numberLabelTexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 10;
  ctx.strokeRect(12, 12, 232, 232);

  ctx.fillStyle = fgHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = text.length >= 4 ? 68 : text.length === 3 ? 82 : 98;
  ctx.font = `800 ${fontSize}px "Outfit", sans-serif`;
  ctx.fillText(text, 128, 132);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  numberLabelTexCache.set(key, tex);
  return tex;
}

export function createContactShadowMesh(radius = 1.2, opacity = 0.45): THREE.Mesh {
  const geo = getPlaneGeo(radius * 2, radius * 2);
  const key = `shadow_${opacity}`;
  let mat = basicMatCache.get(key);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      map: getContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity,
    });
    basicMatCache.set(key, mat);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

/**
 * 1. Composite 4-part beveled 3D Tetromino Cube Assembly (Prism Drop)
 */
export function createPrismCellAssembly(colorHex: number, isGhost = false): THREE.Group {
  const group = new THREE.Group();

  if (isGhost) {
    const lineKey = `ghost_line_${colorHex}`;
    let lineMat = lineMatCache.get(lineKey);
    if (!lineMat) {
      lineMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.48,
      });
      lineMatCache.set(lineKey, lineMat);
    }
    const wireframe = new THREE.LineSegments(getGhostEdgesGeo(), lineMat);

    const coreMat = getCachedStandardMat(`ghost_core_${colorHex}`, {
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.18,
      roughness: 0.3,
      metalness: 0.2,
    });
    const core = new THREE.Mesh(getBoxGeo(0.62, 0.62, 0.62), coreMat);
    group.add(wireframe, core);
    return group;
  }

  const shellMat = getCachedStandardMat('prism_shell', {
    color: 0x161f30,
    roughness: 0.25,
    metalness: 0.85,
  });
  const shell = new THREE.Mesh(getPrismExtrudeGeo(), shellMat);
  shell.castShadow = true;
  shell.receiveShadow = true;

  const coreMat = getCachedStandardMat(`prism_core_${colorHex}`, {
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.2,
  });
  const core = new THREE.Mesh(getBoxGeo(0.66, 0.66, 0.92), coreMat);

  const capMat = getCachedStandardMat(`prism_cap_${colorHex}`, {
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.15,
    roughness: 0.4,
    metalness: 0.5,
  });
  const cap = new THREE.Mesh(getBoxGeo(0.38, 0.38, 0.96), capMat);

  group.add(shell, core, cap);
  return group;
}

/**
 * 2. Composite 6-Part 3D 'X' & 'O' Mark Assemblies (Quantum Grid)
 */
export function createXMarkAssembly(): THREE.Group {
  const group = new THREE.Group();

  const bladeMat = getCachedStandardMat('xo_blade_x', {
    color: 0x06b6d4,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.3,
  });

  const trimMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.9,
  });

  const bladeGeo = getBoxGeo(1.18, 0.22, 0.22);
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  blade1.position.y = 0.14;
  blade1.rotation.y = Math.PI / 4;
  blade1.castShadow = true;

  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.position.y = 0.14;
  blade2.rotation.y = -Math.PI / 4;
  blade2.castShadow = true;

  const baseGeo = getBoxGeo(1.24, 0.1, 0.28);
  const base1 = new THREE.Mesh(baseGeo, trimMat);
  base1.position.y = 0.06;
  base1.rotation.y = Math.PI / 4;

  const base2 = new THREE.Mesh(baseGeo, trimMat);
  base2.position.y = 0.06;
  base2.rotation.y = -Math.PI / 4;

  const ring = new THREE.Mesh(getCylGeo(0.24, 0.28, 0.26, 20), trimMat);
  ring.position.y = 0.14;

  const core = new THREE.Mesh(getCylGeo(0.14, 0.14, 0.3, 16), bladeMat);
  core.position.y = 0.15;

  const shadow = createContactShadowMesh(0.65, 0.5);
  group.add(base1, base2, blade1, blade2, ring, core, shadow);
  return group;
}

export function createOMarkAssembly(): THREE.Group {
  const group = new THREE.Group();

  const torusMat = getCachedStandardMat('xo_torus_o', {
    color: 0xf43f5e,
    emissive: 0xff2a5f,
    emissiveIntensity: 0.85,
    roughness: 0.16,
    metalness: 0.25,
  });

  const metalMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.9,
  });

  const torus = new THREE.Mesh(getTorusGeo(0.42, 0.11, 16, 32), torusMat);
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 0.16;
  torus.castShadow = true;

  const collar = new THREE.Mesh(getTorusGeo(0.42, 0.13, 12, 24), metalMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.07;

  const finGeo = getBoxGeo(0.16, 0.24, 0.12);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const fin = new THREE.Mesh(finGeo, metalMat);
    fin.position.set(Math.cos(angle) * 0.42, 0.15, Math.sin(angle) * 0.42);
    fin.rotation.y = -angle;
    group.add(fin);
  }

  const shadow = createContactShadowMesh(0.65, 0.5);
  group.add(collar, torus, shadow);
  return group;
}

/**
 * 3. Composite 7-Part Cyber-Viper Head & Segment Assemblies (Viper Pulse)
 */
export function createViperHeadAssembly(): THREE.Group {
  const group = new THREE.Group();

  const armorMat = getCachedStandardMat('viper_armor', {
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.45,
  });

  const darkChassisMat = getCachedStandardMat('viper_chassis', {
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.85,
  });

  const eyeMat = getCachedStandardMat('viper_eye', {
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.6,
    roughness: 0.1,
  });

  const hull = new THREE.Mesh(getBoxGeo(0.76, 0.48, 0.86), armorMat);
  hull.position.set(0, 0.32, 0);
  hull.castShadow = true;

  const snout = new THREE.Mesh(getConeGeo(0.46, 0.52, 4), armorMat);
  snout.rotation.x = Math.PI / 2;
  snout.rotation.y = Math.PI / 4;
  snout.position.set(0, 0.28, 0.52);

  const jaw = new THREE.Mesh(getBoxGeo(0.62, 0.16, 0.78), darkChassisMat);
  jaw.position.set(0, 0.14, 0.08);

  const eyeGeo = getBoxGeo(0.14, 0.1, 0.22);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.32, 0.38, 0.24);
  leftEye.rotation.y = 0.2;

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.32, 0.38, 0.24);
  rightEye.rotation.y = -0.2;

  const crest = new THREE.Mesh(getBoxGeo(0.14, 0.22, 0.58), eyeMat);
  crest.position.set(0, 0.58, -0.06);

  const collar = new THREE.Mesh(getCylGeo(0.32, 0.36, 0.2, 12), darkChassisMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.3, -0.44);

  const shadow = createContactShadowMesh(0.62, 0.5);
  group.add(hull, snout, jaw, leftEye, rightEye, crest, collar, shadow);
  return group;
}

export function createViperSegmentAssembly(): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = getCachedStandardMat('viper_seg_body', {
    color: 0x059669,
    emissive: 0x10b981,
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.35,
  });

  const ribMat = getCachedStandardMat('viper_seg_rib', {
    color: 0x34d399,
    emissive: 0x34d399,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.7,
  });

  const core = new THREE.Mesh(getBoxGeo(0.68, 0.42, 0.68), bodyMat);
  core.position.y = 0.26;
  core.castShadow = true;

  const rib = new THREE.Mesh(getBoxGeo(0.74, 0.14, 0.26), ribMat);
  rib.position.y = 0.46;

  const shadow = createContactShadowMesh(0.48, 0.38);
  group.add(core, rib, shadow);
  return group;
}

export function createPlasmaCoreAssembly(): THREE.Group {
  const group = new THREE.Group();

  const coreMat = getCachedStandardMat('plasma_core_mat', {
    color: 0xf59e0b,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    metalness: 0.2,
  });

  const ringMat = getCachedStandardMat('plasma_ring_mat', {
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.85,
  });

  const crystal = new THREE.Mesh(getOctaGeo(0.28, 0), coreMat);
  crystal.position.y = 0.48;

  const ring1 = new THREE.Mesh(getTorusGeo(0.42, 0.035, 12, 24), ringMat);
  ring1.position.y = 0.48;

  const ring2 = new THREE.Mesh(getTorusGeo(0.36, 0.03, 12, 24), ringMat);
  ring2.position.y = 0.48;
  ring2.rotation.y = Math.PI / 2;

  const shadow = createContactShadowMesh(0.55, 0.55);
  group.add(crystal, ring1, ring2, shadow);
  return group;
}

/**
 * 4. Composite 5-Part Cyber Paddle Assembly (Aegis Breaker & Vector Pong)
 */
export function createCyberPaddleAssembly(accentHex = 0x06b6d4): THREE.Group {
  const group = new THREE.Group();

  const metalMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.9,
  });
  const glowMat = getCachedStandardMat(`paddle_glow_${accentHex}`, {
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.1,
    roughness: 0.15,
    metalness: 0.3,
  });

  const hull = new THREE.Mesh(getBoxGeo(2.2, 0.34, 0.46), metalMat);
  hull.position.y = 0.22;
  hull.castShadow = true;

  const strip = new THREE.Mesh(getBoxGeo(2.05, 0.18, 0.52), glowMat);
  strip.position.y = 0.22;

  const capGeo = getCylGeo(0.24, 0.24, 0.38, 16);
  const leftCap = new THREE.Mesh(capGeo, metalMat);
  leftCap.position.set(-1.1, 0.22, 0);
  const rightCap = new THREE.Mesh(capGeo, metalMat);
  rightCap.position.set(1.1, 0.22, 0);

  const shadow = createContactShadowMesh(1.3, 0.45);
  group.add(hull, strip, leftCap, rightCap, shadow);
  return group;
}

/**
 * 5. Composite 4-Part Energy Disc Assembly (Gravity Drop 4)
 */
export function createConnect4DiscAssembly(player: 1 | 2): THREE.Group {
  const group = new THREE.Group();
  const colorHex = player === 1 ? 0x06b6d4 : 0xf43f5e;

  const rimMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.88,
  });
  const coreMat = getCachedStandardMat(`c4_disc_${colorHex}`, {
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.95,
    roughness: 0.15,
    metalness: 0.2,
  });

  const rim = new THREE.Mesh(getTorusGeo(0.38, 0.08, 12, 24), rimMat);
  const core = new THREE.Mesh(getCylGeo(0.34, 0.34, 0.18, 20), coreMat);
  core.rotation.x = Math.PI / 2;

  const hub = new THREE.Mesh(getCylGeo(0.14, 0.14, 0.24, 16), rimMat);
  hub.rotation.x = Math.PI / 2;

  group.add(rim, core, hub);
  return group;
}

/**
 * 6. Composite 4-Part Skyscraper Tile Monolith (Hexa Pulse 2048)
 */
export function create2048MonolithAssembly(value: number): THREE.Group {
  const group = new THREE.Group();
  const level = Math.max(1, Math.round(Math.log2(value)));
  const height = 0.28 + level * 0.15;

  const palette: Record<number, { hex: number; bg: string }> = {
    2: { hex: 0x38bdf8, bg: '#0284C7' },
    4: { hex: 0x06b6d4, bg: '#0891B2' },
    8: { hex: 0x10b981, bg: '#059669' },
    16: { hex: 0x8b5cf6, bg: '#6D28D9' },
    32: { hex: 0xd946ef, bg: '#A21CAF' },
    64: { hex: 0xf43f5e, bg: '#E11D48' },
    128: { hex: 0xf97316, bg: '#EA580C' },
    256: { hex: 0xf59e0b, bg: '#D97706' },
    512: { hex: 0xeab308, bg: '#CA8A04' },
    1024: { hex: 0x22d3ee, bg: '#0E7490' },
    2048: { hex: 0xfacc15, bg: '#B45309' },
  };
  const style = palette[value] || { hex: 0xfacc15, bg: '#B45309' };

  const plinthMat = getCachedStandardMat('monolith_plinth', {
    color: 0x0f172a,
    roughness: 0.35,
    metalness: 0.85,
  });
  const basePlinth = new THREE.Mesh(getBoxGeo(1.52, 0.14, 1.52), plinthMat);
  basePlinth.position.y = 0.07;

  const bodyMat = getCachedStandardMat(`monolith_body_${value}`, {
    color: style.hex,
    emissive: style.hex,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.3,
  });
  const tower = new THREE.Mesh(getBoxGeo(1.38, height, 1.38), bodyMat);
  tower.position.y = 0.14 + height / 2;
  tower.castShadow = true;

  const labelTex = getNumberTileTexture(String(value), style.bg);
  const capKey = `monolith_cap_${value}`;
  let capMat = basicMatCache.get(capKey);
  if (!capMat) {
    capMat = new THREE.MeshBasicMaterial({ map: labelTex });
    basicMatCache.set(capKey, capMat);
  }
  const topCap = new THREE.Mesh(getPlaneGeo(1.3, 1.3), capMat);
  topCap.rotation.x = -Math.PI / 2;
  topCap.position.y = 0.14 + height + 0.01;

  group.add(basePlinth, tower, topCap);
  return group;
}

function getStarfighterWingGeo(): THREE.BufferGeometry {
  const key = 'starfighter_delta_wing';
  let g = geoCache.get(key);
  if (!g) {
    const shape = new THREE.Shape();
    // +Y in shape maps to -Z in 3D space (forward nose) after rotation.x = -Math.PI / 2
    shape.moveTo(0, 1.28);
    shape.lineTo(0.24, 0.55);
    shape.lineTo(0.34, 0.22);
    shape.lineTo(1.24, -0.35);
    shape.lineTo(1.24, -0.68);
    shape.lineTo(0.52, -0.5);
    shape.lineTo(0.42, -0.82);
    shape.lineTo(0, -0.68);
    shape.lineTo(-0.42, -0.82);
    shape.lineTo(-0.52, -0.5);
    shape.lineTo(-1.24, -0.68);
    shape.lineTo(-1.24, -0.35);
    shape.lineTo(-0.34, 0.22);
    shape.lineTo(-0.24, 0.55);
    shape.closePath();

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    extrude.center();
    g = extrude;
    geoCache.set(key, g);
  }
  return g;
}

function getStarfighterFuselageGeo(): THREE.BufferGeometry {
  const key = 'starfighter_fuselage_spine';
  let g = geoCache.get(key);
  if (!g) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.48);
    shape.lineTo(0.17, 0.68);
    shape.lineTo(0.28, 0.08);
    shape.lineTo(0.3, -0.55);
    shape.lineTo(0.2, -0.92);
    shape.lineTo(-0.2, -0.92);
    shape.lineTo(-0.3, -0.55);
    shape.lineTo(-0.28, 0.08);
    shape.lineTo(-0.17, 0.68);
    shape.closePath();

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    extrude.center();
    g = extrude;
    geoCache.set(key, g);
  }
  return g;
}

function getStarfighterCanopyGeo(): THREE.BufferGeometry {
  const key = 'starfighter_canopy_glass';
  let g = geoCache.get(key);
  if (!g) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.6);
    shape.lineTo(0.18, 0.14);
    shape.lineTo(0.14, -0.38);
    shape.lineTo(0, -0.48);
    shape.lineTo(-0.14, -0.38);
    shape.lineTo(-0.18, 0.14);
    shape.closePath();

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: 0.13,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.035,
    });
    extrude.center();
    g = extrude;
    geoCache.set(key, g);
  }
  return g;
}

function getStarfighterTailFinGeo(): THREE.BufferGeometry {
  const key = 'starfighter_tail_fin';
  let g = geoCache.get(key);
  if (!g) {
    const shape = new THREE.Shape();
    // Drawn in side profile: X is longitudinal (-forward, +aft), Y is vertical height
    shape.moveTo(-0.28, -0.18);
    shape.lineTo(0.26, -0.18);
    shape.lineTo(0.38, 0.22);
    shape.lineTo(0.08, 0.22);
    shape.closePath();

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    extrude.center();
    g = extrude;
    geoCache.set(key, g);
  }
  return g;
}

/**
 * 7. Rebuilt Multi-Part Valkyrie-X Swept-Delta Starfighter Assembly (Void Runner)
 */
export function createStarfighterAssembly(): THREE.Group {
  const group = new THREE.Group();
  const airframe = new THREE.Group();

  const wingHullMat = getCachedStandardMat('starfighter_wing_hull', {
    color: 0x162032,
    roughness: 0.26,
    metalness: 0.88,
  });

  const spineArmorMat = getCachedStandardMat('starfighter_spine_armor', {
    color: 0x334155,
    roughness: 0.22,
    metalness: 0.82,
  });

  const darkTrimMat = getCachedStandardMat('dark_trim_90', {
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.9,
  });

  const cyanGlowMat = getCachedStandardMat('starfighter_glow', {
    color: 0x06b6d4,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.15,
    roughness: 0.14,
    metalness: 0.35,
  });

  const thrusterCoreMat = getCachedStandardMat('starfighter_thruster', {
    color: 0xf43f5e,
    emissive: 0xff2a5f,
    emissiveIntensity: 2.1,
    roughness: 0.1,
  });

  const plumeOuterMat = getCachedStandardMat('starfighter_plume_outer', {
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 1.9,
    transparent: true,
    opacity: 0.82,
    roughness: 0.1,
  });

  const plumeInnerMat = getCachedStandardMat('starfighter_plume_inner', {
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });

  // 1. Swept Delta Main Wing
  const deltaWing = new THREE.Mesh(getStarfighterWingGeo(), wingHullMat);
  deltaWing.rotation.x = -Math.PI / 2;
  deltaWing.position.set(0, 0.42, 0.05);
  deltaWing.castShadow = true;
  deltaWing.receiveShadow = true;

  // 2. Sculpted Central Fuselage Spine & Nose Cone
  const fuselageSpine = new THREE.Mesh(getStarfighterFuselageGeo(), spineArmorMat);
  fuselageSpine.rotation.x = -Math.PI / 2;
  fuselageSpine.position.set(0, 0.48, -0.04);
  fuselageSpine.castShadow = true;

  // 3. Faceted Cyan Crystal Cockpit Canopy
  const canopy = new THREE.Mesh(getStarfighterCanopyGeo(), cyanGlowMat);
  canopy.rotation.x = -Math.PI / 2;
  canopy.position.set(0, 0.59, -0.02);

  // 4. Swept Leading-Edge Neon Wing Strips
  const stripGeo = getBoxGeo(0.86, 0.045, 0.075);
  const leftStrip = new THREE.Mesh(stripGeo, cyanGlowMat);
  leftStrip.position.set(-0.72, 0.46, 0.08);
  leftStrip.rotation.y = 0.56;

  const rightStrip = new THREE.Mesh(stripGeo, cyanGlowMat);
  rightStrip.position.set(0.72, 0.46, 0.08);
  rightStrip.rotation.y = -0.56;

  // 5. Wingtip Weapon Pods & Forward Pulse Laser Barrels
  const podGeo = getBoxGeo(0.13, 0.13, 0.62);
  const barrelGeo = getCylGeo(0.03, 0.042, 0.52, 10);

  const leftPod = new THREE.Mesh(podGeo, spineArmorMat);
  leftPod.position.set(-1.22, 0.42, 0.48);
  const rightPod = new THREE.Mesh(podGeo, spineArmorMat);
  rightPod.position.set(1.22, 0.42, 0.48);

  const leftBarrel = new THREE.Mesh(barrelGeo, cyanGlowMat);
  leftBarrel.rotation.x = Math.PI / 2;
  leftBarrel.position.set(-1.22, 0.42, 0.02);
  const rightBarrel = new THREE.Mesh(barrelGeo, cyanGlowMat);
  rightBarrel.rotation.x = Math.PI / 2;
  rightBarrel.position.set(1.22, 0.42, 0.02);

  // 6. Twin Canted V-Tail Stabilizer Fins
  const finGeo = getStarfighterTailFinGeo();
  const leftFin = new THREE.Mesh(finGeo, wingHullMat);
  leftFin.rotation.y = -Math.PI / 2;
  leftFin.rotation.z = 0.34;
  leftFin.position.set(-0.38, 0.62, 0.56);
  leftFin.castShadow = true;

  const rightFin = new THREE.Mesh(finGeo, wingHullMat);
  rightFin.rotation.y = -Math.PI / 2;
  rightFin.rotation.z = -0.34;
  rightFin.position.set(0.38, 0.62, 0.56);
  rightFin.castShadow = true;

  // 7. Twin Vector Thruster Nacelles & Animated Afterburner Plumes
  const nacelleGeo = getCylGeo(0.14, 0.16, 0.68, 16);
  const nozzleCollarGeo = getCylGeo(0.16, 0.125, 0.18, 16);
  const coreRingGeo = getCylGeo(0.105, 0.105, 0.2, 14);
  const outerPlumeGeo = getConeGeo(0.115, 0.56, 12);
  const innerPlumeGeo = getConeGeo(0.065, 0.36, 10);

  const leftNacelle = new THREE.Mesh(nacelleGeo, darkTrimMat);
  leftNacelle.rotation.x = Math.PI / 2;
  leftNacelle.position.set(-0.24, 0.44, 0.52);

  const rightNacelle = new THREE.Mesh(nacelleGeo, darkTrimMat);
  rightNacelle.rotation.x = Math.PI / 2;
  rightNacelle.position.set(0.24, 0.44, 0.52);

  const leftNozzle = new THREE.Mesh(nozzleCollarGeo, spineArmorMat);
  leftNozzle.rotation.x = Math.PI / 2;
  leftNozzle.position.set(-0.24, 0.44, 0.88);

  const rightNozzle = new THREE.Mesh(nozzleCollarGeo, spineArmorMat);
  rightNozzle.rotation.x = Math.PI / 2;
  rightNozzle.position.set(0.24, 0.44, 0.88);

  const leftCore = new THREE.Mesh(coreRingGeo, thrusterCoreMat);
  leftCore.rotation.x = Math.PI / 2;
  leftCore.position.set(-0.24, 0.44, 0.9);

  const rightCore = new THREE.Mesh(coreRingGeo, thrusterCoreMat);
  rightCore.rotation.x = Math.PI / 2;
  rightCore.position.set(0.24, 0.44, 0.9);

  const leftPlume = new THREE.Group();
  leftPlume.position.set(-0.24, 0.44, 0.96);
  const leftOuterFlame = new THREE.Mesh(outerPlumeGeo, plumeOuterMat);
  leftOuterFlame.rotation.x = Math.PI / 2;
  leftOuterFlame.position.z = 0.26;
  const leftInnerFlame = new THREE.Mesh(innerPlumeGeo, plumeInnerMat);
  leftInnerFlame.rotation.x = Math.PI / 2;
  leftInnerFlame.position.z = 0.16;
  leftPlume.add(leftOuterFlame, leftInnerFlame);

  const rightPlume = new THREE.Group();
  rightPlume.position.set(0.24, 0.44, 0.96);
  const rightOuterFlame = new THREE.Mesh(outerPlumeGeo, plumeOuterMat);
  rightOuterFlame.rotation.x = Math.PI / 2;
  rightOuterFlame.position.z = 0.26;
  const rightInnerFlame = new THREE.Mesh(innerPlumeGeo, plumeInnerMat);
  rightInnerFlame.rotation.x = Math.PI / 2;
  rightInnerFlame.position.z = 0.16;
  rightPlume.add(rightOuterFlame, rightInnerFlame);

  // 8. Phase Shift Overdrive Energy Shield Shell
  const shieldMat = getCachedStandardMat('starfighter_phase_shield', {
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.26,
    wireframe: true,
  });
  const shieldMesh = new THREE.Mesh(getOctaGeo(1.38, 1), shieldMat);
  shieldMesh.scale.set(1.05, 0.45, 1.15);
  shieldMesh.position.set(0, 0.48, 0.05);
  shieldMesh.visible = false;

  airframe.add(
    deltaWing,
    fuselageSpine,
    canopy,
    leftStrip,
    rightStrip,
    leftPod,
    rightPod,
    leftBarrel,
    rightBarrel,
    leftFin,
    rightFin,
    leftNacelle,
    rightNacelle,
    leftNozzle,
    rightNozzle,
    leftCore,
    rightCore,
    leftPlume,
    rightPlume,
    shieldMesh
  );

  const shadow = createContactShadowMesh(1.22, 0.55);
  group.add(airframe, shadow);

  group.userData = {
    airframe,
    leftPlume,
    rightPlume,
    shieldMesh,
    shadow,
  };

  return group;
}

/**
 * 8. Composite 3D Hub Pedestal with Live Rotating Game Sculpture for all 10 Games
 */
export function createHubPedestalAssembly(
  accentHex: number,
  gameType: GameId
): { root: THREE.Group; hologram: THREE.Group; ringMesh: THREE.Mesh } {
  const root = new THREE.Group();

  const baseMat = getCachedStandardMat('pedestal_base', {
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.88,
  });

  const darkTrimMat = getCachedStandardMat('pedestal_trim', {
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.65,
  });

  const glowMat = getCachedStandardMat(`pedestal_glow_${accentHex}`, {
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.3,
    roughness: 0.2,
    metalness: 0.4,
  });

  const plinth = new THREE.Mesh(getCylGeo(1.55, 1.75, 0.34, 8), baseMat);
  plinth.position.y = 0.17;
  plinth.receiveShadow = true;

  const riser = new THREE.Mesh(getCylGeo(1.25, 1.38, 0.26, 20), darkTrimMat);
  riser.position.y = 0.47;

  const deck = new THREE.Mesh(getCylGeo(1.32, 1.25, 0.12, 24), baseMat);
  deck.position.y = 0.66;

  const ringMesh = new THREE.Mesh(getTorusGeo(1.22, 0.04, 12, 36), glowMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.74;

  const shadow = createContactShadowMesh(2.0, 0.6);
  root.add(shadow, plinth, riser, deck, ringMesh);

  const hologram = new THREE.Group();
  hologram.position.y = 1.85;

  if (gameType === 'tetris') {
    const coords = [
      [-1, 0, 0x06b6d4],
      [0, 0, 0x06b6d4],
      [1, 0, 0x06b6d4],
      [0, 1, 0x06b6d4],
      [-0.5, -1.1, 0x8b5cf6],
      [0.5, -1.1, 0x8b5cf6],
    ];
    coords.forEach(([x, y, c]) => {
      const cell = createPrismCellAssembly(c, false);
      cell.scale.setScalar(0.5);
      cell.position.set(x * 0.52, y * 0.52, 0);
      hologram.add(cell);
    });
  } else if (gameType === 'xo') {
    const barMat = getCachedStandardMat('xo_holo_bar', {
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
    });
    [-0.4, 0.4].forEach((p) => {
      const vBar = new THREE.Mesh(getBoxGeo(0.05, 1.9, 0.05), barMat);
      vBar.position.x = p;
      const hBar = new THREE.Mesh(getBoxGeo(1.9, 0.05, 0.05), barMat);
      hBar.position.y = p;
      hologram.add(vBar, hBar);
    });
    const xPiece = createXMarkAssembly();
    xPiece.rotation.x = Math.PI / 2;
    xPiece.scale.setScalar(0.45);
    const oPiece = createOMarkAssembly();
    oPiece.rotation.x = Math.PI / 2;
    oPiece.scale.setScalar(0.45);
    oPiece.position.set(-0.68, 0.68, 0);
    hologram.add(xPiece, oPiece);
  } else if (gameType === 'snake') {
    const head = createViperHeadAssembly();
    head.scale.setScalar(0.7);
    head.position.set(0.35, 0.25, 0.25);
    hologram.add(head);
    const core = createPlasmaCoreAssembly();
    core.scale.setScalar(0.7);
    core.position.set(-0.45, 0.1, -0.35);
    hologram.add(core);
  } else if (gameType === 'breaker') {
    const paddle = createCyberPaddleAssembly(0x8b5cf6);
    paddle.scale.setScalar(0.62);
    paddle.position.set(0, -0.65, 0);
    hologram.add(paddle);
    [
      [-0.6, 0.45, 0xf43f5e],
      [0, 0.45, 0x06b6d4],
      [0.6, 0.45, 0xf59e0b],
    ].forEach(([bx, by, col]) => {
      const brick = createPrismCellAssembly(col, false);
      brick.scale.set(0.55, 0.32, 0.35);
      brick.position.set(bx, by, 0);
      hologram.add(brick);
    });
  } else if (gameType === 'pong') {
    const p1 = createCyberPaddleAssembly(0x06b6d4);
    p1.scale.setScalar(0.55);
    p1.position.set(0, -0.65, 0);
    const p2 = createCyberPaddleAssembly(0xf43f5e);
    p2.scale.setScalar(0.55);
    p2.position.set(0, 0.65, 0);
    const puck = createPlasmaCoreAssembly();
    puck.scale.setScalar(0.65);
    puck.position.set(0, -0.3, 0);
    hologram.add(p1, p2, puck);
  } else if (gameType === 'connect4') {
    const d1 = createConnect4DiscAssembly(1);
    d1.position.set(-0.38, -0.25, 0);
    const d2 = createConnect4DiscAssembly(2);
    d2.position.set(0.38, -0.25, 0);
    const d3 = createConnect4DiscAssembly(1);
    d3.position.set(0, 0.42, 0);
    hologram.add(d1, d2, d3);
  } else if (gameType === 'merge2048') {
    const t1 = create2048MonolithAssembly(64);
    t1.scale.setScalar(0.45);
    t1.position.set(-0.42, -0.5, 0);
    const t2 = create2048MonolithAssembly(2048);
    t2.scale.setScalar(0.45);
    t2.position.set(0.42, -0.5, 0);
    hologram.add(t1, t2);
  } else if (gameType === 'runner') {
    const ship = createStarfighterAssembly();
    if (ship.userData?.shadow) {
      ship.userData.shadow.visible = false;
    }
    ship.scale.setScalar(0.72);
    ship.position.set(0, -0.12, 0.12);
    ship.rotation.set(0.18, 0.25, -0.22);

    const warpRing = new THREE.Mesh(getTorusGeo(0.72, 0.05, 12, 28), glowMat);
    warpRing.position.set(-0.18, 0.12, -0.42);
    warpRing.rotation.y = 0.25;
    hologram.add(ship, warpRing);
  } else if (gameType === 'mines') {
    const core = createPlasmaCoreAssembly();
    core.scale.setScalar(0.8);
    core.position.set(0, -0.1, 0);
    const ring = new THREE.Mesh(getTorusGeo(0.78, 0.05, 12, 24), glowMat);
    ring.position.y = 0.25;
    hologram.add(core, ring);
  } else if (gameType === 'invaders') {
    const cannon = createDefenseCannonAssembly();
    cannon.scale.setScalar(0.75);
    cannon.position.set(0, -0.65, 0);
    const alien1 = createAlienDroneAssembly(0xf43f5e, 0);
    alien1.scale.setScalar(0.7);
    alien1.position.set(0, 0.55, 0);
    const alien2 = createAlienDroneAssembly(0x06b6d4, 2);
    alien2.scale.setScalar(0.65);
    alien2.position.set(-0.65, 0.1, 0);
    const alien3 = createAlienDroneAssembly(0x8b5cf6, 1);
    alien3.scale.setScalar(0.65);
    alien3.position.set(0.65, 0.1, 0);
    hologram.add(cannon, alien1, alien2, alien3);
  } else if (gameType === 'pac') {
    const pac = createCyberPacAssembly().group;
    pac.scale.setScalar(0.85);
    pac.position.set(-0.38, -0.1, 0.2);
    pac.rotation.y = Math.PI / 2;
    const ghost1 = createHunterDroneAssembly(0xf43f5e).group;
    ghost1.scale.setScalar(0.78);
    ghost1.position.set(0.45, 0.1, -0.15);
    const core = createPlasmaCoreAssembly();
    core.scale.setScalar(0.55);
    core.position.set(-0.75, 0.25, 0);
    hologram.add(pac, ghost1, core);
  }

  root.add(hologram);
  return { root, hologram, ringMesh };
}

/**
 * 9. Composite 5-Part Alien Drone Assembly (Nova Invaders)
 * Uses shared Geometries and Materials so zero GPU allocations occur
 */
export function createAlienDroneAssembly(colorHex: number, typeRow = 0): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = getCachedStandardMat('alien_body_dark', {
    color: 0x161f30,
    roughness: 0.25,
    metalness: 0.88,
  });

  const glowMat = getCachedStandardMat(`alien_glow_${colorHex}`, {
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.2,
  });

  const eyeMat = getCachedStandardMat(`alien_eye_${colorHex}`, {
    color: 0xffffff,
    emissive: colorHex,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });

  if (typeRow === 0) {
    // Dreadnought: Broad horned carapace + center reactor core + twin spikes
    const carapace = new THREE.Mesh(getBoxGeo(1.05, 0.35, 0.55), bodyMat);
    carapace.position.y = 0.25;
    const reactor = new THREE.Mesh(getCylGeo(0.25, 0.25, 0.42, 12), glowMat);
    reactor.position.set(0, 0.28, 0);
    const hornGeo = getConeGeo(0.16, 0.45, 4);
    const leftHorn = new THREE.Mesh(hornGeo, glowMat);
    leftHorn.rotation.z = 0.4;
    leftHorn.position.set(-0.55, 0.4, 0);
    const rightHorn = new THREE.Mesh(hornGeo, glowMat);
    rightHorn.rotation.z = -0.4;
    rightHorn.position.set(0.55, 0.4, 0);
    group.add(carapace, reactor, leftHorn, rightHorn);
  } else if (typeRow === 1 || typeRow === 2) {
    // Cruiser: Diamond wings + eye visor
    const core = new THREE.Mesh(getOctaGeo(0.38, 0), glowMat);
    core.position.y = 0.25;
    const wingGeo = getBoxGeo(0.42, 0.14, 0.35);
    const leftWing = new THREE.Mesh(wingGeo, bodyMat);
    leftWing.position.set(-0.45, 0.25, 0);
    const rightWing = new THREE.Mesh(wingGeo, bodyMat);
    rightWing.position.set(0.45, 0.25, 0);
    const eye = new THREE.Mesh(getBoxGeo(0.24, 0.1, 0.42), eyeMat);
    eye.position.set(0, 0.25, 0.1);
    group.add(core, leftWing, rightWing, eye);
  } else {
    // Scout: Compact spider claw saucer
    const saucer = new THREE.Mesh(getCylGeo(0.45, 0.35, 0.24, 8), bodyMat);
    saucer.position.y = 0.22;
    const rim = new THREE.Mesh(getTorusGeo(0.42, 0.06, 8, 16), glowMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;
    const eye = new THREE.Mesh(getSphereGeo(0.15, 8, 8), eyeMat);
    eye.position.set(0, 0.28, 0.25);
    group.add(saucer, rim, eye);
  }

  const shadow = createContactShadowMesh(0.55, 0.4);
  group.add(shadow);
  return group;
}

/**
 * 10. Composite 5-Part Aegis Defense Cannon Assembly (Nova Invaders)
 */
export function createDefenseCannonAssembly(): THREE.Group {
  const group = new THREE.Group();

  const metalMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.9,
  });

  const neonMat = getCachedStandardMat('cannon_neon_cyan', {
    color: 0x06b6d4,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.3,
  });

  const plinth = new THREE.Mesh(getBoxGeo(1.6, 0.32, 0.75), metalMat);
  plinth.position.y = 0.16;
  plinth.castShadow = true;

  const turret = new THREE.Mesh(getCylGeo(0.35, 0.42, 0.38, 16), metalMat);
  turret.position.y = 0.35;

  const barrelGeo = getCylGeo(0.08, 0.08, 0.75, 10);
  const leftBarrel = new THREE.Mesh(barrelGeo, neonMat);
  leftBarrel.rotation.x = Math.PI / 2;
  leftBarrel.position.set(-0.25, 0.42, -0.42);

  const rightBarrel = new THREE.Mesh(barrelGeo, neonMat);
  rightBarrel.rotation.x = Math.PI / 2;
  rightBarrel.position.set(0.25, 0.42, -0.42);

  const coreGlow = new THREE.Mesh(getSphereGeo(0.18, 10, 10), neonMat);
  coreGlow.position.set(0, 0.46, 0);

  const shadow = createContactShadowMesh(1.1, 0.5);
  group.add(plinth, turret, leftBarrel, rightBarrel, coreGlow, shadow);
  return group;
}

/**
 * 11. Composite Destructible Crystal Bunker Segment
 * Supports HP levels (3 = Cyan, 2 = Violet, 1 = Rose) or hex colors
 */
export function createBunkerSegmentMesh(hpOrColor = 3): THREE.Mesh {
  const colorHex =
    hpOrColor === 3
      ? 0x06b6d4
      : hpOrColor === 2
        ? 0x8b5cf6
        : hpOrColor === 1
          ? 0xf43f5e
          : hpOrColor;

  const geo = getBoxGeo(0.42, 0.55, 0.42);
  const mat = getCachedStandardMat(`bunker_seg_${colorHex}`, {
    color: 0x162032,
    emissive: colorHex,
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.8,
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * 12. Composite Mystery UFO Mothership
 */
export function createMothershipUfoAssembly(): THREE.Group {
  const group = new THREE.Group();

  const hullMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.2,
    metalness: 0.9,
  });
  const goldGlowMat = getCachedStandardMat('ufo_gold_glow', {
    color: 0xf59e0b,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.6,
    roughness: 0.1,
    metalness: 0.2,
  });

  const disc = new THREE.Mesh(getCylGeo(1.0, 1.25, 0.32, 20), hullMat);
  disc.position.y = 0.25;
  disc.castShadow = true;

  const dome = new THREE.Mesh(getSphereGeo(0.48, 12, 10), goldGlowMat);
  dome.scale.y = 0.6;
  dome.position.y = 0.45;

  const ring = new THREE.Mesh(getTorusGeo(1.15, 0.06, 10, 24), goldGlowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;

  group.add(disc, dome, ring);
  return group;
}

/**
 * 13. Composite 6-Part Cyber Pac-Chomper Assembly (Cyber Pac: Neon Labyrinth)
 */
export function createCyberPacAssembly(): {
  group: THREE.Group;
  upperJaw: THREE.Mesh;
  lowerJaw: THREE.Mesh;
  shieldRing: THREE.Mesh;
} {
  const group = new THREE.Group();

  const goldArmorMat = getCachedStandardMat('pac_gold_armor', {
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.65,
    roughness: 0.18,
    metalness: 0.55,
  });

  const coreCyanMat = getCachedStandardMat('pac_core_cyan', {
    color: 0x06b6d4,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.2,
  });

  const darkTrimMat = getCachedStandardMat('dark_trim_90', {
    color: 0x1e293b,
    roughness: 0.3,
    metalness: 0.9,
  });

  // Upper & Lower Chomping Hemispheres
  let hemiGeo = geoCache.get('pac_hemi_geo');
  if (!hemiGeo) {
    hemiGeo = new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    geoCache.set('pac_hemi_geo', hemiGeo);
  }

  const upperJaw = new THREE.Mesh(hemiGeo, goldArmorMat);
  upperJaw.position.y = 0.44;
  upperJaw.castShadow = true;

  const lowerJaw = new THREE.Mesh(hemiGeo, goldArmorMat);
  lowerJaw.position.y = 0.44;
  lowerJaw.rotation.z = Math.PI;
  lowerJaw.castShadow = true;

  // Inner Plasma Core
  const innerCore = new THREE.Mesh(getSphereGeo(0.24, 12, 12), coreCyanMat);
  innerCore.position.y = 0.44;

  // Cyber Visor Eyes
  const eyeGeo = getBoxGeo(0.1, 0.08, 0.14);
  const leftEye = new THREE.Mesh(eyeGeo, coreCyanMat);
  leftEye.position.set(-0.22, 0.62, 0.28);
  const rightEye = new THREE.Mesh(eyeGeo, coreCyanMat);
  rightEye.position.set(0.22, 0.62, 0.28);

  // Side Gyro Collar
  const gyro = new THREE.Mesh(getCylGeo(0.45, 0.45, 0.1, 16), darkTrimMat);
  gyro.rotation.z = Math.PI / 2;
  gyro.position.y = 0.44;

  // Phase Dash Shield Ring
  const shieldRing = new THREE.Mesh(getTorusGeo(0.52, 0.04, 10, 24), coreCyanMat);
  shieldRing.rotation.x = Math.PI / 2;
  shieldRing.position.y = 0.44;
  shieldRing.visible = false;

  const shadow = createContactShadowMesh(0.55, 0.5);
  group.add(upperJaw, lowerJaw, innerCore, leftEye, rightEye, gyro, shieldRing, shadow);

  return { group, upperJaw, lowerJaw, shieldRing };
}

/**
 * 14. Composite 6-Part Hunter Phantom Drone Assembly (Cyber Pac: Neon Labyrinth)
 */
export function createHunterDroneAssembly(colorHex: number): {
  group: THREE.Group;
  shroudMesh: THREE.Mesh;
  skirtRing: THREE.Mesh;
  normalBodyMat: THREE.MeshStandardMaterial;
  normalGlowMat: THREE.MeshStandardMaterial;
  frightBodyMat: THREE.MeshStandardMaterial;
  frightFlashMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const normalBodyMat = getCachedStandardMat(`ghost_body_${colorHex}`, {
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.45,
  });

  const normalGlowMat = getCachedStandardMat(`ghost_glow_${colorHex}`, {
    color: 0xffffff,
    emissive: colorHex,
    emissiveIntensity: 1.35,
    roughness: 0.15,
  });

  const frightBodyMat = getCachedStandardMat('ghost_fright_blue', {
    color: 0x2563eb,
    emissive: 0x3b82f6,
    emissiveIntensity: 1.1,
    roughness: 0.2,
    metalness: 0.3,
  });

  const frightFlashMat = getCachedStandardMat('ghost_fright_flash', {
    color: 0xf8fafc,
    emissive: 0x93c5fd,
    emissiveIntensity: 1.5,
    roughness: 0.15,
  });

  const eyeWhiteMat = getCachedStandardMat('ghost_eye_white', {
    color: 0xffffff,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const shroudMesh = new THREE.Mesh(getCylGeo(0.32, 0.42, 0.52, 16), normalBodyMat);
  shroudMesh.position.y = 0.42;
  shroudMesh.castShadow = true;

  const domeMesh = new THREE.Mesh(getSphereGeo(0.32, 14, 10), normalBodyMat);
  domeMesh.position.y = 0.68;
  shroudMesh.add(domeMesh);

  const skirtRing = new THREE.Mesh(getTorusGeo(0.4, 0.045, 10, 20), normalGlowMat);
  skirtRing.rotation.x = Math.PI / 2;
  skirtRing.position.y = 0.18;

  const eyeGeo = getBoxGeo(0.12, 0.1, 0.12);
  const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  leftEye.position.set(-0.14, 0.56, 0.32);
  const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  rightEye.position.set(0.14, 0.56, 0.32);

  const shadow = createContactShadowMesh(0.52, 0.45);
  group.add(shroudMesh, skirtRing, leftEye, rightEye, shadow);

  return {
    group,
    shroudMesh,
    skirtRing,
    normalBodyMat,
    normalGlowMat,
    frightBodyMat,
    frightFlashMat,
  };
}

