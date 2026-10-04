/**
 * The browser voice engine (spec 003): mic → live transcript → conversation stream → speech.
 *
 * It mirrors the terminal client that Thomas tested (backend/scripts/talk.py) and the Decathlon
 * reference hook: realtime STT per utterance over a WebSocket, the turn's events over SSE, one
 * TTS stream per sentence played in order, fixed lines played at once, half duplex (the mic is
 * ignored while the agents speak). The engine owns the state; `useVoiceAgent` mirrors it in React.
 */

import {
  createSession,
  endSession,
  fetchLine,
  getConfig,
  postTimings,
  speak,
  streamConversation,
  type AppConfig,
  type MicMode,
} from "@/lib/api";
import { parseEvent, type Language, type StreamEvent } from "@/lib/events";
import { Mic } from "@/lib/mic";
import { PcmPlayer, type SoundKind } from "@/lib/pcm-player";
import { Utterance } from "@/lib/utterance";
import { EMPTY_REPLY_STATS, replyStats, type AgentIdentity, type TranscriptEntry, type VoiceAgent } from "@/lib/voice-agent";

export type Snapshot = Omit<VoiceAgent, "setMode" | "start" | "end" | "pttDown" | "pttUp">;

const LANGUAGES: Language[] = ["en", "fr"];
/** RMS of float samples above which a 64 ms frame counts as speech (reference used 0.01). */
const VAD_THRESHOLD = 0.012;
/** Consecutive voiced frames that open a hands-free utterance. */
const VAD_START_FRAMES = 2;
/** Silence that ends a hands-free utterance (spec 001: 700 ms; the reference waited 1.5 s). */
const VAD_SILENCE_MS = 700;
/** Frames kept from before speech starts, so the first syllable is not cut (about 320 ms). */
const PRE_ROLL_FRAMES = 5;
const MAX_UTTERANCE_MS = 20_000;
/** Give the final transcript this long after end of speech before calling it a failure. */
const STT_TIMEOUT_MS = 6_000;
/** Ignore the mic this long after the agent stops, so the tail of its voice is not heard. */
const LISTEN_GUARD_MS = 300;
const MIN_SENTENCE = 20;
/** Sentence end: . ! ? or … followed by a space or the end, not after a digit (prices). */
const SENTENCE_END = /(?<!\d)[.!?…](?=\s|$)/g;

interface Turn {
  id: string | null;
  speechEnd: number;
  sttFinal: number | null;
  requestSent: number | null;
  firstDelta: number | null;
  firstSentence: number | null;
  firstAudio: number | null;
  firstAudioKind: SoundKind | null;
  done: boolean;
  posted: boolean;
}

