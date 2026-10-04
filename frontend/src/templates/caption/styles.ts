/** Caption: broadcast subtitles. Black on white, giant live captions, one yellow live dot. */

export const BLACK = "#000";
export const GREY = "#6E6E6E";
export const HISTORY = "#A3A3A3";
export const WELL = "#F2F2F2";
export const RULE = "#DADADA";
export const YELLOW = "#FFD400";

export const DISPLAY = "var(--font-caption-display), 'Arial Narrow', sans-serif";
export const MONO = "var(--font-caption-mono), ui-monospace, monospace";
/** Semi-condensed cut of Archivo's width axis. */
export const NARROW = "'wdth' 85";

export const CAPTION_CSS = `
@keyframes cp-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cp-wipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes cp-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes cp-live { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.cp-rise { animation: cp-rise 420ms cubic-bezier(0.2, 0.7, 0.1, 1) both; }
.cp-fade { animation: cp-fade 360ms ease-out both; }
.cp-wipe { animation: cp-wipe 520ms cubic-bezier(0.7, 0, 0.2, 1) both; }
.cp-caret::after { content: ""; display: inline-block; width: 0.08em; height: 0.85em; margin-left: 0.08em; vertical-align: -0.08em; background: currentColor; animation: cp-caret 1s steps(1) infinite; }
.cp-scroll { scrollbar-width: none; }
.cp-scroll::-webkit-scrollbar { display: none; }
@media (prefers-reduced-motion: reduce) { .cp-rise, .cp-fade, .cp-wipe { animation: none; } }
`;
