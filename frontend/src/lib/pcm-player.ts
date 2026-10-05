/**
 * Plays the agents' speech: raw PCM, float32 little-endian, 24 kHz, mono (spec 001).
 *
 * Sources play strictly in order and without gaps. A source is either a fixed line already in
 * memory or the streamed body of a `/voice/speak` request, which was started as soon as its reply
 * was complete, so it downloads while what is queued before it plays. The queue can also hold
 * a pause (silence before what follows) and a cue (a callback run when playback reaches it).
 */

const SAMPLE_RATE = 24_000;
/** Scheduling a little ahead of `currentTime` avoids clicks when a chunk lands late. */
const LEAD_S = 0.04;

export type SoundKind = "line" | "speech";

export type Source =
  | { kind: "buffer"; data: ArrayBuffer; tag: SoundKind }
  | { kind: "stream"; body: Promise<ReadableStream<Uint8Array> | null>; tag: SoundKind };

type Queued = Source | { kind: "pause"; seconds: number } | { kind: "cue"; callback: () => void };

export class PcmPlayer {
  private context: AudioContext | null = null;
  private queue: Queued[] = [];
  private pumping = false;
  private nextStart = 0;
  private scheduled = new Set<AudioBufferSourceNode>();
  private cues = new Set<ReturnType<typeof setTimeout>>();
  private readers = new Set<ReadableStreamDefaultReader<Uint8Array>>();
  /** Bumped by clear(), so a pump from before the clear stops at its next step. */
  private generation = 0;
  private onFirstSound: ((atMs: number, kind: SoundKind) => void) | null = null;
  private drainedCallbacks: (() => void)[] = [];

  /** Create or resume the AudioContext; call it from a click (browser autoplay rule). */
  async resume(): Promise<void> {
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }

  /** Report the next first sound, with the `performance.now()` time it actually plays. */
  markTurn(onFirstSound: (atMs: number, kind: SoundKind) => void): void {
    this.onFirstSound = onFirstSound;
  }

  enqueue(source: Source): void {
    this.queue.push(source);
    void this.pump();
  }

  /** Put a source at the head of the queue (fixed lines: handover, filler). */
  playNow(source: Source): void {
    this.queue.unshift(source);
    void this.pump();
  }

  /** Leave `seconds` of silence between what is queued so far and what comes next. */
  pause(seconds: number): void {
    this.queue.push({ kind: "pause", seconds });
    void this.pump();
  }

  /** Run `callback` when playback reaches this point of the queue. */
  cue(callback: () => void): void {
    this.queue.push({ kind: "cue", callback });
    void this.pump();
  }

  /** Call back once everything queued so far has finished playing. */
  whenDrained(callback: () => void): void {
    if (this.idle()) setTimeout(callback, 0);
    else this.drainedCallbacks.push(callback);
  }

  clear(): void {
    this.generation++;
    this.queue = [];
    this.readers.forEach((reader) => void reader.cancel().catch(() => {}));
    this.readers.clear();
    this.scheduled.forEach((node) => {
      node.onended = null;
      try {
        node.stop();
      } catch {
        // already stopped
      }
    });
    this.scheduled.clear();
    this.cues.forEach((timer) => clearTimeout(timer));
    this.cues.clear();
    this.nextStart = 0;
    this.pumping = false;
    this.onFirstSound = null;
    this.drainedCallbacks = [];
  }

  private idle(): boolean {
    return !this.pumping && this.queue.length === 0 && this.scheduled.size === 0 && this.cues.size === 0;
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    const generation = this.generation;
    while (this.queue.length > 0 && generation === this.generation) {
      const source = this.queue.shift()!;
      if (source.kind === "buffer") {
        this.schedule(new Float32Array(source.data.slice(0, source.data.byteLength - (source.data.byteLength % 4))), source.tag);
      } else if (source.kind === "stream") {
        await this.playStream(source, generation);
      } else if (source.kind === "pause") {
        if (this.context) this.nextStart = Math.max(this.context.currentTime + LEAD_S, this.nextStart) + source.seconds;
      } else {
        this.scheduleCue(source.callback);
      }
    }
    if (generation === this.generation) {
      this.pumping = false;
      this.checkDrained();
    }
  }

  private async playStream(source: Extract<Source, { kind: "stream" }>, generation: number): Promise<void> {
    const body = await source.body;
    if (!body || generation !== this.generation) return;
    const reader = body.getReader();
    this.readers.add(reader);
    let carry = new Uint8Array(0);
    try {
      while (generation === this.generation) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        // join the bytes left over from the previous chunk, keep whole 4-byte samples only
        const bytes = new Uint8Array(carry.length + value.length);
        bytes.set(carry);
        bytes.set(value, carry.length);
        const whole = bytes.length - (bytes.length % 4);
        carry = bytes.slice(whole);
        if (whole > 0) this.schedule(new Float32Array(bytes.slice(0, whole).buffer), source.tag);
      }
    } catch {
      // a cancelled or broken stream ends this reply; what follows plays
    } finally {
      this.readers.delete(reader);
    }
  }

  private schedule(samples: Float32Array, tag: SoundKind): void {
    const context = this.context;
    if (!context || samples.length === 0) return;
    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);
    const startAt = Math.max(context.currentTime + LEAD_S, this.nextStart);
    node.start(startAt);
    this.nextStart = startAt + buffer.duration;
    this.scheduled.add(node);
    node.onended = () => {
      this.scheduled.delete(node);
      this.checkDrained();
    };
    if (this.onFirstSound) {
      const report = this.onFirstSound;
      this.onFirstSound = null;
      report(performance.now() + (startAt - context.currentTime) * 1000, tag);
    }
  }

  /** The cue runs when what is scheduled so far has played; until then the player is not drained. */
  private scheduleCue(callback: () => void): void {
    const waitMs = this.context ? Math.max(0, (this.nextStart - this.context.currentTime) * 1000) : 0;
    const timer = setTimeout(() => {
      this.cues.delete(timer);
      callback();
      this.checkDrained();
    }, waitMs);
    this.cues.add(timer);
  }

  private checkDrained(): void {
    if (!this.idle()) return;
    const callbacks = this.drainedCallbacks;
    this.drainedCallbacks = [];
    callbacks.forEach((callback) => callback());
  }
}
