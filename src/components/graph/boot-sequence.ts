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
    body.classList.remove("awaiting-start", "core-offline");
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
      bootSequence.remove();
      body.classList.remove("booting");
      return;
    }

    body.classList.remove("awaiting-start", "core-offline");
    body.classList.add("booting", "boot-offline");
    this.setStatus(this.strings.statusOffline);
    await sleep(220);
    body.classList.remove("boot-offline");
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

    await sleep(340);
    body.classList.add("boot-unfold");
    await sleep(820);

    bootSequence.remove();
    body.classList.remove("booting", "boot-offline", "boot-loading");
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
