import { Application, extend } from '@pixi/react'
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { PaperTexture } from '../components/PaperTexture'
import { type ElementSize, useElementSize } from '../hook/useElementSize'
import { bodyFontClass, displayFontClass, paperShadowClass } from '../ui/styles'
import { HUD_KEYS, ROLE_COPY, ROLE_ORDER } from './config'
import type { Role, SnapshotPayload, SnapshotPlayer, WorldConfig } from './protocol'

extend({ Container, Graphics, Sprite, Text })

type GameCanvasProps = {
  onLeave?: () => void
  overlay?: ReactNode
  playerId?: string | null
  snapshot: SnapshotPayload
  stageBlurred?: boolean
  systemMessage?: string
  variant?: 'play' | 'preview'
  world: WorldConfig
}

type Wrinkle = {
  alpha: number
  points: Array<[number, number]>
  width: number
}

const RESOLUTION = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2)

const TEXT_STYLE = {
  fill: '#171412',
  fontFamily: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  fontSize: 17,
  fontWeight: '700' as const,
}

const LABEL_STYLE = {
  fill: '#171412',
  fontFamily: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  fontSize: 13,
  fontWeight: '700' as const,
}

const HUD_STYLE = {
  fill: '#171412',
  fontFamily: '"Avenir Next Condensed", "Arial Narrow", "Segoe UI", sans-serif',
  fontSize: 12,
  fontWeight: '700' as const,
}

const paperCache = new Map<
  string,
  {
    clouds: Array<{ alpha: number; radius: number; x: number; y: number }>
    wrinkles: Wrinkle[]
  }
>()

const playerTextureCache = new Map<Role, Texture>()
let playerTextureLoadPromise: Promise<void> | null = null

function createSeededRandom(seed: number) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296
    return value / 4294967296
  }
}

