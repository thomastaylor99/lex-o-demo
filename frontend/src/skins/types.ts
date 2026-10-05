import type { VoiceAgent } from "@/lib/voice-agent";

/** What a skin receives: the live or scripted agent, plus the screen controls the voice engine does not own. */
export interface ScreenAgent extends VoiceAgent {
  /** Ends the session; the welcome screen shows and the next visitor taps Begin. */
  restart: () => void;
  /** The V2 camera panel is open. */
  camera: boolean;
  /** The camera switch is shown (the page was opened with `?camera=1`). */
  cameraSwitch: boolean;
  toggleCamera: () => void;
}

/** Every skin component takes the agent and nothing else, so skins stay swappable. */
export interface SkinProps {
  agent: ScreenAgent;
}
