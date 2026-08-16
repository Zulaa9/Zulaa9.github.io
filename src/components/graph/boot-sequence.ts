/**
 * Boot terminal + intro timeline + startup gate state machine.
 * Ported 1:1 from legacy-vanilla/main.js — same timings, documented and
 * checked against docs/visual-reference.md.
 */

const INTRO_TIMELINE = [
  { step: 1, at: 80 },
  { step: 2, at: 980 },
  { step: 3, at: 1580 },
  { step: 4, at: 2200 },
  { step: 5, at: 2820 },
  { step: 6, at: 3440 },
] as const;

export interface BootRefs {
  body: HTMLElement;
  bootSequence: HTMLElement | null;
  bootLog: HTMLUListElement | null;
  bootProgressFill: HTMLElement | null;
  bootProgressText: HTMLElement | null;
  statusText: HTMLElement | null;
  startButton: HTMLButtonElement | null;
}

export interface BootStrings {
  bootLines: readonly string[];
  statusOffline: string;
  statusBooting: string;
  statusLoading: (progress: number) => string;
  statusSyncing: string;
  statusOnline: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class BootSequence {
  constructor(
    private refs: BootRefs,
    private strings: BootStrings,
    private onIntroStep: (step: number) => void,
    // Fires exactly when the doors start opening (boot-unfold added,
    // boot-closed removed) — the one moment the caller needs to know
    // about that isn't already covered by onIntroStep, since the intro
    // timeline itself only starts once the whole boot sequence (loading
    // *and* opening) has fully finished, which is well after the doors
    // have already visually finished revealing what's behind them.
    private onOpeningStart: () => void,
  ) {}

  private setStatus(text: string): void {
    if (this.refs.statusText) this.refs.statusText.textContent = text;
  }

  enterAwaitingStart(onStart: () => void): void {
    this.refs.body.classList.add("awaiting-start", "core-offline");
    this.setStatus(this.strings.statusOffline);
    if (this.refs.startButton) {
      this.refs.startButton.disabled = false;
      this.refs.startButton.removeAttribute("aria-busy");
      this.refs.startButton.addEventListener("click", onStart, { once: true });
    }
  }

  /**
   * `onIntroStart` fires right as the intro timeline begins (i.e. after the
   * multi-second boot sequence finishes) — the 3D scene's own intro clock
   * must start exactly then, not at button-click time, or the core mesh
   * scale-in reads several seconds of elapsed time on its very first frame
   * and snaps to full size instead of animating in.
   */
  async begin(onIntroStart: () => void): Promise<void> {
    const { body, startButton } = this.refs;
    // Deliberately NOT removing "awaiting-start"/"core-offline" here —
    // that's what makes .startup-gate (the button, the intro copy, ...)
    // fade out, and doing it immediately on click made it disappear well
    // before the doors (760ms to close) had actually covered it, leaving
    // a stretch of empty background visible behind the closing doors.
    // runBootSequence() below removes it once the doors have actually
    // finished closing instead — see its own comment at that point.
    if (startButton) {
      startButton.disabled = true;
      startButton.setAttribute("aria-busy", "true");
    }
    await this.runBootSequence();
    onIntroStart();
    this.runIntro();
  }

  /** Used when arriving from a module page — skip straight to the ready state. */
  fastForwardReady(): void {
    this.refs.bootSequence?.remove();
    this.refs.body.classList.remove(
      "booting",
      "boot-offline",
      "boot-loading",
      "boot-unfold",
      "boot-closed",
      "intro-running",
      "core-syncing",
      "core-offline",
      "awaiting-start",
    );
    for (let step = 1; step <= 6; step += 1) this.refs.body.classList.add(`intro-step-${step}`);
    this.refs.body.classList.add("intro-complete");
    this.setStatus(this.strings.statusOnline);
    this.onIntroStep(6);
  }

  private async runBootSequence(): Promise<void> {
    const { body, bootSequence, bootLog, bootProgressFill, bootProgressText } = this.refs;
    if (!bootSequence || !bootLog || !bootProgressFill || !bootProgressText) return;

    if (prefersReducedMotion()) {
      // No closing animation plays for this path at all, so there's no
      // "doors haven't covered it yet" gap to worry about — the startup
      // gate can disappear immediately, same as it always has.
      body.classList.remove("awaiting-start", "core-offline");
      bootSequence.remove();
      body.classList.remove("booting");
      this.onOpeningStart();
      return;
    }

    // IDLE -> the boot panel becomes visible right here, in the OPEN
    // position — .boot-top-unit's (door + console, moving as one rigid
    // piece) and .boot-door--bottom's default/base transform in
    // system-core.css — console not yet in the viewport. Note
    // "awaiting-start" is deliberately still present: .startup-gate (its
    // content sits behind .boot-sequence, whose z-index is higher) keeps
    // rendering normally underneath the open doors, exactly as it did a
    // moment ago — see CLOSED below for where it actually goes away.
    body.classList.add("booting", "boot-offline");
    this.setStatus(this.strings.statusOffline);
    await sleep(220);

    // CLOSING -> CLOSED. Adding "boot-closed" sends .boot-top-unit (door +
    // console together) down from above and .boot-door--bottom up from
    // below, both toward the stage's vertical center, over the 760ms
    // defined on their own transitions. Real elapsed time (the sleep
    // above) already separated "open" from this change, so the browser
    // genuinely painted the open state first — no forced-reflow or
    // animation-frame trick needed to make the transition play. The
    // startup gate keeps rendering, unchanged, the whole time — the
    // closing doors are what progressively cover it, not any visibility
    // toggle on the gate itself.
    body.classList.add("boot-closed");
    await sleep(760); // matches .boot-top-unit/.boot-door--bottom's transition-duration exactly

    // CLOSED: the doors are now fully shut and opaque, so only *now* is
    // it safe to remove "awaiting-start"/"core-offline" — nothing behind
    // the doors is visible anymore for that to expose. Same moment
    // LOADING starts; never while boot-closed's transition is still in
    // flight.
    body.classList.remove("awaiting-start", "core-offline", "boot-offline");
    body.classList.add("boot-loading");
    this.setStatus(this.strings.statusBooting);

    const lines = this.strings.bootLines;
    for (let i = 0; i < lines.length; i += 1) {
      const line = document.createElement("li");
      line.textContent = lines[i];
      bootLog.appendChild(line);
      if (bootLog.children.length > 8) bootLog.removeChild(bootLog.children[0]);

      const progress = Math.round(((i + 1) / lines.length) * 100);
      bootProgressFill.style.width = `${progress}%`;
      bootProgressText.textContent = `${progress}%`;
      this.setStatus(this.strings.statusLoading(progress));
      await sleep(180 + i * 24);
    }

    // LOADED: brief hold at 100% so it actually reads as finished before
    // opening starts, instead of the bar just vanishing.
    await sleep(340);

    // OPENING — the exact reverse of CLOSING, unchanged in every way that
    // matters: removing "boot-closed" sends .boot-top-unit (door +
    // console, still one rigid piece) back up and .boot-door--bottom back
    // down via the same transition, door and console leaving together the
    // same way they arrived together. "boot-unfold" is the pre-existing,
    // untouched mechanism for the backdrop's own separate fade (see its
    // rule in system-core.css) — both happen at once, same as before.
    body.classList.add("boot-unfold");
    body.classList.remove("boot-closed");
    this.onOpeningStart();
    await sleep(820);

    bootSequence.remove();
    body.classList.remove("booting", "boot-offline", "boot-loading", "boot-closed");
    body.classList.add("core-syncing");
    this.setStatus(this.strings.statusSyncing);
  }

  private runIntro(): void {
    const { body } = this.refs;

    if (prefersReducedMotion()) {
      for (const { step } of INTRO_TIMELINE) this.applyIntroStep(step);
      return;
    }

    body.classList.add("intro-running");
    for (const { step, at } of INTRO_TIMELINE) {
      window.setTimeout(() => this.applyIntroStep(step), at);
    }
  }

  private applyIntroStep(step: number): void {
    const { body } = this.refs;
    body.classList.add(`intro-step-${step}`);
    this.onIntroStep(step);

    if (step === 6) {
      body.classList.remove("intro-running", "core-syncing");
      body.classList.add("intro-complete");
      this.setStatus(this.strings.statusOnline);
    }
  }
}
