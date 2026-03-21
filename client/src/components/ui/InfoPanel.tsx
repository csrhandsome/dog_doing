import type { ReactNode } from "react";

import { bodyFontClass, paperShadowClass } from "../../styles/styles";

type InfoPanelProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  label?: ReactNode;
  labelClassName?: string;
};

export function InfoPanel({
  children,
  className,
  contentClassName,
  label,
  labelClassName,
}: InfoPanelProps) {
  return (
    <div
      className={[
        paperShadowClass,
        "rounded-[1.5rem] border border-[#171412]/15 bg-[#f7f4ec]/90 px-4 py-3 backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? (
        <p
          className={[
            bodyFontClass,
            "text-[0.68rem] uppercase tracking-[0.3em] text-[#171412]/50",
            labelClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {label}
        </p>
      ) : null}
      <div className={label ? contentClassName ?? "mt-3" : contentClassName}>
        {children}
      </div>
    </div>
  );
}
