import { useState, useEffect, useMemo } from 'react';
import './Countdown.css';

const DEFAULT_TARGET_ISO = '2026-10-29T00:00:00+05:30';

function calculateTimeRemaining(targetTimestamp) {
  const remaining = Math.max(0, targetTimestamp - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    remaining,
    isLive: remaining <= 0,
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

function DigitUnit({ value, label }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center py-2 sm:py-3 px-1 sm:px-2 rounded hud-unit-card">
      <div className="hud-digit-slot">
        <span key={value} className="hud-digit-value font-heading font-bold text-slate-100 tabular-nums text-lg min-[360px]:text-xl sm:text-3xl md:text-4xl">
          {value}
        </span>
      </div>
      <span className="font-mono font-medium text-[8px] min-[360px]:text-[9px] sm:text-xs text-cyan-400/80 tracking-wider sm:tracking-widest uppercase mt-1 select-none">
        {label}
      </span>
    </div>
  );
}

export default function Countdown({
  targetDate = DEFAULT_TARGET_ISO,
  eventTitle = 'SAMYAK 2026',
  dateLabel = '29 OCTOBER 2026',
  startsInLabel = 'STARTS IN',
  className = '',
}) {
  const targetTimestamp = useMemo(() => {
    return new Date(targetDate).getTime();
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(targetTimestamp));

  useEffect(() => {
    if (timeLeft.isLive) return;

    const intervalId = setInterval(() => {
      const next = calculateTimeRemaining(targetTimestamp);
      setTimeLeft(next);
      if (next.isLive) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetTimestamp, timeLeft.isLive]);

  return (
    <section
      className={`w-full relative z-20 py-8 sm:py-12 px-2.5 min-[360px]:px-4 ${className}`}
      aria-label={`${eventTitle} Countdown`}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-md p-3 min-[360px]:p-4 sm:p-6 hud-panel"
        aria-live="polite"
        aria-atomic="true"
      >
        {timeLeft.isLive ? (
          <div className="py-2 sm:py-4 text-center">
            <div className="text-[11px] min-[360px]:text-xs sm:text-sm font-mono tracking-[0.25em] text-slate-300 uppercase select-none">
              {eventTitle}
            </div>
            <div className="text-2xl min-[360px]:text-3xl sm:text-4xl md:text-5xl font-heading font-black tracking-widest text-cyan-400 uppercase mt-1 sm:mt-2 select-none">
              IS LIVE
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {/* HUD Header */}
            <div className="text-[11px] min-[360px]:text-xs sm:text-sm font-mono font-medium tracking-[0.25em] text-slate-200 uppercase select-none text-center">
              {dateLabel}
            </div>
            <div className="text-[9px] min-[360px]:text-[10px] sm:text-xs font-mono tracking-[0.3em] text-cyan-400 uppercase select-none text-center mt-0.5 sm:mt-1 mb-3 sm:mb-5">
              {startsInLabel}
            </div>

            {/* Accessible screen reader announcement */}
            <span className="sr-only">
              {timeLeft.days} days, {timeLeft.hours} hours, {timeLeft.minutes} minutes, {timeLeft.seconds} seconds remaining until {eventTitle}
            </span>

            {/* HUD Numbers Row — Desktop and Mobile always 4 units in one row */}
            <div className="flex items-center justify-between gap-1 min-[360px]:gap-1.5 sm:gap-2.5 w-full">
              <DigitUnit value={timeLeft.days} label="DAYS" />

              <span className="text-cyan-400/40 text-xs min-[360px]:text-sm sm:text-lg font-mono font-light select-none pb-3 sm:pb-4">
                :
              </span>

              <DigitUnit value={timeLeft.hours} label="HOURS" />

              <span className="text-cyan-400/40 text-xs min-[360px]:text-sm sm:text-lg font-mono font-light select-none pb-3 sm:pb-4">
                :
              </span>

              <DigitUnit value={timeLeft.minutes} label="MINUTES" />

              <span className="text-cyan-400/40 text-xs min-[360px]:text-sm sm:text-lg font-mono font-light select-none pb-3 sm:pb-4">
                :
              </span>

              <DigitUnit value={timeLeft.seconds} label="SECONDS" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
