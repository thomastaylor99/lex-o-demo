import type { ReactNode } from "react";

function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function ReplayIcon({ size = 18 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Icon>
  );
}

export function MicIcon({ size = 26 }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.5V21" />
    </Icon>
  );
}

export function LockIcon({ size = 18 }: { size?: number }) {
  return (
    <Icon size={size}>
      <rect x="5" y="11" width="14" height="10" rx="3" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

/** The step separator in the agent relay. */
export function ChevronIcon({ size = 14 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

/** The concierge welcomes: a sparkle. */
export function SparkleIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5c.6 4.6 2.6 6.9 7.5 9.5-4.9 2.6-6.9 4.9-7.5 9.5-.6-4.6-2.6-6.9-7.5-9.5 4.9-2.6 6.9-4.9 7.5-9.5z" fill="currentColor" />
    </svg>
  );
}

/** The skincare expert: a drop. */
export function DropIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.8c3.9 4.7 6.6 8.3 6.6 11.7a6.6 6.6 0 0 1-13.2 0c0-3.4 2.7-7 6.6-11.7z" fill="currentColor" />
    </svg>
  );
}

/** Opens in a new tab: a square with an arrow leaving it. */
export function ExternalIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Icon>
  );
}

/** More about a product: a plus. */
export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

/** Closes a sheet: a cross. */
export function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Icon>
  );
}
