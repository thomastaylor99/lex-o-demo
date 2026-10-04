/**
 * Microphone capture as 16 kHz mono int16 frames, the format realtime speech-to-text expects.
 * Same approach as the Decathlon reference: an AudioContext running at 16 kHz resamples the mic,
 * and a ScriptProcessor hands over fixed-size frames.
 */

const SAMPLE_RATE = 16_000;
/** 1024 samples = 64 ms per frame: fine enough for end-of-speech detection. */
const FRAME_SAMPLES = 1024;

export type FrameHandler = (pcm: Int16Array, rms: number) => void;

export class Mic {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  constructor(private readonly onFrame: FrameHandler) {}

  async open(): Promise<void> {
    if (this.context) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
    if (this.context.state === "suspended") await this.context.resume();
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(FRAME_SAMPLES, 1, 1);
    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      let energy = 0;
      for (let i = 0; i < input.length; i++) {
        const sample = Math.max(-1, Math.min(1, input[i]));
        energy += sample * sample;
        pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      this.onFrame(pcm, Math.sqrt(energy / input.length));
    };
    this.source.connect(this.processor);
    // A ScriptProcessor only runs when connected to the destination; it outputs silence.
    this.processor.connect(this.context.destination);
  }

  close(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.context = null;
  }
}

export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
