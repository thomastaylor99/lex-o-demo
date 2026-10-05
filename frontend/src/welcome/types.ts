import type { Language } from "@/lib/events";

/** What every welcome mockup receives. The live screen will pass the same from its ScreenAgent. */
export interface WelcomeProps {
  language: Language;
  /** Begin was pressed and the session is connecting: say so on the button and keep the screen alive. */
  starting: boolean;
  /** Why the last start failed, already in plain words, or null. Show it with a "Try again" button. */
  failure: string | null;
  onBegin: () => void;
}
