import { useEffect, useRef, useState } from "react";

import type {
  CardOfferOption,
  CardOfferPayload,
  ClientChooseCardPayload,
} from "../../game/protocol";
import { bodyFontClass, displayFontClass } from "../../styles/styles";

type CardDraftOverlayProps = {
  offer: CardOfferPayload;
  onChoose(payload: ClientChooseCardPayload): void;
};

const POLARITY_STYLES = {
  boon: {
    edgeClassName: "border-[#dcc56f]/34",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(232,225,157,0.24)_0%,_rgba(232,225,157,0.08)_52%,_transparent_78%)]",
    label: "恩赐",
    panelClassName:
      "bg-[linear-gradient(165deg,rgba(31,27,16,0.98),rgba(18,17,13,0.96),rgba(9,9,7,0.99))]",
    pillClassName: "border-[#f0dd8d]/34 bg-[#2d2816]/88 text-[#fff0b4]",
    shineClassName:
      "from-transparent via-[rgba(255,240,180,0.12)] to-transparent",
  },
  chaos: {
    edgeClassName: "border-[#ff866c]/34",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(255,105,84,0.24)_0%,_rgba(255,105,84,0.08)_52%,_transparent_78%)]",
    label: "混沌",
    panelClassName:
      "bg-[linear-gradient(165deg,rgba(36,18,14,0.98),rgba(26,16,14,0.96),rgba(11,8,8,0.99))]",
    pillClassName: "border-[#ff8f72]/34 bg-[#2e1915]/88 text-[#ffd0be]",
    shineClassName:
      "from-transparent via-[rgba(255,163,136,0.12)] to-transparent",
  },
  hex: {
    edgeClassName: "border-[#72d2ff]/34",
    glowClassName:
      "bg-[radial-gradient(circle,_rgba(127,212,255,0.22)_0%,_rgba(127,212,255,0.08)_52%,_transparent_78%)]",
    label: "诅印",
    panelClassName:
      "bg-[linear-gradient(165deg,rgba(14,23,31,0.98),rgba(12,18,25,0.96),rgba(7,10,14,0.99))]",
    pillClassName: "border-[#8fdcff]/34 bg-[#10202b]/88 text-[#c8f2ff]",
    shineClassName:
      "from-transparent via-[rgba(156,230,255,0.12)] to-transparent",
  },
} as const;

function DraftCard({
  disabled,
  onChoose,
  option,
  selected,
}: {
  disabled: boolean;
  onChoose(): void;
  option: CardOfferOption;
  selected: boolean;
}) {
  const style = POLARITY_STYLES[option.polarity];

  return (
    <button
      className={[
        "group relative min-h-[25rem] overflow-hidden rounded-[1.9rem] border text-left transition duration-300",
        style.edgeClassName,
        style.panelClassName,
        selected
          ? "scale-[1.01] shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
          : "shadow-[0_22px_70px_rgba(0,0,0,0.28)]",
        disabled
          ? selected
            ? "cursor-wait"
            : "cursor-not-allowed opacity-45 saturate-[0.8]"
          : "hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.4)]",
      ].join(" ")}
      disabled={disabled}
      onClick={onChoose}
      type="button"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%)]" />
      <div
        className={[
          "absolute inset-x-[-10%] top-8 h-16 -rotate-12 bg-gradient-to-r opacity-75 blur-xl",
          style.shineClassName,
        ].join(" ")}
      />
      <div
        className={[
          "absolute left-1/2 top-[-2rem] h-28 w-28 -translate-x-1/2 rounded-full blur-3xl transition duration-300",
          style.glowClassName,
          selected ? "opacity-100" : "opacity-70 group-hover:opacity-95",
        ].join(" ")}
      />
      <div className="relative flex h-full flex-col px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p
              className={[
                bodyFontClass,
                "text-[0.64rem] uppercase tracking-[0.42em] text-white/42",
              ].join(" ")}
            >
              Kill Draft
            </p>
            <h3
              className={[
                displayFontClass,
                "mt-3 text-[2rem] leading-none text-white",
              ].join(" ")}
            >
              {option.label}
            </h3>
          </div>
          <span
            className={[
              bodyFontClass,
              "rounded-full border px-3 py-1 text-[0.62rem] uppercase tracking-[0.34em]",
              style.pillClassName,
            ].join(" ")}
          >
            {style.label}
          </span>
        </div>

        <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3">
          <p
            className={[
              bodyFontClass,
              "text-[0.62rem] uppercase tracking-[0.36em] text-white/38",
            ].join(" ")}
          >
            增益
          </p>
          <p
            className={[
              bodyFontClass,
              "mt-3 text-[0.97rem] leading-7 text-white/86",
            ].join(" ")}
          >
            {option.summary}
          </p>
        </div>

        <div className="mt-6 flex-1">
          <p
            className={[
              bodyFontClass,
              "text-[0.62rem] uppercase tracking-[0.34em] text-white/34",
            ].join(" ")}
          >
            Card Text
          </p>
          <p
            className={[
              bodyFontClass,
              "mt-3 text-sm leading-6 text-white/62",
            ].join(" ")}
          >
            {option.description}
          </p>
        </div>

        <span
          className={[
            bodyFontClass,
            "mt-6 inline-flex w-fit rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.62rem] uppercase tracking-[0.34em] text-white/58",
          ].join(" ")}
        >
          {selected ? "正在应用" : "点击后立即生效"}
        </span>
      </div>
    </button>
  );
}

export function CardDraftOverlay({
  offer,
  onChoose,
}: CardDraftOverlayProps) {
  const [submittingCardId, setSubmittingCardId] = useState<string | null>(null);
  const selectionLockedRef = useRef(false);

  useEffect(() => {
    setSubmittingCardId(null);
    selectionLockedRef.current = false;
  }, [offer.offerId]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-[rgba(4,4,8,0.52)] px-4 py-6 backdrop-blur-[8px]">
      <div className="text-center">
        <p
          className={[
            bodyFontClass,
            "text-[0.68rem] uppercase tracking-[0.42em] text-white/38",
          ].join(" ")}
        >
          Kill Draft
        </p>
        <h2
          className={[
            displayFontClass,
            "mt-3 text-[2.4rem] leading-none text-white md:text-[3.2rem]",
          ].join(" ")}
        >
          直接选一张卡
        </h2>
        <p
          className={[
            bodyFontClass,
            "mt-3 text-sm leading-7 text-white/64 md:text-[0.98rem]",
          ].join(" ")}
        >
          点击后立即生效。若已满 3 张，会自动替换最旧的一张。
        </p>
      </div>

      <div className="grid w-full max-w-[78rem] gap-4 lg:grid-cols-3">
        {offer.options.map((option) => (
          <DraftCard
            disabled={Boolean(submittingCardId)}
            key={`${offer.offerId}-${option.cardId}`}
            onChoose={() => {
              if (selectionLockedRef.current) {
                return;
              }

              selectionLockedRef.current = true;
              setSubmittingCardId(option.cardId);
              onChoose({
                cardId: option.cardId,
                offerId: offer.offerId,
              });
            }}
            option={option}
            selected={option.cardId === submittingCardId}
          />
        ))}
      </div>
    </div>
  );
}
