"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to `endsAt`, ticking each second. Renders nothing meaningful
 * until mounted (avoids SSR/client hydration mismatch on the time), shows
 * "Ended" once elapsed, and calls `onEnd` once when it reaches zero.
 */
export default function Countdown({
  endsAt,
  onEnd,
  className = "",
}: {
  endsAt: string;
  onEnd?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = Date.parse(endsAt);
    let ended = false;
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      setRemaining(left);
      if (left <= 0 && !ended) {
        ended = true;
        onEnd?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, onEnd]);

  if (remaining === null) {
    // Pre-mount placeholder keeps layout stable without leaking a server time.
    return <span className={className} aria-hidden="true" />;
  }
  if (remaining <= 0) {
    return <span className={`text-sm font-semibold text-white/50 ${className}`}>Ended</span>;
  }

  const totalSec = Math.floor(remaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const segments: { value: number; label: string }[] = [];
  if (days > 0) segments.push({ value: days, label: "d" });
  segments.push({ value: hours, label: "h" });
  segments.push({ value: minutes, label: "m" });
  segments.push({ value: seconds, label: "s" });

  return (
    <div
      className={`flex items-center gap-1.5 ${className}`}
      role="timer"
      aria-label={`Ends in ${days ? `${days}d ` : ""}${hours}h ${minutes}m ${seconds}s`}
    >
      {segments.map((seg, i) => (
        <div key={seg.label} className="flex items-center gap-1.5">
          <span className="inline-flex min-w-[2.25rem] flex-col items-center rounded-lg bg-white/10 px-2 py-1">
            <span className="font-mono text-base font-bold tabular-nums text-white">
              {String(seg.value).padStart(2, "0")}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-white/40">{seg.label}</span>
          </span>
          {i < segments.length - 1 && <span className="font-bold text-white/30">:</span>}
        </div>
      ))}
    </div>
  );
}
