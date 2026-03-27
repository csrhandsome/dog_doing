import { Application } from "@pixi/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { ArenaScene } from "../components/game/ArenaScene";
import { BattleHud } from "../components/game/BattleHud";
import { KillFeedbackBanner } from "../components/game/KillFeedbackBanner";
import {
  areRenderTexturesReady,
  loadRenderTextures,
  TEXT_STYLE,
} from "../components/game/renderConfig";
import { PaperTexture } from "../components/PaperTexture";
import { Button } from "../components/ui/Button";
import { type ElementSize, useElementSize } from "../hook/useElementSize";
import { useInterpolatedSnapshot } from "../hook/useInterpolatedSnapshot";
import { getPitchBounds } from "./world";
import type {
  AnnouncementPayload,
  SnapshotPayload,
  SnapshotPlayer,
  WorldConfig,
} from "./protocol";

type GameCanvasProps = {
  announcement?: AnnouncementPayload | null;
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
const GOAL_CAMERA_MARGIN = 96;
const PLAY_CAMERA_GOAL_PULL = 0.82;
const PREVIEW_CAMERA_GOAL_PULL = 0.95;
const PLAY_CAMERA_SCALE = 0.7;
const PREVIEW_CAMERA_SCALE = 0.68;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function cameraTransform(
  player: SnapshotPlayer | undefined,
  viewport: ElementSize,
  world: WorldConfig,
  variant: GameCanvasProps["variant"],
) {
  if (!player) {
    return { scale: 1, x: 0, y: 0 };
  }

  const pitch = getPitchBounds(world);
  const scale = variant === "preview" ? PREVIEW_CAMERA_SCALE : PLAY_CAMERA_SCALE;
  const goalPull = variant === "preview" ? PREVIEW_CAMERA_GOAL_PULL : PLAY_CAMERA_GOAL_PULL;
  const targetGoalX =
    player.team === "red"
      ? pitch.fieldX + pitch.fieldWidth + world.cellSize * 0.62
      : pitch.fieldX - world.cellSize * 0.62;
  const focusX = player.x + (targetGoalX - player.x) * goalPull;
  const targetPlayerScreenY = viewport.height / 2;
  const scaledSceneWidth = (world.width + GOAL_CAMERA_MARGIN * 2) * scale;
  const scaledSceneHeight = world.height * scale;

  const x =
    scaledSceneWidth <= viewport.width
      ? (viewport.width - scaledSceneWidth) / 2 + GOAL_CAMERA_MARGIN * scale
      : clamp(
          viewport.width / 2 - focusX * scale,
          viewport.width - (world.width + GOAL_CAMERA_MARGIN) * scale,
          GOAL_CAMERA_MARGIN * scale,
        );
  const y =
    scaledSceneHeight <= viewport.height
      ? (viewport.height - scaledSceneHeight) / 2
      : clamp(targetPlayerScreenY - player.y * scale, viewport.height - world.height * scale, 0);

  return {
    scale,
    x,
    y,
  };
}

export function GameCanvas({
  announcement,
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
  const [, setTextureLoadTick] = useState(0);
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
  const camera = cameraTransform(focusPlayer, viewport, world, variant);
  const showHud = variant === "play";
  const texturesReady = areRenderTexturesReady();

  useEffect(() => {
    if (texturesReady) {
      return;
    }

    let cancelled = false;

    void loadRenderTextures().then(() => {
      if (!cancelled) {
        setTextureLoadTick((tick) => tick + 1);
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
              offset={{ x: camera.x, y: camera.y }}
              playerId={playerId}
              scale={camera.scale}
              snapshot={renderSnapshot}
              world={world}
            />
          </Application>

          {showHud ? (
            <>
              <KillFeedbackBanner announcement={announcement} />

              <BattleHud
                authoritativeLocalPlayer={authoritativeLocalPlayer}
                localPlayer={localPlayer}
                snapshot={snapshot}
                systemMessage={systemMessage}
              />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4 md:p-6">
                {onLeave ? (
                  <Button onClick={onLeave}>离开战场</Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {overlay ? (
          <div className="absolute inset-0 z-40">{overlay}</div>
        ) : null}
      </div>
    </section>
  );
}
