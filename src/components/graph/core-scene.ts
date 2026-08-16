import * as THREE from "three";

const TRANSITION_OUT_MS = 900;
const TRANSITION_BACK_MS = 760;
const INTRO_DURATION_MS = 3440;

// Mirrors the actual scene setup below (outer IcosahedronGeometry radius,
// camera FOV, and the camera's resting Z from fastForwardToReady/the tail
// of the intro) — kept in sync manually since Three.js has no query for
// "how many screen pixels does this mesh cover," and getVisualRadius()
// needs that answer to keep module nodes off the sphere.
const CORE_MESH_RADIUS = 0.84;
const CORE_FOV_DEG = 40;
const CORE_REST_CAMERA_Z = 5.2;
// No headroom beyond the raw mesh — there's no actual bloom post-process
// in this scene (the "glow" is emissive material shading on the mesh
// surface itself, it doesn't extend past the geometry), and the space
// around the core is tight enough that padding for a halo that isn't
// there costs real room elsewhere.
const CORE_GLOW_PADDING = 1.0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Ambient Three.js core: icosahedron shell + inner octahedron + wireframe +
 * starfield, with the boot/intro/transition camera choreography.
 * Ported 1:1 from legacy-vanilla/main.js — same geometry, same easing, same
 * timings (see docs/visual-reference.md for the acceptance checklist).
 */
