import { Application } from "@pixi/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { ArenaScene } from "../components/game/ArenaScene";
import {
  areRenderTexturesReady,
  loadRenderTextures,
  TEXT_STYLE,
} from "../components/game/renderConfig";
import { PaperTexture } from "../components/PaperTexture";
import { Button } from "../components/ui/Button";
import { InfoPanel } from "../components/ui/InfoPanel";
import { type ElementSize, useElementSize } from "../hook/useElementSize";
import { useInterpolatedSnapshot } from "../hook/useInterpolatedSnapshot";
import { bodyFontClass, displayFontClass } from "../styles/styles";
import { HUD_KEYS, ROLE_COPY, WEAPON_COPY } from "./config";
import type { SnapshotPayload, SnapshotPlayer, WorldConfig } from "./protocol";

type GameCanvasProps = {
  onLeave?: () => void;
  overlay?: ReactNode;
  playerId?: string | null;
  snapshot: SnapshotPayload;
  stageBlurred?: boolean;
  systemMessage?: string;
  tickRate?: number;
  variant?: "play" | "preview";
  world: WorldConfig;
};

const RESOLUTION =
  typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio || 1, 2);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cameraOffset(
  player: SnapshotPlayer | undefined,
  viewport: ElementSize,
  world: WorldConfig,
) {
  if (!player) {
    return { x: 0, y: 0 };
  }

  const minX = Math.min(0, viewport.width - world.width);
  const minY = Math.min(0, viewport.height - world.height);

  return {
    x: clamp(viewport.width / 2 - player.x, minX, 0),
    y: clamp(viewport.height / 2 - player.y, minY, 0),
  };
}

function hexColor(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

export function GameCanvas({
  onLeave,
  overlay,
  playerId,
  snapshot,
  stageBlurred = false,
  systemMessage,
  tickRate = 20,
  variant = "play",
  world,
}: GameCanvasProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [texturesReady, setTexturesReady] = useState(areRenderTexturesReady);
  const viewport = useElementSize(shellRef);
  const renderSnapshot = useInterpolatedSnapshot(
    snapshot,
    tickRate,
    world.cellSize * 2.5,
  );
  const localPlayer = renderSnapshot.players.find(
    (player) => player.id === playerId,
  );
  const authoritativeLocalPlayer = snapshot.players.find(
    (player) => player.id === playerId,
  );
  const focusPlayer = localPlayer ?? renderSnapshot.players[0];
  const offset = cameraOffset(focusPlayer, viewport, world);
  const roleAccent = localPlayer ? ROLE_COPY[localPlayer.role] : null;
  const showHud = variant === "play";

  useEffect(() => {
    if (texturesReady) {
      return;
    }

    let cancelled = false;

    void loadRenderTextures().then(() => {
      if (!cancelled) {
        setTexturesReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [texturesReady]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#f7f4ec] text-[#171412]">
      <PaperTexture showGrid={false} />
      <div ref={shellRef} className="relative h-screen overflow-hidden">
        <div
          className={
            stageBlurred
              ? "h-full w-full scale-[1.02] blur-[10px]"
              : "h-full w-full"
          }
        >
          <Application
            antialias
            backgroundAlpha={0}
            defaultTextStyle={TEXT_STYLE}
            resizeTo={shellRef}
            resolution={RESOLUTION}
          >
            <ArenaScene
              offset={offset}
              playerId={playerId}
              snapshot={renderSnapshot}
              world={world}
            />
          </Application>

          {showHud ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 p-4 md:p-6">
                <InfoPanel
                  className="max-w-sm rounded-[1.75rem] bg-[#f7f4ec]/92 px-5 py-4"
                  contentClassName="mt-0"
                >
                  <p
                    className={[
                      bodyFontClass,
                      "text-[0.72rem] uppercase tracking-[0.34em] text-[#171412]/55",
                    ].join(" ")}
                  >
                    live brawl
                  </p>
                  <div className="mt-2 flex items-end gap-3">
                    <h1
                      className={[
                        displayFontClass,
                        "text-3xl leading-none md:text-5xl",
                      ].join(" ")}
                    >
                      Dog Doing
                    </h1>
                    <span
                      className={[
                        bodyFontClass,
                        "mb-1 rounded-full border border-[#171412]/20 px-3 py-1 text-[0.72rem] uppercase tracking-[0.26em] text-[#171412]/60",
                      ].join(" ")}
                    >
                      {roleAccent?.tag ?? "track / field"}
                    </span>
                  </div>
                  <p
                    className={[
                      bodyFontClass,
                      "mt-3 max-w-xs text-sm leading-6 text-[#171412]/75",
                    ].join(" ")}
                  >
                    Red track, green field, chalk lines. The
                    client only sends intent.
                  </p>
                </InfoPanel>

                <div className="grid gap-3 sm:min-w-[18rem]">
                  <InfoPanel label="connection">
                    <p
                      className={[
                        displayFontClass,
                        "mt-2 text-2xl leading-none",
                      ].join(" ")}
                    >
                      {systemMessage ?? "connected"}
                    </p>
                    {localPlayer ? (
                      <>
                        <div
                          className={[
                            bodyFontClass,
                            "mt-3 flex items-center gap-2 text-sm text-[#171412]/72",
                          ].join(" ")}
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-[#171412]/40"
                            style={{
                              backgroundColor: hexColor(localPlayer.color),
                            }}
                          />
                          <span>{localPlayer.name}</span>
                          <span className="text-[#171412]/40">/</span>
                          <span>
                            {authoritativeLocalPlayer?.hp ?? localPlayer.hp} hp
                          </span>
                        </div>
                        <div
                          className={[
                            bodyFontClass,
                            "mt-2 text-sm text-[#171412]/62",
                          ].join(" ")}
                        >
                          position {Math.round(localPlayer.x)},{" "}
                          {Math.round(localPlayer.y)}
                        </div>
                        <div
                          className={[
                            bodyFontClass,
                            "mt-1 text-sm text-[#171412]/56",
                          ].join(" ")}
                        >
                          weapon {WEAPON_COPY[localPlayer.equippedWeapon].label}
                        </div>
                      </>
                    ) : null}
                  </InfoPanel>

                  <InfoPanel label="controls">
                    <div className="mt-3 flex flex-wrap gap-2">
                      {HUD_KEYS.map((item) => (
                        <div
                          className="rounded-2xl border border-[#171412]/15 bg-white/70 px-3 py-2"
                          key={item.key}
                        >
                          <p
                            className={[
                              bodyFontClass,
                              "text-[0.62rem] uppercase tracking-[0.28em] text-[#171412]/45",
                            ].join(" ")}
                          >
                            {item.label}
                          </p>
                          <p
                            className={[
                              displayFontClass,
                              "mt-1 text-lg leading-none",
                            ].join(" ")}
                          >
                            {item.key}
                          </p>
                        </div>
                      ))}
                    </div>
                  </InfoPanel>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
                {onLeave ? (
                  <Button onClick={onLeave}>Leave Field</Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {overlay ? (
          <div className="absolute inset-0 z-10">{overlay}</div>
        ) : null}
      </div>
    </section>
  );
}