export function initialSnapshot(mode: MicMode = "auto"): Snapshot {
  return {
    status: "idle",
    activity: "idle",
    mode,
    language: "en",
    activeAgent: null,
    agents: [],
    transcript: [],
    productGroups: [],
    basket: { items: [], total_eur: 0 },
    profile: null,
    lastReplyMs: null,
    replyStats: EMPTY_REPLY_STATS,
    // Usage is not reported by the backend yet; the templates show the mock's figures meanwhile.
    costEur: 0,
    error: null,
  };
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export class VoiceEngine {
  private snap: Snapshot = initialSnapshot();
  private config: AppConfig | null = null;
  private sessionId: string | null = null;
  private controller = new AbortController();
  private mic: Mic | null = null;
  private readonly player = new PcmPlayer();
  private readonly lines = new Map<string, ArrayBuffer>();

  // listening
  private utterance: Utterance | null = null;
  private visitorEntryId: string | null = null;
  private holding = false;
  private voicedRun = 0;
  private preRoll: Int16Array[] = [];
  private lastVoicedAt = 0;
  private utteranceStartedAt = 0;
  private listenFrom = 0;
  private sttTimer: ReturnType<typeof setTimeout> | null = null;

  // the turn in flight: from end of speech until the reply has finished playing
  private busy = false;
  private turn: Turn | null = null;
  private currentAgent = "concierge";
  private agentEntryId: string | null = null;
  private sentence = "";
  private seq = 0;
  private replySamples: number[] = [];

  constructor(private readonly publish: (snapshot: Snapshot) => void) {}

  // ---------------------------------------------------------------- public API

  async start(): Promise<void> {
    if (this.snap.status !== "idle" && this.snap.status !== "error") return;
    this.controller = new AbortController();
    const { signal } = this.controller;
    this.update({ ...initialSnapshot(this.snap.mode), status: "starting" });
    try {
      await this.player.resume();
      this.config = await getConfig(signal);
      const session = await createSession(this.snap.language, signal);
      this.sessionId = session.session_id;
      this.currentAgent = session.agent;
      this.prefetchLines(signal);

      this.mic = new Mic((pcm, rms) => this.onFrame(pcm, rms));
      await this.mic.open();

      this.busy = true;
      this.update({
        status: "live",
        activity: "speaking",
        agents: this.identities(),
        activeAgent: this.identity(session.agent),
      });
      const welcome = await this.loadLine(session.agent, session.welcome_line, signal);
      this.addLineEntry(session.agent, session.welcome_line);
      if (welcome) this.player.enqueue({ kind: "buffer", data: welcome, tag: "line" });
      this.player.whenDrained(() => this.becomeReady());
    } catch (error) {
      if (isAbort(error)) return;
      this.mic?.close();
      this.mic = null;
      this.update({ status: "error", activity: "idle", error: `Could not start: ${message(error)}` });
    }
  }

  async end(): Promise<void> {
    this.controller.abort();
    this.stopListening();
    this.mic?.close();
    this.mic = null;
    this.player.clear();
    if (this.sessionId) void endSession(this.sessionId).catch(() => {});
    this.sessionId = null;
    this.busy = false;
    this.turn = null;
    this.replySamples = [];
    this.update(initialSnapshot(this.snap.mode));
  }

  setMode(mode: MicMode): void {
    if (mode === this.snap.mode) return;
    this.stopListening();
    this.update({ mode, activity: this.restingActivity(mode) });
  }

  pttDown(): void {
    if (this.snap.status !== "live" || this.snap.mode !== "push_to_talk" || this.busy || this.holding) return;
    this.holding = true;
    this.beginUtterance(performance.now());
  }

  pttUp(): void {
    if (!this.holding) return;
    this.holding = false;
    this.finishUtterance(performance.now());
  }

  // ---------------------------------------------------------------- listening

  private onFrame(pcm: Int16Array, rms: number): void {
    if (this.snap.status !== "live") return;
    const now = performance.now();
    if (this.snap.mode === "push_to_talk") {
      if (this.holding) this.utterance?.send(pcm);
      return;
    }
    if (this.busy || now < this.listenFrom) return;
    const voiced = rms > VAD_THRESHOLD;
    if (!this.utterance) {
      this.preRoll.push(pcm);
      if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
      this.voicedRun = voiced ? this.voicedRun + 1 : 0;
      if (this.voicedRun >= VAD_START_FRAMES) {
        this.beginUtterance(now);
        this.preRoll.forEach((frame) => this.utterance?.send(frame));
        this.preRoll = [];
        this.lastVoicedAt = now;
      }
      return;
    }
    this.utterance.send(pcm);
    if (voiced) this.lastVoicedAt = now;
    if (now - this.lastVoicedAt > VAD_SILENCE_MS || now - this.utteranceStartedAt > MAX_UTTERANCE_MS) {
      this.finishUtterance(this.lastVoicedAt);
    }
  }

  private beginUtterance(now: number): void {
    this.utteranceStartedAt = now;
    const id = this.nextId();
    this.visitorEntryId = id;
    let text = "";
    this.utterance = new Utterance(this.snap.language, {
      onDelta: (delta) => {
        text += delta;
        this.upsertEntry({ id, kind: "visitor", agent: null, text: text.trim(), final: false });
      },
      onDone: (finalText, language) => this.onTranscribed(id, finalText, language),
      onError: (error) => this.onListeningFailed(id, error),
    });
    this.update({ activity: "listening" });
  }

  private finishUtterance(speechEnd: number): void {
    const utterance = this.utterance;
    if (!utterance) return;
    this.utterance = null;
    this.busy = true;
    this.turn = {
      id: null,
      speechEnd,
      sttFinal: null,
      requestSent: null,
      firstDelta: null,
      firstSentence: null,
      firstAudio: null,
      firstAudioKind: null,
      done: false,
      posted: false,
    };
    utterance.end();
    this.sttTimer = setTimeout(() => {
      utterance.close();
      if (this.visitorEntryId) this.onListeningFailed(this.visitorEntryId, "no transcript received");
    }, STT_TIMEOUT_MS);
    this.update({ activity: "thinking" });
  }

  private onTranscribed(entryId: string, text: string, language: Language): void {
    if (this.sttTimer) clearTimeout(this.sttTimer);
    this.sttTimer = null;
    this.visitorEntryId = null;
    const turn = this.turn;
    if (!turn || !this.busy) return;
    if (!text.trim()) {
      this.removeEntry(entryId);
      this.becomeReady();
      return;
    }
    turn.sttFinal = performance.now();
    this.upsertEntry({ id: entryId, kind: "visitor", agent: null, text: text.trim(), final: true });
    if (language !== this.snap.language) {
      this.snap = { ...this.snap, language };
      this.update({ agents: this.identities(), activeAgent: this.identity(this.currentAgent) });
    }
    void this.runTurn(turn, text.trim(), language);
  }

  private onListeningFailed(entryId: string, error: string): void {
    if (this.sttTimer) clearTimeout(this.sttTimer);
    this.sttTimer = null;
    this.visitorEntryId = null;
    this.utterance = null;
    this.removeEntry(entryId);
    this.update({ error: `Speech recognition: ${error}` });
    this.becomeReady();
  }

  private stopListening(): void {
    this.utterance?.close();
    this.utterance = null;
    if (this.visitorEntryId) this.removeEntry(this.visitorEntryId);
    this.visitorEntryId = null;
    this.holding = false;
    this.voicedRun = 0;
    this.preRoll = [];
  }

  /** Back to waiting for the visitor, after the welcome or after a reply has finished playing. */
  private becomeReady(): void {
    this.busy = false;
    this.listenFrom = performance.now() + LISTEN_GUARD_MS;
    if (this.snap.status === "live") this.update({ activity: this.restingActivity(this.snap.mode) });
  }

  private restingActivity(mode: MicMode): Snapshot["activity"] {
    if (this.snap.status !== "live") return "idle";
    if (this.busy) return this.snap.activity;
    return mode === "auto" ? "listening" : "idle";
  }

  // ---------------------------------------------------------------- the turn

  private async runTurn(turn: Turn, text: string, language: Language): Promise<void> {
    const sessionId = this.sessionId;
    if (!sessionId) return;
    this.agentEntryId = null;
    this.sentence = "";
    this.player.markTurn((at, kind) => {
      turn.firstAudio = at;
      turn.firstAudioKind = kind;
      const replyMs = Math.max(0, Math.round(at - turn.speechEnd));
      this.replySamples.push(replyMs);
      this.update({ activity: "speaking", lastReplyMs: replyMs, replyStats: replyStats(this.replySamples) });
      this.postTimings(turn);
    });
    try {
      turn.requestSent = performance.now();
      const response = await streamConversation({ session_id: sessionId, text, language }, this.controller.signal);
      if (!response.body) throw new Error("empty conversation stream");
      await readSse(response.body, (event) => this.onEvent(turn, event));
    } catch (error) {
      if (isAbort(error)) return;
      this.update({ error: `Conversation: ${message(error)}` });
    }
    this.flushSentences(true);
    this.closeAgentEntry();
    turn.done = true;
    this.postTimings(turn);
    this.player.whenDrained(() => {
      if (this.turn === turn) this.becomeReady();
    });
  }

  private onEvent(turn: Turn, event: StreamEvent): void {
    switch (event.type) {
      case "turn.started":
        turn.id = event.turn_id;
        this.currentAgent = event.agent;
        break;
      case "text.delta":
        turn.firstDelta ??= performance.now();
        if (event.agent !== this.currentAgent) {
          this.flushSentences(true);
          this.currentAgent = event.agent;
        }
        this.sentence += event.text;
        this.flushSentences(false);
        break;
      case "tool.started":
        this.flushSentences(true);
        break;
      case "line.play":
        this.flushSentences(true);
        this.playLine(event.agent, event.line);
        break;
      case "agent.switched":
        this.flushSentences(true);
        this.closeAgentEntry();
        this.currentAgent = event.to_agent;
        this.appendEntry({
          id: this.nextId(),
          kind: "handover",
          agent: event.to_agent,
          text: this.identity(event.to_agent)?.displayName ?? event.to_agent,
          final: true,
        });
        this.update({ activeAgent: this.identity(event.to_agent) });
        break;
      case "products.shown": {
        const groupId = `${event.turn_id}-${this.snap.productGroups.length}`;
        this.update({
          productGroups: [
            ...this.snap.productGroups,
            {
              id: groupId,
              kind: event.best_match_id ? "recommendation" : "routine",
              products: event.products,
              bestMatchId: event.best_match_id,
            },
          ],
        });
        this.appendEntry({ id: this.nextId(), kind: "products", agent: this.currentAgent, text: "", final: true, groupId });
        break;
      }
      case "basket.updated":
        this.update({ basket: { items: event.items, total_eur: event.total_eur } });
        break;
      case "profile.updated":
        this.update({ profile: event.profile });
        break;
      case "turn.done":
        this.flushSentences(true);
        break;
      case "error":
        this.update({ error: event.message });
        break;
      default:
        break;
    }
  }

  /** Send every complete sentence to speech; with `force`, the rest too. */
  private flushSentences(force: boolean): void {
    let cut = 0;
    for (const match of this.sentence.matchAll(SENTENCE_END)) {
      const end = (match.index ?? 0) + 1;
      const candidate = this.sentence.slice(cut, end).trim();
      if (candidate.length >= MIN_SENTENCE) {
        this.speakSentence(candidate);
        cut = end;
      }
    }
    this.sentence = this.sentence.slice(cut);
    if (force && this.sentence.trim()) {
      this.speakSentence(this.sentence.trim());
      this.sentence = "";
    }
  }

  private speakSentence(text: string): void {
    const turn = this.turn;
    if (turn) turn.firstSentence ??= performance.now();
    const agent = this.currentAgent;
    this.appendToAgentEntry(agent, text);
    // Start the request now so it downloads while earlier sentences play.
    const body = speak(agent, this.snap.language, text, this.controller.signal)
      .then((response) => response.body)
      .catch((error: unknown) => {
        if (!isAbort(error)) console.warn("speech skipped:", message(error));
        return null;
      });
    this.player.enqueue({ kind: "stream", body, tag: "speech" });
  }

  private playLine(agent: string, line: string): void {
    const pcm = this.lines.get(lineKey(agent, line, this.snap.language)) ?? this.lines.get(lineKey(agent, line, "en"));
    this.addLineEntry(agent, line);
    if (pcm) this.player.playNow({ kind: "buffer", data: pcm, tag: "line" });
  }

  private postTimings(turn: Turn): void {
    if (turn.posted || !turn.done || turn.firstAudio === null || !turn.id || !this.sessionId) return;
    turn.posted = true;
    const since = (t: number | null) => (t === null ? null : Math.round(t - turn.speechEnd));
    void postTimings(turn.id, {
      session_id: this.sessionId,
      mode: this.snap.mode,
      stt_final: since(turn.sttFinal),
      request_sent: since(turn.requestSent),
      first_delta: since(turn.firstDelta),
      first_sentence: since(turn.firstSentence),
      first_audio: since(turn.firstAudio),
      first_audio_kind: turn.firstAudioKind,
    }).catch(() => {});
  }

  // ---------------------------------------------------------------- fixed lines

  private prefetchLines(signal: AbortSignal): void {
    for (const agent of this.config?.agents ?? []) {
      for (const line of agent.lines) {
        for (const language of LANGUAGES) {
          void this.loadLine(agent.id, line, signal, language);
        }
      }
    }
  }

  private async loadLine(
    agent: string,
    line: string,
    signal: AbortSignal,
    language: Language = this.snap.language,
  ): Promise<ArrayBuffer | null> {
    const key = lineKey(agent, line, language);
    const cached = this.lines.get(key);
    if (cached) return cached;
    try {
      const pcm = await fetchLine(agent, line, language, signal);
      this.lines.set(key, pcm);
      return pcm;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------- transcript and identities

  private addLineEntry(agent: string, line: string): void {
    const texts = this.config?.agents.find((a) => a.id === agent)?.line_texts?.[line];
    const text = texts?.[this.snap.language];
    if (!text) return;
    this.closeAgentEntry();
    this.appendEntry({ id: this.nextId(), kind: "agent", agent, text, final: true });
  }

  private appendToAgentEntry(agent: string, text: string): void {
    const current = this.snap.transcript.find((e) => e.id === this.agentEntryId);
    if (current && current.agent === agent) {
      this.upsertEntry({ ...current, text: `${current.text} ${text}` });
      return;
    }
    this.agentEntryId = this.nextId();
    this.appendEntry({ id: this.agentEntryId, kind: "agent", agent, text, final: false });
  }

  private closeAgentEntry(): void {
    const current = this.snap.transcript.find((e) => e.id === this.agentEntryId);
    if (current && !current.final) this.upsertEntry({ ...current, final: true });
    this.agentEntryId = null;
  }

  private appendEntry(entry: TranscriptEntry): void {
    this.update({ transcript: [...this.snap.transcript, entry] });
  }

  private upsertEntry(entry: TranscriptEntry): void {
    const exists = this.snap.transcript.some((e) => e.id === entry.id);
    this.update({
      transcript: exists
        ? this.snap.transcript.map((e) => (e.id === entry.id ? entry : e))
        : [...this.snap.transcript, entry],
    });
  }

  private removeEntry(id: string): void {
    this.update({ transcript: this.snap.transcript.filter((e) => e.id !== id) });
  }

  private identities(): AgentIdentity[] {
    return (this.config?.agents ?? []).map((agent) => ({
      id: agent.id,
      displayName: agent.display_name[this.snap.language],
      roleLabel: agent.role_label[this.snap.language],
    }));
  }

  private identity(agentId: string): AgentIdentity | null {
    return this.identities().find((agent) => agent.id === agentId) ?? null;
  }

  private nextId(): string {
    this.seq += 1;
    return `e${this.seq}`;
  }

  private update(patch: Partial<Snapshot>): void {
    this.snap = { ...this.snap, ...patch };
    this.publish(this.snap);
  }
}

function lineKey(agent: string, line: string, language: Language): string {
  return `${agent}/${line}/${language}`;
}

/** Read an SSE body and hand each `data:` event to `onEvent`; a bad event is skipped. */
async function readSse(body: ReadableStream<Uint8Array>, onEvent: (event: StreamEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(parseEvent(json));
      } catch (error) {
        console.warn("skipped a stream event:", message(error));
      }
    }
  }
}
