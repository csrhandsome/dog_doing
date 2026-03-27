import { useEffect, useRef, useState } from "react";

import type { AnnouncementPayload } from "../../game/protocol";
import { bodyFontClass, displayFontClass } from "../../styles/styles";

type KillFeedbackBannerProps = {
  announcement?: AnnouncementPayload | null;
};

type BannerPhase = "enter" | "show" | "exit";

const DISPLAY_MS = 2400;
const EXIT_MS = 320;

const TONE_STYLES = {
  cobalt: {
    badgeClassName:
      "border-[#8ad5ff]/40 bg-[#071824]/80 text-[#c8f1ff] shadow-[0_0_26px_rgba(86,196,255,0.22)]",
    frameClassName: "border-[#5bc7ff]/28",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(91,199,255,0.34)_0%,_rgba(91,199,255,0.08)_45%,_transparent_78%)]",
    lineClassName: "from-[#7be2ff]/0 via-[#7be2ff]/65 to-[#7be2ff]/0",
    shellClassName:
      "bg-[linear-gradient(135deg,rgba(7,16,28,0.95),rgba(10,27,40,0.86),rgba(4,14,23,0.95))]",
    titleClassName: "text-[#eef9ff]",
  },
  crimson: {
    badgeClassName:
      "border-[#ff8a8f]/40 bg-[#29080d]/80 text-[#ffd4d5] shadow-[0_0_26px_rgba(255,74,96,0.28)]",
    frameClassName: "border-[#ff6c7e]/32",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(255,91,115,0.4)_0%,_rgba(255,91,115,0.12)_48%,_transparent_82%)]",
    lineClassName: "from-[#ff8c9a]/0 via-[#ff8c9a]/70 to-[#ff8c9a]/0",
    shellClassName:
      "bg-[linear-gradient(135deg,rgba(34,6,12,0.96),rgba(56,11,20,0.86),rgba(25,5,9,0.96))]",
    titleClassName: "text-[#fff1f1]",
  },
  gold: {
    badgeClassName:
      "border-[#f8d173]/44 bg-[#281b04]/82 text-[#fff1c1] shadow-[0_0_30px_rgba(255,204,90,0.3)]",
    frameClassName: "border-[#f1bf55]/34",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(255,205,92,0.42)_0%,_rgba(255,205,92,0.14)_48%,_transparent_82%)]",
    lineClassName: "from-[#ffd983]/0 via-[#ffd983]/75 to-[#ffd983]/0",
    shellClassName:
      "bg-[linear-gradient(135deg,rgba(32,24,8,0.97),rgba(64,45,10,0.88),rgba(29,20,6,0.96))]",
    titleClassName: "text-[#fff8e1]",
  },
} as const;

export function KillFeedbackBanner({
  announcement,
}: KillFeedbackBannerProps) {
  const [queue, setQueue] = useState<AnnouncementPayload[]>([]);
  const [active, setActive] = useState<AnnouncementPayload | null>(null);
  const [phase, setPhase] = useState<BannerPhase>("enter");
  const seenIdsRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!announcement || seenIdsRef.current.has(announcement.id)) {
      return;
    }

    seenIdsRef.current.add(announcement.id);
    setQueue((currentQueue) => [...currentQueue, announcement]);
  }, [announcement]);

  useEffect(() => {
    if (active || queue.length === 0) {
      return;
    }

    const [nextAnnouncement, ...restQueue] = queue;
    setQueue(restQueue);
    setActive(nextAnnouncement);
    setPhase("enter");

    timersRef.current.push(
      window.setTimeout(() => {
        setPhase("show");
      }, 20),
    );
    timersRef.current.push(
      window.setTimeout(() => {
        setPhase("exit");
      }, DISPLAY_MS),
    );
    timersRef.current.push(
      window.setTimeout(() => {
        setActive(null);
      }, DISPLAY_MS + EXIT_MS),
    );

    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }

      timersRef.current = [];
    };
  }, [active, queue]);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current) {
        window.clearTimeout(timer);
      }

      timersRef.current = [];
    };
  }, []);

  if (!active) {
    return null;
  }

  const tone = TONE_STYLES[active.tone];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4 md:top-5">
      <div
        className={[
          "relative w-full max-w-[34rem] transition duration-300 ease-out",
          phase === "enter"
            ? "translate-y-[-18px] scale-[0.96] opacity-0"
            : "",
          phase === "show" ? "translate-y-0 scale-100 opacity-100" : "",
          phase === "exit"
            ? "translate-y-[-10px] scale-[0.98] opacity-0"
            : "",
        ].join(" ")}
      >
        <div className="absolute inset-0 rounded-[1.9rem] bg-black/22 blur-2xl" />
        <div
          className={[
            "absolute left-1/2 top-1/2 h-36 w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 blur-3xl",
            tone.glowClassName,
          ].join(" ")}
        />
        <div
          className={[
            "relative overflow-hidden rounded-[1.9rem] border px-5 py-4 backdrop-blur-xl md:px-6",
            tone.frameClassName,
            tone.shellClassName,
            "shadow-[0_26px_90px_rgba(4,8,18,0.42)]",
          ].join(" ")}
        >
          <div className="absolute inset-0 opacity-60">
            <div className="absolute inset-x-6 top-0 h-px bg-white/28" />
            <div
              className={[
                "absolute inset-x-10 top-[30%] h-px bg-gradient-to-r",
                tone.lineClassName,
              ].join(" ")}
            />
            <div
              className={[
                "absolute inset-x-12 bottom-[26%] h-px bg-gradient-to-r",
                tone.lineClassName,
              ].join(" ")}
            />
            <div className="absolute -right-10 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border border-white/10 animate-[spin_14s_linear_infinite]" />
          </div>

          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p
                className={[
                  bodyFontClass,
                  "text-[0.62rem] uppercase tracking-[0.42em] text-white/54",
                ].join(" ")}
              >
                击杀反馈
              </p>
              <h2
                className={[
                  displayFontClass,
                  "mt-2 text-[2rem] leading-none md:text-[2.6rem]",
                  tone.titleClassName,
                ].join(" ")}
              >
                {active.title}
              </h2>
              <p
                className={[
                  bodyFontClass,
                  "mt-2 max-w-[24rem] text-sm leading-6 text-white/72 md:text-[0.96rem]",
                ].join(" ")}
              >
                {active.subtitle}
              </p>
            </div>

            <div
              className={[
                "shrink-0 rounded-[1.1rem] border px-4 py-3 text-center",
                tone.badgeClassName,
              ].join(" ")}
            >
              <p
                className={[
                  bodyFontClass,
                  "text-[0.62rem] uppercase tracking-[0.34em]",
                ].join(" ")}
              >
                Arena
              </p>
              <p
                className={[
                  displayFontClass,
                  "mt-1 whitespace-nowrap text-2xl leading-none",
                ].join(" ")}
              >
                {active.badge}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
