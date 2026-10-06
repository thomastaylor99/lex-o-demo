/**
 * The visitor's voice for the live browser test (tests/e2e/live-audio.spec.ts): one English
 * sentence spoken by the backend's TTS, written as a 16 kHz mono 16-bit WAV that Chrome's fake
 * microphone plays (--use-file-for-fake-audio-capture). Run once, with the backend on :8000:
 *
 *   node tests/fixtures/make-visitor-audio.mjs
 *
 * The mic opens at Begin, then the welcome line (about 6 s) plays while the engine ignores the
 * mic (half duplex), so 8 s of silence come first. 4 s of silence after let end of speech fire.
 *
 * `node tests/fixtures/make-visitor-audio.mjs pause` writes a shorter request with 1.5 s of silence
 * after "for a", as a visitor looking for the word: the engine must keep it in one line (spec 001).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const TEXT = "Hi, I'm looking for a moisturiser, my skin has been feeling really tight lately.";
const PAUSED = process.argv[2] === "pause";
const PARTS = PAUSED ? ["I'm looking for a", "moisturiser, my skin feels really tight."] : [TEXT];
const PAUSE_S = 1.5;
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "audio",
  PAUSED ? "visitor-pause-en.wav" : "visitor-moisturiser-en.wav",
);
/** /voice/speak answers with float32 little-endian PCM, 24 kHz mono. */
const TTS_RATE = 24_000;
const RATE = 16_000;
const SILENCE_BEFORE_S = 8;
const SILENCE_AFTER_S = PAUSED ? 2.5 : 4; // the pause variant's last words end the line at 700 ms
/** A close microphone's level, well above the engine's voice threshold. */
const PEAK = 0.6;
/** The engine's voice threshold (frame RMS), and the longest pause kept inside the sentence. */
const VOICE_RMS = 0.012;
const MAX_PAUSE_S = 0.3;

/** Windowed-sinc resampling with a cutoff just under the new Nyquist, so nothing aliases. */
function resample(input, from, to) {
  const step = from / to;
  const cutoff = (0.45 * to) / from; // cycles per input sample
  const half = 32; // input samples on each side
  const output = new Float32Array(Math.floor(input.length / step));
  for (let n = 0; n < output.length; n++) {
    const centre = n * step;
    let sum = 0;
    for (let k = Math.max(0, Math.ceil(centre - half)); k <= Math.min(input.length - 1, centre + half); k++) {
      const t = k - centre;
      const sinc = t === 0 ? 1 : Math.sin(2 * Math.PI * cutoff * t) / (2 * Math.PI * cutoff * t);
      const blackman = 0.42 + 0.5 * Math.cos((Math.PI * t) / half) + 0.08 * Math.cos((2 * Math.PI * t) / half);
      sum += input[k] * 2 * cutoff * sinc * blackman;
    }
    output[n] = sum;
  }
  return output;
}

/**
 * Caps every quiet stretch at `maxS`. The engine ends an utterance after 700 ms below its voice
 * threshold, and TTS can pause that long after "Hi,", which would send "Hi" as the whole turn.
 */
function tighten(speech, rate, maxS) {
  const block = Math.round(rate * 0.016);
  const maxBlocks = Math.round(maxS / 0.016);
  const kept = [];
  let quiet = 0;
  for (let start = 0; start < speech.length; start += block) {
    const chunk = speech.subarray(start, start + block);
    const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length);
    quiet = rms < VOICE_RMS ? quiet + 1 : 0;
    if (quiet <= maxBlocks) kept.push(chunk);
  }
  const output = new Float32Array(kept.reduce((total, chunk) => total + chunk.length, 0));
  kept.reduce((offset, chunk) => (output.set(chunk, offset), offset + chunk.length), 0);
  return output;
}

/** A PCM WAV, 16-bit mono, with silence around the speech. */
function wav(speech, rate, before, after) {
  const lead = Math.round(before * rate);
  const samples = lead + speech.length + Math.round(after * rate);
  const file = Buffer.alloc(44 + samples * 2); // zeros: the silence is already there
  file.write("RIFF", 0);
  file.writeUInt32LE(36 + samples * 2, 4);
  file.write("WAVEfmt ", 8);
  file.writeUInt32LE(16, 16); // fmt chunk size
  file.writeUInt16LE(1, 20); // PCM
  file.writeUInt16LE(1, 22); // mono
  file.writeUInt32LE(rate, 24);
  file.writeUInt32LE(rate * 2, 28); // bytes per second
  file.writeUInt16LE(2, 32); // bytes per frame
  file.writeUInt16LE(16, 34); // bits per sample
  file.write("data", 36);
  file.writeUInt32LE(samples * 2, 40);
  speech.forEach((sample, i) => file.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + (lead + i) * 2));
  return file;
}

/** Drops the quiet 16 ms blocks at both ends, so the silence between two parts is PAUSE_S. */
function trim(speech, rate) {
  const block = Math.round(rate * 0.016);
  const loud = (at) => {
    const chunk = speech.subarray(at, at + block);
    return Math.sqrt(chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length) >= VOICE_RMS;
  };
  let start = 0;
  while (start < speech.length && !loud(start)) start += block;
  let end = speech.length;
  while (end - block > start && !loud(end - block)) end -= block;
  return speech.subarray(start, end);
}

/** One part of the line, spoken by the backend's TTS, at 16 kHz, peaking at PEAK. */
async function say(text) {
  const response = await fetch(`${API}/voice/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent: "concierge", language: "en", text }),
  });
  if (!response.ok) throw new Error(`POST ${API}/voice/speak failed (${response.status}): ${await response.text()}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const tts = new Float32Array(Math.floor(bytes.length / 4)).map((_, i) => bytes.readFloatLE(i * 4));
  const resampled = resample(tts, TTS_RATE, RATE);
  const peak = resampled.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
  if (peak === 0) throw new Error("/voice/speak returned silence");
  const speech = tighten(
    resampled.map((sample) => (sample * PEAK) / peak),
    RATE,
    MAX_PAUSE_S,
  );
  return PAUSED ? trim(speech, RATE) : speech;
}

const parts = [];
for (const text of PARTS) parts.push(await say(text));
const gap = Math.round(PAUSE_S * RATE);
const speech = new Float32Array(parts.reduce((total, part) => total + part.length, 0) + gap * (parts.length - 1));
parts.reduce((offset, part) => (speech.set(part, offset), offset + part.length + gap), 0);

mkdirSync(dirname(OUT), { recursive: true });
const file = wav(speech, RATE, SILENCE_BEFORE_S, SILENCE_AFTER_S);
writeFileSync(OUT, file);
console.log(
  `wrote ${OUT}: ${(speech.length / RATE).toFixed(1)} s of speech, ` +
    `${((file.length - 44) / 2 / RATE).toFixed(1)} s in all, ${Math.round(file.length / 1024)} KB`,
);
