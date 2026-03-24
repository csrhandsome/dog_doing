import type { ButtonHTMLAttributes, ReactNode } from "react";

import { bodyFontClass } from "../../styles/styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function Button({
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        bodyFontClass,
        "pointer-events-auto rounded-full border border-[#171412] bg-[#171412] px-5 py-3 text-[0.72rem] uppercase tracking-[0.28em] text-[#f7f4ec] transition hover:-translate-y-0.5 hover:bg-[#171412]/92 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
