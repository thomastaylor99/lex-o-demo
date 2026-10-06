/**
 * Hands-free end of speech (spec 001), over the mic's 64 ms frames. Pure, so it runs in tests.
 *
 * Speech starts after two voiced frames. After 450 ms of silence the engine ends the
 * transcription socket, so the final text is ready when the turn opens at 700 ms; two voiced
 * frames in between resume the same line on a new socket. The engine can wait longer than 700 ms
 * when the words so far look unfinished (hesitation.ts). A frame is voiced when its RMS clears
 * the room's noise by a margin, never less than 0.012, so a noisy hall cannot hold the turn open.
 * The first half second only measures the room.
 */

/** RMS above which a frame counts as speech in a quiet room (the reference used 0.01). */
export const VAD_THRESHOLD = 0.012;
/** The threshold follows the noise up to this, so a loud hall cannot make the visitor unheard. */
const MAX_THRESHOLD = 0.04;
/** A voiced frame is this many times louder than the room's noise. */
const NOISE_MARGIN = 3;
/** The noise is the quietest fifth of the last 3 s of frames: the pauses, even mid-sentence. */
const NOISE_PERCENTILE = 0.2;
const NOISE_FRAMES = 48;
/** Fewer frames than this say nothing about the room yet. */
const MIN_NOISE_FRAMES = 8;

/** Consecutive voiced frames that start or resume speech. */
const START_FRAMES = 2;
/** Silence after which the transcription socket is ended, ahead of the turn. */
export const SOFT_END_MS = 450;
/** Silence that ends the visitor's line and opens the turn (the reference waited 1.5 s). */
export const END_MS = 700;
export const MAX_LINE_MS = 20_000;

export type GateEvent = "start" | "soft_end" | "resume" | "end";

/** The room's noise level, from the quietest of the recent frames. */
export class NoiseFloor {
  private readonly recent: number[] = [];

  add(rms: number): void {
    this.recent.push(rms);
    if (this.recent.length > NOISE_FRAMES) this.recent.shift();
  }

  ready(): boolean {
    return this.recent.length >= MIN_NOISE_FRAMES;
  }

  threshold(): number {
    if (!this.ready()) return VAD_THRESHOLD;
    const sorted = [...this.recent].sort((a, b) => a - b);
    const noise = sorted[Math.floor(sorted.length * NOISE_PERCENTILE)];
    return Math.min(MAX_THRESHOLD, Math.max(VAD_THRESHOLD, NOISE_MARGIN * noise));
  }
}

export class SpeechGate {
  private state: "waiting" | "speaking" | "ending" = "waiting";
  private voicedRun = 0;
  private startedAt = 0;
  private lastVoicedAt = 0;
  private readonly noise = new NoiseFloor();

  /** The last voiced frame: where the turn's clock starts. */
  get speechEnd(): number {
    return this.lastVoicedAt;
  }

  /** What this frame changes, if anything. `endMs` is the silence that ends the line. */
  frame(now: number, rms: number, endMs = END_MS): GateEvent | null {
    this.noise.add(rms);
    if (!this.noise.ready()) return null;
    const voiced = rms > this.noise.threshold();
    this.voicedRun = voiced ? this.voicedRun + 1 : 0;
    if (this.state === "waiting") {
      if (this.voicedRun < START_FRAMES) return null;
      this.state = "speaking";
      this.startedAt = now;
      this.lastVoicedAt = now;
      return "start";
    }
    if (this.state === "ending" && this.voicedRun >= START_FRAMES) {
      this.state = "speaking";
      this.lastVoicedAt = now;
      return "resume";
    }
    if (this.state === "speaking" && voiced) this.lastVoicedAt = now;
    if (now - this.lastVoicedAt > endMs || now - this.startedAt > MAX_LINE_MS) {
      this.reset();
      return "end";
    }
    if (this.state === "speaking" && now - this.lastVoicedAt > SOFT_END_MS) {
      this.state = "ending";
      return "soft_end";
    }
    return null;
  }

  /**
   * Whether the silence since the socket ended has lasted `endMs`. The final text usually comes
   * just after 700 ms, between two frames, so the engine asks then rather than wait for a frame.
   */
  silentFor(now: number, endMs: number): boolean {
    return this.state === "ending" && now - this.lastVoicedAt > endMs;
  }

  /** Back to waiting for speech; the noise measured so far is kept. */
  reset(): void {
    this.state = "waiting";
    this.voicedRun = 0;
  }
}
