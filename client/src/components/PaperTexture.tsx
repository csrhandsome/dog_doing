type PaperTextureProps = {
  showGrid?: boolean
}

export function PaperTexture({ showGrid = true }: PaperTextureProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[#b8d9f5]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.72),transparent_0_16%),radial-gradient(circle_at_44%_10%,rgba(255,255,255,0.56),transparent_0_14%),radial-gradient(circle_at_76%_14%,rgba(255,255,255,0.66),transparent_0_18%),linear-gradient(180deg,#a8d4ff_0%,#d9edff_34%,#f3f8ee_58%,#d7e7ad_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] opacity-90 bg-[radial-gradient(circle_at_12%_100%,rgba(73,122,61,0.6),transparent_0_32%),radial-gradient(circle_at_32%_100%,rgba(86,136,70,0.5),transparent_0_28%),radial-gradient(circle_at_56%_100%,rgba(64,108,50,0.52),transparent_0_30%),radial-gradient(circle_at_78%_100%,rgba(84,124,61,0.48),transparent_0_28%),radial-gradient(circle_at_96%_100%,rgba(66,105,54,0.5),transparent_0_30%),linear-gradient(180deg,transparent,rgba(122,159,88,0.18)_40%,rgba(64,87,43,0.34))]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 mix-blend-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent_18%,transparent_76%,rgba(255,243,199,0.18)),repeating-linear-gradient(90deg,transparent_0,transparent_calc(14vw-1px),rgba(255,255,255,0.05)_calc(14vw-1px),rgba(255,255,255,0.05)_14vw)]" />
      {showGrid ? (
        <div className="pointer-events-none absolute inset-0 opacity-14 mix-blend-multiply bg-[linear-gradient(rgba(87,121,88,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(87,121,88,0.1)_1px,transparent_1px),repeating-linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.04)_2px,transparent_2px,transparent_24px)] [background-size:180px_180px,180px_180px,auto]" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(0deg,rgba(32,56,24,0.18),rgba(32,56,24,0.18)_1px,transparent_1px,transparent_5px)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(32,48,23,0.22)_100%)]" />
    </>
  )
}
