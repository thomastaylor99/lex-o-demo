/**
 * The browser voice engine (spec 003): mic → live transcript → conversation stream → speech.
 *
 * It mirrors the terminal client that Thomas tested (backend/scripts/talk.py) and the Decathlon
 * reference hook: realtime STT over a WebSocket per stretch of speech, the turn's events over SSE,
 * one TTS stream per reply (the whole text, so the voice keeps one intonation), fixed lines played
 * at once, half duplex (the mic is ignored while the agents speak). The engine owns the state;
 * `useVoiceAgent` mirrors it in React.
 */

import {
  createSession,
  endSession,
  fetchLine,
  getConfig,
  getUsage,
  postTimings,
  prepareRecap,
  speak,
  streamConversation,
  type AppConfig,
  type MicMode,
} from "@/lib/api";
import { parseEvent, type Language, type RecapReady, type StreamEvent } from "@/lib/events";
import { endAfterMs, HOLD_MS } from "@/lib/hesitation";
import { Mic } from "@/lib/mic";
import { PcmPlayer, type SoundKind } from "@/lib/pcm-player";
import { SpeechGate } from "@/lib/speech-gate";
import { Utterance } from "@/lib/utterance";
import {
  EMPTY_REPLY_STATS,
  replyStats,
  type AgentIdentity,
  type EmailResult,
  type TranscriptEntry,
  type VoiceAgent,
} from "@/lib/voice-agent";

export type Snapshot = Omit<VoiceAgent, "setMode" | "start" | "end" | "pttDown" | "pttUp" | "submitEmail">;

const LANGUAGES: Language[] = ["en", "fr"];
/** Frames kept from before speech starts, so the first syllable is not cut (about 320 ms). */
const PRE_ROLL_FRAMES = 5;
/** A recap written faster than this needs no "one moment" line. */
const RECAP_FILLER_AFTER_MS = 800;
/** Give a socket's final text this long after its audio ended before calling it a failure. */
const STT_TIMEOUT_MS = 6_000;
/** Ignore the mic this long after the agent stops, so the tail of its voice is not heard. */
const LISTEN_GUARD_MS = 300;
/**
 * At a handover the new agent joins when the previous one has finished its line, and speaks after
 * this pause. With none, the second voice cut in the moment the first stopped.
 */
const HANDOVER_PAUSE_S = 1.2;

/** One transcription socket's share of the visitor's line: a pause can end one and start the next. */
interface Segment {
  socket: Utterance | null;
  text: string; // the live deltas, then the final text
  ended: boolean;
  final: boolean;
  language: Language | null;
}

interface Turn {
  id: string | null;
  speechEnd: number;
  sttFinal: number | null;
  requestSent: number | null;
  firstDelta: number | null;
  /** The first reply text sent to speech, posted as `first_sentence`. */
  firstSpeech: number | null;
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
    tutorialGroups: [],
    recap: null,
    basket: { items: [], total_eur: 0 },
    profile: null,
    lastReplyMs: null,
    replyStats: EMPTY_REPLY_STATS,
    // The session's running cost: turn.done carries it, GET /sessions/{id}/usage tops it up.
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

  // listening: the visitor's line, as one segment per transcription socket
  private segments: Segment[] = [];
  private recording: Segment | null = null; // the segment the mic frames go to
  /** Bumped whenever the line is dropped or settled, so the late callbacks of its sockets are ignored. */
  private lineGen = 0;
  private visitorEntryId: string | null = null;
  /** The visitor has finished: the turn waits for the final text of every segment. */
  private awaitingText = false;
  private holding = false;
  private readonly gate = new SpeechGate();
  private preRoll: Int16Array[] = [];
  private listenFrom = 0;
  private sttTimer: ReturnType<typeof setTimeout> | null = null;

