function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface ViewTransformOptions {
  /** The element the CSS transform is applied to — everything drawn inside it (core, links, module buttons) pans/zooms as one unit. */
  viewport: HTMLElement;
  /**
   * Current stage size plus the pannable "world" margin on each axis, in
   * the same untransformed stage-pixel space nodes are positioned in.
   * marginX/marginY are how far past the stage's own edge the world (and
   * the starfield canvas that covers it — see system-core-app.ts) extends
   * on that axis. They're not a fixed pair of constants: system-core-app.ts
   * derives them from minScale below so the world's edge and what maximum
   * zoom-out can actually show land on exactly the same rectangle (see
   * clampPan's own comment for the math this guarantees) — a fixed margin
   * independent of minScale left a gap (or excess) between the two,
   * worse the further the stage's aspect ratio was from square, since one
   * fixed margin applied to both a wide axis and a narrow one can't match
   * both at once.
   */
  getBounds: () => { width: number; height: number; marginX: number; marginY: number };
  minScale?: number;
  maxScale?: number;
}

/**
 * Google-Maps-style pan/zoom for the Core, as a single CSS transform on
 * the layer that holds the sphere, the link lines, and the module
 * buttons. Deliberately just a camera: the force simulation and every
 * node's computed x/y stay in the same untransformed stage-pixel space
 * they always have, and every node is a real DOM element inside the
 * transformed layer — so click/hover hit-testing keeps working through
 * the transform automatically, no manual coordinate math needed for
 * interactions, only for the transform itself.
 */
export class ViewTransform {
  private x = 0;
  private y = 0;
  private scale = 1;
  private readonly minScale: number;
  private readonly maxScale: number;
  private rafId = 0;

  constructor(private readonly opts: ViewTransformOptions) {
    this.minScale = opts.minScale ?? 0.55;
    this.maxScale = opts.maxScale ?? 2.4;
  }

  get currentScale(): number {
    return this.scale;
  }

  reset(): void {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this.apply();
  }

  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.clampPan();
    this.apply();
  }

  /** Zooms by `factor`, keeping the stage-relative point (anchorX, anchorY) visually fixed — the point under the cursor for a wheel zoom, or the stage center for the +/- buttons. */
  zoomBy(factor: number, anchorX: number, anchorY: number): void {
    const nextScale = clamp(this.scale * factor, this.minScale, this.maxScale);
    if (nextScale === this.scale) return;
    const graphX = (anchorX - this.x) / this.scale;
    const graphY = (anchorY - this.y) / this.scale;
    this.x = anchorX - graphX * nextScale;
    this.y = anchorY - graphY * nextScale;
    this.scale = nextScale;
    this.clampPan();
    this.apply();
  }

  /**
   * Keeps the "world" rect (the stage padded by marginX/marginY — exactly
   * the area the starfield canvas covers) fully covering the viewport at
   * all times, so panning can only ever reveal more of that starfield,
   * never the empty space past its edge.
   *
   * For each axis: screenPos = worldPos * scale + translate, and the
   * viewport spans screen [0, boundsSize]. Solving "world rect contains
   * screen rect" for translate gives the two bounds below — at the min
   * bound the world's far edge lines up exactly with the viewport's far
   * edge (the star canvas's boundary, the true edge of "the map"); at the
   * max bound the world's near edge lines up with the viewport's near
   * edge.
   *
   * Because marginX/marginY are derived (in system-core-app.ts) from
   * minScale so that worldSize == boundsSize / minScale on each axis,
   * plugging scale = minScale into these two bounds collapses them to the
   * same single value — at maximum zoom-out there's exactly zero slack
   * left to pan, because the world already exactly fills the viewport,
   * edge to edge, on both axes at once. That's the property this whole
   * derivation exists for: max zoom-out and "you've reached the edge of
   * the starfield" happen at exactly the same moment, not one before the
   * other.
   */
  private clampPan(): void {
    const bounds = this.opts.getBounds();
    const worldMinX = -bounds.marginX;
    const worldMaxX = bounds.width + bounds.marginX;
    const worldMinY = -bounds.marginY;
    const worldMaxY = bounds.height + bounds.marginY;
    this.x = clamp(this.x, bounds.width - worldMaxX * this.scale, -worldMinX * this.scale);
    this.y = clamp(this.y, bounds.height - worldMaxY * this.scale, -worldMinY * this.scale);
  }

  private apply(): void {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.opts.viewport.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    });
  }
}