export class CoreScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  private coreGroup = new THREE.Group();
  private outer: THREE.Mesh;
  private inner: THREE.Mesh;
  private shellWire: THREE.LineSegments;
  private starsMesh: THREE.Points;
  private key: THREE.PointLight;

  // public-ish state the orchestrator drives
  introStep = 0;
  introComplete = false;
  introStartTime = 0;
  isTransitioning = false;
  transitionStart = 0;
  transitionDir = 1;
  isReturnTransition = false;
  returnStartTime = 0;
  parallaxX = 0;
  parallaxY = 0;
  coreImpulse = 0;
  coreHovering = false;
  coreHoverTime = 0;

  private spinX = 0;
  private spinY = 0;
  private spinCooldown = 0;
  private spinBurstTime = 0;
  private lastTime = performance.now();
  private dt = 0.016;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    this.scene.fog = new THREE.Fog(0x06090e, 6, 13);
    this.camera.position.set(0, 0.06, 2.25);

    this.coreGroup.scale.setScalar(0.05);
    this.scene.add(this.coreGroup);

    this.outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.84, 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x2e5f76,
        emissive: 0x1f89aa,
        emissiveIntensity: 0.45,
        roughness: 0.32,
        metalness: 0.56,
        transparent: true,
        opacity: 0,
      }),
    );

    this.inner = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 1),
      new THREE.MeshStandardMaterial({
        color: 0x90ddff,
        emissive: 0x5bcbe2,
        emissiveIntensity: 0,
        roughness: 0.26,
        metalness: 0.12,
        transparent: true,
        opacity: 0,
      }),
    );

    this.shellWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.98, 1)),
      new THREE.LineBasicMaterial({ color: 0x66d8ff, transparent: true, opacity: 0 }),
    );

    this.coreGroup.add(this.outer, this.inner, this.shellWire);

    const ambient = new THREE.AmbientLight(0x8cb6cf, 0.4);
    this.key = new THREE.PointLight(0x68d5ff, 4.2, 16, 1.7);
    this.key.position.set(0, 0, 2.8);
    const rim = new THREE.PointLight(0x4d80ad, 1.8, 16, 1.8);
    rim.position.set(-2.8, -1.2, -1.8);
    this.scene.add(ambient, this.key, rim);

    this.starsMesh = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x93d8f8, size: 0.02, transparent: true, opacity: 0.48 }),
    );
    this.scene.add(this.starsMesh);
    this.layoutStars(1200, 600); // placeholder — resize(), called synchronously during boot, replaces this before it's ever visible
  }

  getBaseScale(): number {
    return window.matchMedia("(max-width: 860px)").matches ? 0.52 : 1;
  }

  /**
   * On-screen radius (px) of the visible core sphere at its resting
   * position, including glow headroom. The layout's collision math treated
   * the core's footprint as a guessed ~80px box for a while (there's no DOM
   * element to measure — the sphere only exists on the canvas), which was
   * meaningfully smaller than the real rendered sphere and let module
   * nodes visually sit on top of it despite the physics reporting no
   * overlap. Deriving it from the actual camera/geometry means it stays
   * correct if the scene's scale or camera distance ever changes, instead
   * of silently drifting out of sync with a second hardcoded guess.
   */
  getVisualRadius(canvasHeight: number): number {
    const fovRad = (CORE_FOV_DEG * Math.PI) / 180;
    const visibleWorldHeight = 2 * CORE_REST_CAMERA_Z * Math.tan(fovRad / 2);
    const pxPerWorldUnit = canvasHeight / visibleWorldHeight;
    return CORE_MESH_RADIUS * this.getBaseScale() * pxPerWorldUnit * CORE_GLOW_PADDING;
  }

  /**
   * `width`/`height` are the canvas's own render size, which can now be
   * bigger than the visible stage (padded out to cover the pan/zoom
   * "world" — see system-core-app.ts — so panning reveals more starfield
   * instead of empty space at the canvas's edge). `referenceHeight` is the
   * stage's real height: the size getVisualRadius()'s math, and every
   * collision/link-distance calculation built on it, assumes. Widening
   * the camera's FOV to match how much the canvas grew relative to that
   * reference keeps the world-units-per-pixel density exactly what it was
   * at the plain stage size — the sphere doesn't quietly get bigger just
   * because the canvas grew for the starfield's sake — while the extra
   * canvas around it reveals more periphery at that same density.
   */
  resize(width: number, height: number, referenceHeight: number = height): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / (height || 1);
    const baseFovRad = (CORE_FOV_DEG * Math.PI) / 180;
    const baseVisibleHeight = 2 * CORE_REST_CAMERA_Z * Math.tan(baseFovRad / 2);
    const worldPerPx = baseVisibleHeight / referenceHeight;
    const visibleHeight = worldPerPx * height;
    this.camera.fov = (2 * Math.atan(visibleHeight / (2 * CORE_REST_CAMERA_Z)) * 180) / Math.PI;
    this.camera.updateProjectionMatrix();
    this.layoutStars(width, height);
  }

  /**
   * Spreads the starfield across whatever the camera can currently see —
   * recomputed from the (possibly FOV-widened, see resize()) live camera
   * settings, not the original fixed box, so panning across the expanded
   * canvas finds stars the whole way instead of the field ending at the
   * original stage's edges. Star count scales with the visible area so
   * density stays roughly constant instead of the same ~120 stars
   * thinning out across a much bigger canvas.
   */
  private layoutStars(canvasWidth: number, canvasHeight: number): void {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const visibleWorldHeight = 2 * CORE_REST_CAMERA_Z * Math.tan(fovRad / 2);
    const visibleWorldWidth = visibleWorldHeight * this.camera.aspect;
    const density = 120 / (1200 * 600); // matches the original fixed-box star count at stage scale
    const starCount = clamp(Math.round(canvasWidth * canvasHeight * density), 120, 640);

    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * visibleWorldWidth * 1.15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * visibleWorldHeight * 1.15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1.5;
    }
    this.starsMesh.geometry.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.starsMesh.geometry = geometry;
  }

  setStarsVisible(visible: boolean): void {
    this.starsMesh.visible = visible;
  }

  beginTransitionOut(): void {
    this.isTransitioning = true;
    this.transitionDir = 1;
    this.transitionStart = performance.now();
  }

  beginReturnTransition(): void {
    this.isReturnTransition = true;
    this.returnStartTime = performance.now();
    this.camera.position.set(0.25, -0.05, 2.55);
    this.coreGroup.scale.setScalar(this.getBaseScale() * 1.35);
  }

  startIntro(): void {
    this.introStartTime = performance.now() + 80;
  }

  /** Skips straight to the fully-online visual state (used on module return). */
  fastForwardToReady(): void {
    this.introStep = 6;
    this.introComplete = true;
    this.introStartTime = performance.now() - INTRO_DURATION_MS;
    this.camera.position.set(0, 0.15, 5.2);
    this.coreGroup.scale.setScalar(this.getBaseScale());
    (this.outer.material as THREE.MeshPhysicalMaterial).opacity = 0.8;
    (this.inner.material as THREE.MeshStandardMaterial).opacity = 1;
    (this.inner.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2;
    (this.shellWire.material as THREE.LineBasicMaterial).opacity = 0.22;
    this.key.intensity = 4;
  }

  render(now: number): void {
    this.dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const t = now * 0.001;
    const pulse = 1 + Math.sin(t * 2.25) * 0.03;

    if (this.isTransitioning) {
      const elapsed = (now - this.transitionStart) / (this.transitionDir > 0 ? TRANSITION_OUT_MS : TRANSITION_BACK_MS);
      const eased = smoothstep(elapsed);
      const blend = this.transitionDir > 0 ? eased : 1 - eased;
      const baseScale = this.getBaseScale();
      this.camera.position.z = THREE.MathUtils.lerp(5.2, 2.55, blend);
      this.camera.position.x = THREE.MathUtils.lerp(0, 0.25, blend);
      this.camera.position.y = THREE.MathUtils.lerp(0.15, -0.05, blend);
      this.coreGroup.scale.setScalar(baseScale * (1 + blend * 0.35));
    } else if (this.isReturnTransition) {
      const progress = smoothstep((now - this.returnStartTime) / TRANSITION_BACK_MS);
      const baseScale = this.getBaseScale();
      this.camera.position.z = THREE.MathUtils.lerp(2.55, 5.2, progress);
      this.camera.position.x = THREE.MathUtils.lerp(0.25, 0, progress);
      this.camera.position.y = THREE.MathUtils.lerp(-0.05, 0.15, progress);
      this.coreGroup.scale.setScalar(baseScale * THREE.MathUtils.lerp(1.35, 1, progress));
      if (progress >= 1) this.isReturnTransition = false;
    } else if (!this.introComplete) {
      this.camera.position.z += (5.2 - this.camera.position.z) * 0.05;
      this.camera.position.x += (0 - this.camera.position.x) * 0.05;
      this.camera.position.y += (0.15 - this.camera.position.y) * 0.05;
      const introElapsed = now - this.introStartTime;
      const introProgress = smootherstep(introElapsed / INTRO_DURATION_MS);
      this.coreGroup.scale.setScalar(THREE.MathUtils.lerp(0.05, this.getBaseScale(), introProgress));
    } else {
      const baseScale = this.getBaseScale();
      this.camera.position.z += (5.2 - this.camera.position.z) * 0.04;
      this.camera.position.x += (this.parallaxX * 0.25 - this.camera.position.x) * 0.04;
      this.camera.position.y += (-this.parallaxY * 0.18 + 0.15 - this.camera.position.y) * 0.04;
      this.coreGroup.scale.x += (baseScale - this.coreGroup.scale.x) * 0.05;
      this.coreGroup.scale.y += (baseScale - this.coreGroup.scale.y) * 0.05;
      this.coreGroup.scale.z += (baseScale - this.coreGroup.scale.z) * 0.05;
    }

    this.spinCooldown = Math.max(0, this.spinCooldown - this.dt);
    if (
      this.introComplete &&
      !this.isTransitioning &&
      !this.isReturnTransition &&
      this.coreHovering &&
      this.coreHoverTime > 0.09 &&
      this.spinCooldown <= 0 &&
      this.spinBurstTime <= 0
    ) {
      this.spinBurstTime = 0.22;
      this.spinCooldown = 0.8;
    }

    this.spinBurstTime = Math.max(0, this.spinBurstTime - this.dt);
    const burstFactor = this.spinBurstTime > 0 ? Math.pow(this.spinBurstTime / 0.22, 0.75) : 0;
    const burstY = 2.8 * burstFactor;
    const burstX = 0.9 * burstFactor;
    this.spinY += this.dt * (0.22 + burstY);
    this.spinX += this.dt * (0.08 + burstX);
    this.coreImpulse += (0 - this.coreImpulse) * 0.1;
    const tiltY = this.parallaxX * 0.28;
    const tiltX = -this.parallaxY * 0.2;
    this.coreGroup.rotation.y = this.spinY + tiltY;
    this.coreGroup.rotation.x = this.spinX + tiltX;
    this.coreGroup.position.x += (this.parallaxX * 0.16 - this.coreGroup.position.x) * 0.06;
    this.coreGroup.position.y += (-this.parallaxY * 0.12 - this.coreGroup.position.y) * 0.06;
    this.inner.rotation.y -= this.dt * 0.42;
    this.outer.rotation.x -= this.dt * 0.12;
    const coreImpulseBoost = 1 + this.coreImpulse * 0.055;
    this.outer.scale.setScalar((this.introStep >= 2 ? pulse : 1) * coreImpulseBoost);
    this.inner.scale.setScalar(coreImpulseBoost * (1 + this.coreImpulse * 0.02));
    this.shellWire.rotation.y -= this.dt * 0.28;
    const wirePulse = 0.22 + Math.sin(t * 1.6) * 0.05;
    const wireTarget = this.introStep >= 4 ? wirePulse : 0;
    const wireMat = this.shellWire.material as THREE.LineBasicMaterial;
    wireMat.opacity += (wireTarget - wireMat.opacity) * 0.08;

    const outerMat = this.outer.material as THREE.MeshPhysicalMaterial;
    const outerTarget = this.introStep >= 2 ? 0.8 : 0;
    outerMat.opacity += (outerTarget - outerMat.opacity) * 0.08;

    const innerMat = this.inner.material as THREE.MeshStandardMaterial;
    const innerTarget = this.introStep >= 3 ? 1 : 0;
    innerMat.opacity += (innerTarget - innerMat.opacity) * 0.1;
    const emissiveTarget = this.introStep >= 3 ? 1.2 : 0;
    innerMat.emissiveIntensity += (emissiveTarget - innerMat.emissiveIntensity) * 0.1;

    this.key.intensity = this.introStep >= 3 ? 4 + Math.sin(t * 2.1) * 0.45 + this.coreImpulse * 0.55 : 0;
    // A slow, small, bounded sway rather than open-ended accumulation
    // (this used to be `rotation.y += dt * 0.015`, drifting forever). The
    // starfield is a flat slab, not a shape symmetric around the Y axis it
    // spins on, so a full, unbounded rotation steadily swings stars between
    // being near the camera (z close to 0, large and undimmed) and deep in
    // the scene's fog (z near -5.5, small and fogged toward the background
    // color, see the Fog(...) set up in the constructor) — the "stars
    // shrinking away toward the core" this replaces. Now that the field
    // spans the whole pannable area rather than a small fixed box, that
    // warp was happening across the entire visible sky instead of a
    // contained corner, which is what made it read as a bug rather than
    // ambient motion. A small bounded oscillation keeps the "living sky"
    // feel without ever reorienting the slab enough to cause it.
    this.starsMesh.rotation.y = Math.sin(t * 0.035) * 0.04;

    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
