type PaperTextureProps = {
  showGrid?: boolean
}

export function PaperTexture({ showGrid = true }: PaperTextureProps) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-90 bg-[radial-gradient(circle_at_20%_25%,rgba(0,0,0,0.05),transparent_22%),radial-gradient(circle_at_72%_34%,rgba(0,0,0,0.04),transparent_20%),radial-gradient(circle_at_60%_72%,rgba(0,0,0,0.035),transparent_18%),linear-gradient(180deg,rgba(0,0,0,0.025),transparent_18%,transparent_82%,rgba(0,0,0,0.035))]" />
      {showGrid ? (
        <div className="pointer-events-none absolute inset-0 opacity-45 mix-blend-multiply bg-[linear-gradient(rgba(23,20,18,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(23,20,18,0.04)_1px,transparent_1px)] [background-size:72px_72px]" />
      ) : null}
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] bg-[repeating-linear-gradient(112deg,rgba(0,0,0,0.025),rgba(0,0,0,0.025)_2px,transparent_2px,transparent_18px)]" />
    </>
  )
}
