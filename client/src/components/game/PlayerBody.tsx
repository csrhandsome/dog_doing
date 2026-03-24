import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import { ROLE_COPY } from "../../game/config";
import type { SnapshotPlayer } from "../../game/protocol";
import { getFacing, getPlayerTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type PlayerBodyProps = {
  isLocal: boolean;
  player: SnapshotPlayer;
};

function drawBodyBase(
  graphics: Graphics,
  player: SnapshotPlayer,
  isLocal: boolean,
) {
  graphics.clear();

  graphics.ellipse(0, 24, 24, 9).fill({
    color: 0x171412,
    alpha: player.action === "dead" ? 0.08 : 0.16,
  });

  if (isLocal) {
    graphics.ellipse(0, 25, 33, 11).stroke({
      color: 0x171412,
      alpha: 0.18,
      width: 1.4,
    });
  }
}

export function PlayerBody({ isLocal, player }: PlayerBodyProps) {
  const facing = getFacing(player);
  const spriteScale = ROLE_COPY[player.role].spriteScale;
  const spriteTexture = getPlayerTexture(player.role);
  const spriteTint = player.action === "hurt" ? 0xffc3b4 : 0xffffff;
  const spriteAlpha = player.action === "dead" ? 0.42 : 1;

  return (
    <pixiContainer>
      <pixiGraphics draw={(graphics) => drawBodyBase(graphics, player, isLocal)} />
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
    </pixiContainer>
  );
}
