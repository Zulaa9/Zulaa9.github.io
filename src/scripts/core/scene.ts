/**
 * Escena Three.js del System Core (núcleo, malla, estrellas y luces).
 * Solo crea y destruye recursos; la animación la gobierna system-core.ts.
 */
import {
  AmbientLight,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';

/**
 * Three.js r155+ usa unidades físicas en las luces puntuales. Estos valores
 * reproducen el aspecto que tenía la escena con r152 (modo de luces "legacy"):
 * intensidad × π y un decaimiento suave equivalente al anterior.
 */
export const LIGHTS = {
  ambient: 0.4,
  key: { intensity: 4.2, decay: 1.7 },
  keyIdle: 4,
  keyPulse: 0.45,
  keyImpulse: 0.55,
  rim: { intensity: 1.8, decay: 1.8 },
  scale: Math.PI,
};

export interface CoreScene {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  coreGroup: Group;
  outer: Mesh<IcosahedronGeometry, MeshPhysicalMaterial>;
  inner: Mesh<OctahedronGeometry, MeshStandardMaterial>;
  shellWire: LineSegments<EdgesGeometry, LineBasicMaterial>;
  key: PointLight;
  starsMesh: Points<BufferGeometry, PointsMaterial>;
  setKeyIntensity(value: number): void;
  dispose(): void;
}

export function createCoreScene(canvas: HTMLCanvasElement): CoreScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

  const scene = new Scene();
  scene.fog = new Fog(0x06090e, 6, 13);

  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.06, 2.25);

  const coreGroup = new Group();
  coreGroup.scale.setScalar(0.05);
  scene.add(coreGroup);

  const outer = new Mesh(
    new IcosahedronGeometry(0.84, 2),
    new MeshPhysicalMaterial({
      color: 0x2e5f76,
      emissive: 0x1f89aa,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.56,
      transparent: true,
      opacity: 0,
    }),
  );

  const inner = new Mesh(
    new OctahedronGeometry(0.4, 1),
    new MeshStandardMaterial({
      color: 0x90ddff,
      emissive: 0x5bcbe2,
      emissiveIntensity: 0,
      roughness: 0.26,
      metalness: 0.12,
      transparent: true,
      opacity: 0,
    }),
  );

  const shellWire = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(0.98, 1)),
    new LineBasicMaterial({ color: 0x66d8ff, transparent: true, opacity: 0 }),
  );
  coreGroup.add(outer, inner, shellWire);

  const ambient = new AmbientLight(0x8cb6cf, LIGHTS.ambient);
  const key = new PointLight(0x68d5ff, LIGHTS.key.intensity * LIGHTS.scale, 16, LIGHTS.key.decay);
  key.position.set(0, 0, 2.8);
  const rim = new PointLight(0x4d80ad, LIGHTS.rim.intensity * LIGHTS.scale, 16, LIGHTS.rim.decay);
  rim.position.set(-2.8, -1.2, -1.8);
  scene.add(ambient, key, rim);

  const starsGeo = new BufferGeometry();
  const stars: number[] = [];
  for (let i = 0; i < 120; i += 1) {
    stars.push((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8 - 1.5);
  }
  starsGeo.setAttribute('position', new Float32BufferAttribute(stars, 3));
  const starsMesh = new Points(
    starsGeo,
    new PointsMaterial({ color: 0x93d8f8, size: 0.02, transparent: true, opacity: 0.48 }),
  );
  scene.add(starsMesh);

  return {
    renderer,
    scene,
    camera,
    coreGroup,
    outer,
    inner,
    shellWire,
    key,
    starsMesh,
    setKeyIntensity(value: number) {
      key.intensity = value * LIGHTS.scale;
    },
    dispose() {
      scene.traverse((obj) => {
        const o = obj as Partial<Mesh>;
        o.geometry?.dispose();
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      shellWire.geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