  // the turn in flight: from end of speech until the reply has finished playing
  private busy = false;
  private turn: Turn | null = null;
  private currentAgent = "concierge";
  private agentEntryId: string | null = null;
  /** Reply text not sent to speech yet: `text.done` sends it whole. */
  private unspoken = "";
  /** While an agent joins, changes to the transcript wait here and show when its voice starts. */
  private joining: (() => void)[] | null = null;
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
    this.settleLine(); // its STT timer would otherwise remove the next visitor's line
    this.mic?.close();
    this.mic = null;
    this.player.clear();
    if (this.sessionId) void endSession(this.sessionId).catch(() => {});
    this.sessionId = null;
    this.busy = false;
    this.turn = null;
    this.joining = null;
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
    this.beginSegment();
  }

  pttUp(): void {
    if (!this.holding) return;
    this.holding = false;
    this.endLine(performance.now());
  }

  /**
   * The visitor typed their address on screen (spec 006). The backend writes the recap; the expert
   * says "one moment" if that takes a while, then that the recap and the offer are on screen.
   */
  async submitEmail(email: string): Promise<EmailResult> {
    const sessionId = this.sessionId;
    if (this.snap.status !== "live" || sessionId === null) return { ok: false, error: "failed" };
    const agent = this.currentAgent;
    this.stopListening();
    this.busy = true;
    this.update({ activity: "thinking" });
    const filler = setTimeout(() => {
      this.playLine(agent, "filler_recap");
      this.update({ activity: "speaking" });
    }, RECAP_FILLER_AFTER_MS);
    const answer = await prepareRecap(sessionId, email, this.controller.signal);
    clearTimeout(filler);
    if (sessionId !== this.sessionId) return { ok: false, error: "failed" };
    if (!answer.ok) {
      // The field shows what went wrong; when the backend failed, the expert says so too, so the
      // visitor never hears "One moment" followed by silence.
      if (answer.error === "failed") {
        this.update({ activity: "speaking" });
        this.playLine(agent, "recap_failed", false);
      }
      this.player.whenDrained(() => this.becomeReady());
      return answer;
    }
    for (const event of answer.events) {
      if (event.type === "profile.updated") this.update({ profile: event.profile });
      else if (event.type === "recap.ready") this.showRecap(event);
    }
    this.raiseCost(sessionId, answer.costEur);
    this.update({ activity: "speaking" });
    this.playLine(agent, "recap_ready", false);
    this.player.whenDrained(() => this.becomeReady());
    return { ok: true };
  }

  // ---------------------------------------------------------------- listening

  private onFrame(pcm: Int16Array, rms: number): void {
    if (this.snap.status !== "live") return;
    if (this.snap.mode === "push_to_talk") {
      if (this.holding) this.recording?.socket?.send(pcm);
      return;
    }
    if (this.busy) return;
    const now = performance.now();
    // Right after the agent stops, its voice may still echo: nothing is heard yet, but the frames
    // stay in the pre-roll, so a quick "Yes" keeps its first word.
    const event = now < this.listenFrom ? null : this.gate.frame(now, rms, this.endAfter());
    if (this.recording) this.recording.socket?.send(pcm);
    else this.keepPreRoll(pcm);
    if (event === "start" || event === "resume") this.beginSegment();
    else if (event === "soft_end") this.endSegment();
    else if (event === "end") this.endLine(this.gate.speechEnd);
  }

  /** The silence that ends the line: 700 ms once its words are in and look finished, else longer. */
  private endAfter(): number {
    return this.segments.some((s) => !s.final) ? HOLD_MS : endAfterMs(lineText(this.segments));
  }

  private keepPreRoll(pcm: Int16Array): void {
    this.preRoll.push(pcm);
    if (this.preRoll.length > PRE_ROLL_FRAMES) this.preRoll.shift();
  }

  /** Open a transcription socket for the visitor's line and send it the frames kept from just before. */
  private beginSegment(): void {
    this.visitorEntryId ??= this.nextId();
    const gen = this.lineGen;
    const current = () => gen === this.lineGen;
    const segment: Segment = { socket: null, text: "", ended: false, final: false, language: null };
    segment.socket = new Utterance(this.snap.language, this.sessionId, {
      onDelta: (delta) => {
        if (!current()) return;
        segment.text += delta;
        this.showLine();
      },
      onDone: (text, language) => {
        if (current()) this.onSegmentDone(segment, text, language);
      },
      onError: (error) => {
        if (current()) this.onListeningFailed(error);
      },
    });
    this.segments.push(segment);
    this.recording = segment;
    this.preRoll.forEach((frame) => segment.socket?.send(frame));
    this.preRoll = [];
    this.update({ activity: "listening", error: null });
  }

  /** End the recording socket. Its final text comes back while the visitor may still go on. */
  private endSegment(): void {
    const segment = this.recording;
    if (!segment) return;
    this.recording = null;
    segment.ended = true;
    segment.socket?.end();
    const gen = this.lineGen;
    if (this.sttTimer) clearTimeout(this.sttTimer);
    this.sttTimer = setTimeout(() => {
      if (gen === this.lineGen && this.segments.some((s) => s.ended && !s.final)) {
        this.onListeningFailed("no transcript received");
      }
    }, STT_TIMEOUT_MS);
  }

  /** The visitor has finished: the last socket ends, and the turn runs once the text is in. */
  private endLine(speechEnd: number): void {
    this.endSegment();
    this.gate.reset();
    this.preRoll = [];
    if (this.segments.length === 0) return;
    this.openTurn(speechEnd);
    this.awaitingText = true;
    this.completeLine();
  }

  /** The visitor has finished speaking: the turn starts its clock and the mic is ignored. */
  private openTurn(speechEnd: number): void {
    this.busy = true;
    this.turn = {
      id: null,
      speechEnd,
      sttFinal: null,
      requestSent: null,
      firstDelta: null,
      firstSpeech: null,
      firstAudio: null,
      firstAudioKind: null,
      done: false,
      posted: false,
    };
    this.update({ activity: "thinking" });
  }

  private onSegmentDone(segment: Segment, text: string, language: Language): void {
    segment.text = text.trim();
    segment.final = true;
    segment.language = language;
    if (segment === this.recording) {
      // The server closed the sentence while the visitor is still speaking (Thomas, 2026-10-05:
      // keep listening): carry on with a new socket on the same line, and answer the whole line
      // after the visitor's own silence.
      this.recording = null;
      this.beginSegment();
    }
    this.showLine();
    // The text comes just after 700 ms of silence: a line that looks finished ends now.
    if (this.gate.silentFor(performance.now(), this.endAfter())) this.endLine(this.gate.speechEnd);
    else this.completeLine();
  }

  /** Once the visitor has finished and every socket has given its final text, the turn runs. */
  private completeLine(): void {
    const turn = this.turn;
    if (!this.awaitingText || !turn || this.segments.some((s) => !s.final)) return;
    const entryId = this.visitorEntryId;
    const said = lineText(this.segments);
    const language = this.segments.findLast((s) => s.text)?.language ?? this.snap.language;
    this.settleLine();
    if (!entryId || !said) {
      if (entryId) this.removeEntry(entryId);
      this.becomeReady();
      return;
    }
    turn.sttFinal = performance.now();
    this.upsertEntry({ id: entryId, kind: "visitor", agent: null, text: said, final: true });
    if (language !== this.snap.language) {
      this.snap = { ...this.snap, language };
      this.update({ agents: this.identities(), activeAgent: this.identity(this.currentAgent) });
    }
    void this.runTurn(turn, said, language);
  }

  /** The visitor's words so far, live. */
  private showLine(): void {
    const text = lineText(this.segments);
    if (this.visitorEntryId && text) {
      this.upsertEntry({ id: this.visitorEntryId, kind: "visitor", agent: null, text, final: false });
    }
  }

  private onListeningFailed(error: string): void {
    const entryId = this.visitorEntryId;
    this.settleLine();
    this.gate.reset();
    this.preRoll = [];
    if (entryId) this.removeEntry(entryId);
    this.update({ error: `Speech recognition: ${error}` });
    this.becomeReady();
  }

  /** The line is over: stop its timer, close its sockets, ignore what they still send. */
  private settleLine(): void {
    this.lineGen++;
    if (this.sttTimer) clearTimeout(this.sttTimer);
    this.sttTimer = null;
    this.segments.forEach((segment) => segment.socket?.close());
    this.segments = [];
    this.recording = null;
    this.visitorEntryId = null;
    this.awaitingText = false;
  }

  /** Drop the line the visitor has not finished; a finished line waiting for its text carries on. */
  private stopListening(): void {
    if (!this.awaitingText && this.segments.length > 0) {
      const entryId = this.visitorEntryId;
      this.settleLine();
      if (entryId) this.removeEntry(entryId);
    }
    this.holding = false;
    this.gate.reset();
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
    this.unspoken = "";
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
    this.speakUnspoken();
    this.whenJoined(() => this.closeAgentEntry());
    turn.done = true;
    this.postTimings(turn);
    this.player.whenDrained(() => {
      if (this.turn === turn) this.becomeReady();
      void this.refreshCost(sessionId); // the turn's speech requests have all started by now
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
          this.speakUnspoken();
          this.currentAgent = event.agent;
        }
        this.unspoken += event.text;
        break;
      case "text.done":
        // The model call's text is complete: one request speaks it whole, in one intonation.
        if (this.unspoken.trim()) this.speakText(event.agent, event.text);
        this.unspoken = "";
        break;
      case "tool.started":
        this.speakUnspoken();
        break;
      case "line.play":
        this.speakUnspoken();
        this.playLine(event.agent, event.line);
        break;
      case "agent.switched": {
        this.speakUnspoken();
        this.closeAgentEntry();
        const to = event.to_agent;
        this.currentAgent = to;
        // The new agent joins once the previous one's line has played, then speaks after a pause;
        // its words reach the screen with its voice.
        this.joining = [];
        this.player.cue(() => {
          this.appendEntry({ id: this.nextId(), kind: "handover", agent: to, text: this.identity(to)?.displayName ?? to, final: true });
          this.update({ activeAgent: this.identity(to), activity: "thinking" });
        });
        this.player.pause(HANDOVER_PAUSE_S);
        this.player.cue(() => {
          const changes = this.joining ?? [];
          this.joining = null;
          changes.forEach((change) => change());
          this.update({ activity: "speaking" });
        });
        break;
      }
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
        const agent = this.currentAgent;
        this.whenJoined(() => this.appendEntry({ id: this.nextId(), kind: "products", agent, text: "", final: true, groupId }));
        break;
      }
      case "basket.updated":
        this.update({ basket: { items: event.items, total_eur: event.total_eur } });
        break;
      case "profile.updated":
        this.update({ profile: event.profile });
        break;
      case "tutorials.shown": {
        const groupId = `${event.turn_id}-t${this.snap.tutorialGroups.length}`;
        this.update({ tutorialGroups: [...this.snap.tutorialGroups, { id: groupId, tutorials: event.tutorials }] });
        const agent = this.currentAgent;
        this.whenJoined(() => this.appendEntry({ id: this.nextId(), kind: "tutorials", agent, text: "", final: true, groupId }));
        break;
      }
      case "recap.ready":
        this.showRecap(event);
        break;
      case "turn.done":
        this.speakUnspoken();
        this.raiseCost(this.sessionId, event.cost_eur);
        break;
      case "error":
        this.update({ error: event.message });
        break;
      default:
        break;
    }
  }

  /** Speak reply text whose `text.done` never came, as when the stream broke off. */
  private speakUnspoken(): void {
    const text = this.unspoken.trim();
    this.unspoken = "";
    if (text) this.speakText(this.currentAgent, text);
  }

  private speakText(agent: string, text: string): void {
    const turn = this.turn;
    if (turn) turn.firstSpeech ??= performance.now();
    this.whenJoined(() => this.appendToAgentEntry(agent, text.trim()));
    // Start the request now so it downloads while what is queued before it plays.
    const body = speak(agent, this.snap.language, text, this.sessionId, this.controller.signal)
      .then((response) => response.body)
      .catch((error: unknown) => {
        if (!isAbort(error)) console.warn("speech skipped:", message(error));
        return null;
      });
    this.player.enqueue({ kind: "stream", body, tag: "speech" });
  }

  /**
   * A fixed line, played at once (handover, fillers) or after what is already queued. While an
   * agent joins, its lines wait for the end of the pause.
   */
  private playLine(agent: string, line: string, now = true): void {
    const pcm = this.lines.get(lineKey(agent, line, this.snap.language)) ?? this.lines.get(lineKey(agent, line, "en"));
    this.whenJoined(() => this.addLineEntry(agent, line));
    if (!pcm) return;
    if (now && this.joining === null) this.player.playNow({ kind: "buffer", data: pcm, tag: "line" });
    else this.player.enqueue({ kind: "buffer", data: pcm, tag: "line" });
  }

  /** A change to the transcript, now or, while an agent joins, when its voice starts. */
  private whenJoined(change: () => void): void {
    if (this.joining) this.joining.push(change);
    else change();
  }

  /** The recap preview, where it appeared in the conversation. */
  private showRecap(event: RecapReady): void {
    this.update({
      recap: { emailMasked: event.email_masked, subject: event.subject, body: event.body, coupon: event.coupon },
    });
    this.appendEntry({ id: this.nextId(), kind: "recap", agent: this.currentAgent, text: "", final: true });
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
      first_sentence: since(turn.firstSpeech),
      first_audio: since(turn.firstAudio),
      first_audio_kind: turn.firstAudioKind,
    }).catch(() => {});
  }

  // ---------------------------------------------------------------- running cost

  /** Fetch the session's cost once a turn's audio has played; an answer for an older session is dropped. */
  private async refreshCost(sessionId: string): Promise<void> {
    try {
      const usage = await getUsage(sessionId, this.controller.signal);
      this.raiseCost(sessionId, usage.cost_eur);
    } catch {
      // ended, expired or unreachable: keep the last figure
    }
  }

  /** Keep the highest total seen for the current session, since answers can arrive out of order. */
  private raiseCost(sessionId: string | null, eur: number): void {
    if (sessionId === null || sessionId !== this.sessionId || !(eur > this.snap.costEur)) return;
    this.update({ costEur: eur });
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

/** The visitor's line: the text of each segment, in order. */
function lineText(segments: Segment[]): string {
  return segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ");
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
