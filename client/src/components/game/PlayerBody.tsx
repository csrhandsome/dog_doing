import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import { ROLE_COPY, canRoleUseShield } from "../../game/config";
import type { SnapshotPlayer } from "../../game/protocol";
import { getFacing, getPlayerTexture, getShieldTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type PlayerBodyProps = {
  isLocal: boolean;
  player: SnapshotPlayer;
  serverTime: number;
};

function drawBodyBase(
  graphics: Graphics,
  player: SnapshotPlayer,
  isLocal: boolean,
  serverTime: number,
) {
  const isFrozen = player.frozenUntil > serverTime;
  const isBurning = player.burningUntil > serverTime;

  graphics.clear();

  if (player.action !== "dead" && isFrozen) {
    graphics.ellipse(0, 6, 35, 41).fill({
      color: 0x68c8ff,
      alpha: 0.14,
    });
  }

  if (player.action !== "dead" && isBurning) {
    graphics.ellipse(0, 6, 37, 42).fill({
      color: 0xff7a38,
      alpha: 0.1,
    });
  }

  if (player.action !== "dead") {
    graphics.ellipse(0, 6, 33, 38).fill({
      color: player.color,
      alpha: player.action === "hurt" ? 0.08 : 0.04,
    });
  }

  graphics.ellipse(0, 24, 28, 10).fill({
    color: 0x171412,
    alpha: player.action === "dead" ? 0.08 : 0.16,
  });

  if (isLocal || player.action === "hurt") {
    graphics.ellipse(0, 8, 35, 42).stroke({
      color: isFrozen
        ? 0xc4efff
        : player.action === "hurt"
          ? 0xffd4c8
          : isBurning
            ? 0xffd4a6
            : 0x171412,
      alpha: isFrozen ? 0.24 : player.action === "hurt" ? 0.22 : 0.12,
      width: isFrozen ? 2.1 : player.action === "hurt" ? 2 : 1.4,
    });
  }

  if (isLocal) {
    graphics.ellipse(0, 25, 36, 12).stroke({
      color: 0x171412,
      alpha: 0.16,
      width: 1.4,
    });
  }
}

function getShieldPose(player: SnapshotPlayer) {
  const facing = getFacing(player);
  const blocking = player.action === "block";
  const forwardReach = blocking ? 22 : 12;
  const lateralOffset = blocking ? 9 : 15;

  return {
    alpha: player.action === "dead" ? 0.36 : blocking ? 1 : 0.92,
    rotation: facing.x * 0.16 - facing.y * 0.08,
    scale: blocking ? 0.195 : 0.17,
    x: facing.x * forwardReach - facing.y * lateralOffset,
    y: 4 + facing.y * forwardReach + facing.x * 5,
  };
}

export function PlayerBody({ isLocal, player, serverTime }: PlayerBodyProps) {
  const facing = getFacing(player);
  const spriteScale = ROLE_COPY[player.role].spriteScale;
  const spriteTexture = getPlayerTexture(player.role);
  const shieldTexture = getShieldTexture();
  const isFrozen = player.frozenUntil > serverTime;
  const isBurning = player.burningUntil > serverTime;
  const spriteTint = isFrozen
    ? 0x87d9ff
    : player.action === "hurt"
      ? 0xffc3b4
      : isBurning
        ? 0xffd0a6
        : 0xffffff;
  const spriteAlpha = player.action === "dead" ? 0.42 : 1;
  const canUseShield = canRoleUseShield(player.role);
  const resolvedShieldTexture = canUseShield ? shieldTexture : null;
  const shieldPose = getShieldPose(player);
  const blocking = player.action === "block";

  const renderShield = (key: string) =>
    resolvedShieldTexture ? (
      <pixiSprite
        alpha={shieldPose.alpha}
        anchor={{ x: 0.5, y: 0.5 }}
        key={key}
        rotation={shieldPose.rotation}
        scale={shieldPose.scale}
        texture={resolvedShieldTexture}
        tint={
          isFrozen
            ? 0xbfeaff
            : player.action === "hurt"
              ? 0xffd8cf
              : isBurning
                ? 0xffdeb9
                : 0xffffff
        }
        x={shieldPose.x}
        y={shieldPose.y}
      />
    ) : null;

  return (
    <pixiContainer>
      {!blocking ? renderShield("shield-back") : null}
      <pixiGraphics
        draw={(graphics) => drawBodyBase(graphics, player, isLocal, serverTime)}
      />
      {spriteTexture ? (
        <pixiSprite
          alpha={spriteAlpha}
          anchor={{ x: 0.5, y: 0.82 }}
          scale={{
            x: facing.x > 0 ? -spriteScale : spriteScale,
            y: spriteScale,
          }}
          texture={spriteTexture}
          tint={spriteTint}
          y={8}
        />
      ) : null}
      {blocking ? renderShield("shield-front") : null}
    </pixiContainer>
  );
}