function getPaperDecor(world: WorldConfig) {
  const key = `${world.width}-${world.height}-${world.cellSize}`
  const cached = paperCache.get(key)

  if (cached) {
    return cached
  }

  const wrinkleRandom = createSeededRandom(73)
  const cloudRandom = createSeededRandom(11)
  const wrinkles: Wrinkle[] = []
  const clouds: Array<{ alpha: number; radius: number; x: number; y: number }> = []

  for (let index = 0; index < 80; index += 1) {
    const startX = wrinkleRandom() * world.width
    const startY = wrinkleRandom() * world.height
    const points: Array<[number, number]> = [[startX, startY]]
    const segments = 3 + Math.floor(wrinkleRandom() * 4)
    let currentX = startX
    let currentY = startY

    for (let segment = 0; segment < segments; segment += 1) {
      currentX = Math.max(0, Math.min(world.width, currentX + (wrinkleRandom() - 0.5) * 240))
      currentY = Math.max(0, Math.min(world.height, currentY + (wrinkleRandom() - 0.5) * 240))
      points.push([currentX, currentY])
    }

    wrinkles.push({
      alpha: 0.04 + wrinkleRandom() * 0.07,
      points,
      width: 1 + wrinkleRandom() * 2.4,
    })
  }

  for (let index = 0; index < 34; index += 1) {
    clouds.push({
      alpha: 0.02 + cloudRandom() * 0.04,
      radius: 60 + cloudRandom() * 150,
      x: cloudRandom() * world.width,
      y: cloudRandom() * world.height,
    })
  }

  const decor = { clouds, wrinkles }
  paperCache.set(key, decor)

  return decor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getFacing(player: SnapshotPlayer) {
  return {
    x: player.facing.x === 0 && player.facing.y === 0 ? 1 : player.facing.x,
    y: player.facing.x === 0 && player.facing.y === 0 ? 0 : player.facing.y,
  }
}

function getPlayerTexture(role: Role) {
  return playerTextureCache.get(role) ?? null
}

function loadPlayerTextures() {
  if (!playerTextureLoadPromise) {
    playerTextureLoadPromise = Promise.all(
      ROLE_ORDER.map(async (role) => {
        const texture = await Assets.load<Texture>(ROLE_COPY[role].artSrc)
        playerTextureCache.set(role, texture)
      }),
    ).then(() => undefined)
  }

  return playerTextureLoadPromise
}

function cameraOffset(player: SnapshotPlayer | undefined, viewport: ElementSize, world: WorldConfig) {
  if (!player) {
    return { x: 0, y: 0 }
  }

  const minX = Math.min(0, viewport.width - world.width)
  const minY = Math.min(0, viewport.height - world.height)

  return {
    x: clamp(viewport.width / 2 - player.x, minX, 0),
    y: clamp(viewport.height / 2 - player.y, minY, 0),
  }
}

function hexColor(value: number) {
  return `#${value.toString(16).padStart(6, '0')}`
}

function drawPaper(graphics: Graphics, world: WorldConfig) {
  const decor = getPaperDecor(world)

  graphics.clear()
  graphics.rect(0, 0, world.width, world.height).fill({ color: 0xf7f4ec })

  for (const cloud of decor.clouds) {
    graphics.circle(cloud.x, cloud.y, cloud.radius).fill({
      color: 0xdcd5c9,
      alpha: cloud.alpha,
    })
  }

  for (const wrinkle of decor.wrinkles) {
    for (let index = 1; index < wrinkle.points.length; index += 1) {
      const [startX, startY] = wrinkle.points[index - 1]
      const [endX, endY] = wrinkle.points[index]

      graphics.moveTo(startX, startY)
      graphics.lineTo(endX, endY)
      graphics.stroke({
        color: 0x8a8377,
        alpha: wrinkle.alpha,
        width: wrinkle.width,
      })
    }
  }
}

function drawGrid(graphics: Graphics, world: WorldConfig) {
  graphics.clear()

  for (let x = 0; x <= world.width; x += world.cellSize) {
    graphics.moveTo(x, 0)
    graphics.lineTo(x, world.height)
  }

  for (let y = 0; y <= world.height; y += world.cellSize) {
    graphics.moveTo(0, y)
    graphics.lineTo(world.width, y)
  }

  graphics.stroke({
    color: 0x171412,
    alpha: 0.1,
    width: 1,
  })

  const majorStep = world.cellSize * 4

  for (let x = 0; x <= world.width; x += majorStep) {
    graphics.moveTo(x, 0)
    graphics.lineTo(x, world.height)
  }

  for (let y = 0; y <= world.height; y += majorStep) {
    graphics.moveTo(0, y)
    graphics.lineTo(world.width, y)
  }

  graphics.stroke({
    color: 0x171412,
    alpha: 0.22,
    width: 1.4,
  })

  graphics.roundRect(0, 0, world.width, world.height, 24).stroke({
    color: 0x171412,
    alpha: 0.4,
    width: 4,
  })
}

function drawPlayerEffects(graphics: Graphics, player: SnapshotPlayer, isLocal: boolean) {
  const facing = getFacing(player)
  const facingX = facing.x
  const facingY = facing.y

  graphics.clear()

  graphics.ellipse(0, 24, 24, 9).fill({
    color: 0x171412,
    alpha: player.action === 'dead' ? 0.08 : 0.16,
  })

  if (isLocal) {
    // Keep the local-player cue on the floor so the sprite stays visually dominant.
    graphics.ellipse(0, 25, 33, 11).stroke({
      color: 0x171412,
      alpha: 0.18,
      width: 1.4,
    })
  }

  if (player.action === 'attack') {
    graphics.moveTo(facingX * 18 - facingY * 14, facingY * 18 + facingX * 14)
    graphics.lineTo(facingX * 32, facingY * 32)
    graphics.lineTo(facingX * 18 + facingY * 14, facingY * 18 - facingX * 14)
    graphics.stroke({
      color: 0xb62f18,
      width: 4,
      alpha: 0.9,
    })
  }

  if (player.action === 'block') {
    graphics.roundRect(facingX * 16 - 12, facingY * 16 - 12, 24, 24, 8).stroke({
      color: 0x171412,
      width: 4,
      alpha: 0.75,
    })
  }

  if (player.action === 'dead') {
    graphics.moveTo(-15, -15)
    graphics.lineTo(15, 15)
    graphics.moveTo(15, -15)
    graphics.lineTo(-15, 15)
    graphics.stroke({
      color: 0x171412,
      width: 4,
      alpha: 0.8,
    })
  }
}

function drawHealthBar(graphics: Graphics, player: SnapshotPlayer) {
  const ratio = Math.max(0, Math.min(1, player.hp / player.maxHp))
  const fillColor = player.role === 'warrior' ? 0xbd4f31 : 0x2e6fd8
  const fillWidth = ratio === 0 ? 0 : Math.max(8, 48 * ratio)

  graphics.clear()
  graphics.roundRect(-24, -42, 48, 8, 4).fill({
    color: 0xffffff,
    alpha: 0.78,
  })
  graphics.roundRect(-24, -42, 48, 8, 4).stroke({
    color: 0x171412,
    width: 2,
    alpha: 0.5,
  })

  if (fillWidth > 0) {
    graphics.roundRect(-24, -42, fillWidth, 8, 4).fill({
      color: fillColor,
      alpha: player.action === 'dead' ? 0.3 : 0.95,
    })
  }
}

function drawRespawnDial(graphics: Graphics, player: SnapshotPlayer, serverTime: number) {
  graphics.clear()

  if (player.respawnAt === null) {
    return
  }

  const remaining = Math.max(0, player.respawnAt - serverTime)
  const ratio = 1 - remaining / 2600
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + Math.PI * 2 * ratio

  graphics.arc(0, 0, 28, startAngle, endAngle)
  graphics.stroke({
    color: 0x171412,
    width: 3,
    alpha: 0.6,
  })
}

function PlayerSprite({
  isLocal,
  player,
  serverTime,
}: {
  isLocal: boolean
  player: SnapshotPlayer
  serverTime: number
}) {
  const statusText = player.respawnAt ? 'recovering' : player.action
  const facing = getFacing(player)
  const spriteScale = ROLE_COPY[player.role].spriteScale
  const spriteTexture = getPlayerTexture(player.role)
  const spriteTint = player.action === 'hurt' ? 0xffc3b4 : 0xffffff
  const spriteAlpha = player.action === 'dead' ? 0.42 : 1

  return (
    <pixiContainer x={player.x} y={player.y}>
      <pixiGraphics draw={(graphics) => drawRespawnDial(graphics, player, serverTime)} />
      <pixiGraphics draw={(graphics) => drawPlayerEffects(graphics, player, isLocal)} />
      {spriteTexture ? (
        <pixiSprite
          alpha={spriteAlpha}
          anchor={{ x: 0.5, y: 0.82 }}
          scale={{ x: facing.x > 0 ? -spriteScale : spriteScale, y: spriteScale }}
          texture={spriteTexture}
          tint={spriteTint}
          y={8}
        />
      ) : null}
      <pixiGraphics draw={(graphics) => drawHealthBar(graphics, player)} />
      <pixiText
        anchor={0.5}
        style={LABEL_STYLE}
        text={player.name}
        y={-56}
      />
      <pixiText
        anchor={0.5}
        style={HUD_STYLE}
        text={statusText}
        y={26}
      />
    </pixiContainer>
  )
}

export function GameCanvas({
  onLeave,
  overlay,
  playerId,
  snapshot,
  stageBlurred = false,
  systemMessage,
  variant = 'play',
  world,
}: GameCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [texturesReady, setTexturesReady] = useState(() => playerTextureCache.size === ROLE_ORDER.length)
  const viewport = useElementSize(shellRef)
  const localPlayer = snapshot.players.find((player) => player.id === playerId)
  const focusPlayer = localPlayer ?? snapshot.players[0]
  const offset = cameraOffset(focusPlayer, viewport, world)
  const roleAccent = localPlayer ? ROLE_COPY[localPlayer.role] : null
  const showHud = variant === 'play'

  useEffect(() => {
    if (texturesReady) {
      return
    }

    let cancelled = false

    void loadPlayerTextures().then(() => {
      if (!cancelled) {
        setTexturesReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [texturesReady])

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#f7f4ec] text-[#171412]">
      <PaperTexture showGrid={false} />
      <div ref={shellRef} className="relative h-screen overflow-hidden">
        <div className={stageBlurred ? 'h-full w-full scale-[1.02] blur-[10px]' : 'h-full w-full'}>
          <Application
            antialias
            backgroundAlpha={0}
            defaultTextStyle={TEXT_STYLE}
            resizeTo={shellRef}
            resolution={RESOLUTION}
          >
            <pixiContainer x={offset.x} y={offset.y}>
              <pixiGraphics draw={(graphics) => drawPaper(graphics, world)} />
              <pixiGraphics draw={(graphics) => drawGrid(graphics, world)} />
              {snapshot.players.map((player) => (
                <PlayerSprite
                  isLocal={player.id === playerId}
                  key={player.id}
                  player={player}
                  serverTime={snapshot.serverTime}
                />
              ))}
            </pixiContainer>
          </Application>

          {showHud ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 p-4 md:p-6">
                <div
                  className={[
                    paperShadowClass,
                    'max-w-sm rounded-[1.75rem] border border-[#171412]/15 bg-[#f7f4ec]/92 px-5 py-4 backdrop-blur',
                  ].join(' ')}
                >
                  <p className={[bodyFontClass, 'text-[0.72rem] uppercase tracking-[0.34em] text-[#171412]/55'].join(' ')}>
                    live brawl
                  </p>
                  <div className="mt-2 flex items-end gap-3">
                    <h1 className={[displayFontClass, 'text-3xl leading-none md:text-5xl'].join(' ')}>
                      Dog Doing
                    </h1>
                    <span
                      className={[
                        bodyFontClass,
                        'mb-1 rounded-full border border-[#171412]/20 px-3 py-1 text-[0.72rem] uppercase tracking-[0.26em] text-[#171412]/60',
                      ].join(' ')}
                    >
                      {roleAccent?.tag ?? 'paper arena'}
                    </span>
                  </div>
                  <p className={[bodyFontClass, 'mt-3 max-w-xs text-sm leading-6 text-[#171412]/75'].join(' ')}>
                    White paper, black grid, server-authoritative melee. The client only sends intent.
                  </p>
                </div>

                <div className="grid gap-3 sm:min-w-[18rem]">
                  <div
                    className={[
                      paperShadowClass,
                      'rounded-[1.5rem] border border-[#171412]/15 bg-[#f7f4ec]/90 px-4 py-3 backdrop-blur',
                    ].join(' ')}
                  >
                    <p className={[bodyFontClass, 'text-[0.68rem] uppercase tracking-[0.3em] text-[#171412]/50'].join(' ')}>
                      connection
                    </p>
                    <p className={[displayFontClass, 'mt-2 text-2xl leading-none'].join(' ')}>
                      {systemMessage ?? 'arena synced'}
                    </p>
                    {localPlayer ? (
                      <div className={[bodyFontClass, 'mt-3 flex items-center gap-2 text-sm text-[#171412]/72'].join(' ')}>
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-[#171412]/40"
                          style={{ backgroundColor: hexColor(localPlayer.color) }}
                        />
                        <span>{localPlayer.name}</span>
                        <span className="text-[#171412]/40">/</span>
                        <span>{localPlayer.hp} hp</span>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={[
                      paperShadowClass,
                      'rounded-[1.5rem] border border-[#171412]/15 bg-[#f7f4ec]/90 px-4 py-3 backdrop-blur',
                    ].join(' ')}
                  >
                    <p className={[bodyFontClass, 'text-[0.68rem] uppercase tracking-[0.3em] text-[#171412]/50'].join(' ')}>
                      controls
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {HUD_KEYS.map((item) => (
                        <div
                          className="rounded-2xl border border-[#171412]/15 bg-white/70 px-3 py-2"
                          key={item.key}
                        >
                          <p className={[bodyFontClass, 'text-[0.62rem] uppercase tracking-[0.28em] text-[#171412]/45'].join(' ')}>
                            {item.label}
                          </p>
                          <p className={[displayFontClass, 'mt-1 text-lg leading-none'].join(' ')}>
                            {item.key}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
                <div
                  className={[
                    bodyFontClass,
                    paperShadowClass,
                    'pointer-events-none max-w-sm rounded-[1.5rem] border border-[#171412]/15 bg-[#f7f4ec]/88 px-4 py-3 text-sm leading-6 text-[#171412]/74 backdrop-blur',
                  ].join(' ')}
                >
                  Black grid lines sit over a wrinkled page. Tokens are procedural placeholders until you swap in real sprites.
                </div>

                {onLeave ? (
                  <button
                    className={[
                      bodyFontClass,
                      'pointer-events-auto rounded-full border border-[#171412] bg-[#171412] px-5 py-3 text-[0.72rem] uppercase tracking-[0.28em] text-[#f7f4ec] transition hover:-translate-y-0.5 hover:bg-[#171412]/92',
                    ].join(' ')}
                    onClick={onLeave}
                    type="button"
                  >
                    Leave Arena
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {overlay ? <div className="absolute inset-0 z-10">{overlay}</div> : null}
      </div>
    </section>
  )
}
