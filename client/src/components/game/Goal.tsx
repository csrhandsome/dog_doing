import { extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import type { WorldConfig } from "../../game/protocol";
import { getPitchBounds } from "../../game/world";
import { getGoalTexture } from "./renderConfig";

extend({ Container, Graphics, Sprite });

type GoalProps = {
  side: "left" | "right";
  world: WorldConfig;
};

function drawGoalShadow(graphics: Graphics, side: GoalProps["side"], world: WorldConfig) {
  const pitch = getPitchBounds(world);
  const x =
    side === "left"
      ? pitch.fieldX - world.cellSize * 0.62
      : pitch.fieldX + pitch.fieldWidth + world.cellSize * 0.62;

  graphics.clear();
  graphics.ellipse(x, pitch.centerY + 8, world.cellSize * 0.54, pitch.goalBoxHeight * 0.72).fill({
    color: 0x16120e,
    alpha: 0.12,
  });
}

function drawFallbackGoal(
  graphics: Graphics,
  side: GoalProps["side"],
  world: WorldConfig,
) {
  const pitch = getPitchBounds(world);
  const width = world.cellSize * 1.08;
  const height = pitch.goalBoxHeight * 1.14;
  const x =
    side === "left"
      ? pitch.fieldX - world.cellSize * 0.62
      : pitch.fieldX + pitch.fieldWidth + world.cellSize * 0.62;
  const frameLeft = x - width / 2;
  const frameTop = pitch.centerY - height / 2;
  const netInset = world.cellSize * 0.14;

  graphics.clear();
  graphics.roundRect(frameLeft, frameTop, width, height, world.cellSize * 0.1).fill({
    color: 0x4c6d33,
    alpha: 0.88,
  });
  graphics.roundRect(
    frameLeft + netInset,
    frameTop + netInset,
    width - netInset * 2,
    height - netInset * 2,
    world.cellSize * 0.08,
  ).fill({
    color: 0xe9edf0,
    alpha: 0.92,
  });
  graphics.roundRect(frameLeft, frameTop, width, height, world.cellSize * 0.1).stroke({
    color: 0xf6f0e3,
    width: 6,
    alpha: 0.96,
  });

  for (let row = 1; row < 5; row += 1) {
    const lineY = frameTop + (height * row) / 5;

    graphics.moveTo(frameLeft + netInset * 0.9, lineY);
    graphics.lineTo(frameLeft + width - netInset * 0.9, lineY);
  }

  for (let column = 1; column < 4; column += 1) {
    const lineX = frameLeft + (width * column) / 4;

    graphics.moveTo(lineX, frameTop + netInset * 0.9);
    graphics.lineTo(lineX, frameTop + height - netInset * 0.9);
  }

  graphics.stroke({
    color: 0xa8b4bb,
    width: 2.4,
    alpha: 0.72,
  });
}

export function Goal({ side, world }: GoalProps) {
  const pitch = getPitchBounds(world);
  const texture = getGoalTexture();
  const x =
    side === "left"
      ? pitch.fieldX - world.cellSize * 0.62
      : pitch.fieldX + pitch.fieldWidth + world.cellSize * 0.62;
  const spriteScale = side === "left" ? 0.56 : -0.56;

  return (
    <pixiContainer>
      <pixiGraphics draw={(graphics) => drawGoalShadow(graphics, side, world)} />
      {texture ? (
        <pixiSprite
          anchor={{ x: 0.5, y: 0.5 }}
          scale={{ x: spriteScale, y: 0.56 }}
          texture={texture}
          x={x}
          y={pitch.centerY}
        />
      ) : (
        <pixiGraphics draw={(graphics) => drawFallbackGoal(graphics, side, world)} />
      )}
    </pixiContainer>
  );
}
