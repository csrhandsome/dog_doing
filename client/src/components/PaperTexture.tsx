type PaperTextureProps = {
  showGrid?: boolean
}

export function PaperTexture({ showGrid = true }: PaperTextureProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[#05070b]" />
      <div className="pointer-events-none absolute inset-0 opacity-95 bg-[radial-gradient(circle_at_50%_10%,rgba(255,191,104,0.18),transparent_0_18%),radial-gradient(circle_at_15%_6%,rgba(108,186,255,0.14),transparent_0_22%),radial-gradient(circle_at_85%_8%,rgba(255,103,71,0.12),transparent_0_18%),linear-gradient(180deg,#080b11_0%,#0d141d_36%,#15100f_72%,#06070a_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28vh] opacity-70 bg-[repeating-linear-gradient(90deg,rgba(7,9,14,0.94)_0,rgba(7,9,14,0.94)_92px,transparent_92px,transparent_220px),linear-gradient(180deg,rgba(3,4,8,0.96),rgba(3,4,8,0.42)_58%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] opacity-90 bg-[radial-gradient(ellipse_at_center,rgba(255,145,83,0.12),transparent_0_54%),linear-gradient(180deg,transparent,rgba(0,0,0,0.82))]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_14%,transparent_78%,rgba(0,0,0,0.38)),repeating-linear-gradient(90deg,transparent_0,transparent_calc(12vw-1px),rgba(255,255,255,0.03)_calc(12vw-1px),rgba(255,255,255,0.03)_12vw)]" />
      {showGrid ? (
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-screen bg-[linear-gradient(rgba(140,168,196,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(140,168,196,0.08)_1px,transparent_1px),repeating-linear-gradient(135deg,rgba(255,255,255,0.02),rgba(255,255,255,0.02)_2px,transparent_2px,transparent_22px)] [background-size:180px_180px,180px_180px,auto]" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.04),rgba(255,255,255,0.04)_1px,transparent_1px,transparent_4px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.58)_100%)]" />
    </>
  )
}
