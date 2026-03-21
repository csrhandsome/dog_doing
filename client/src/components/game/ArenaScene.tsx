import { extend } from "@pixi/react";
import { Container, Graphics } from "pixi.js";

import type { SnapshotPayload, WorldConfig } from "../../game/protocol";
import { DroppedItem } from "./DroppedItem";
import { PlayerSprite } from "./PlayerHealthBar";
import { Projectile, ProjectileGuide } from "./Projectile";

extend({ Container, Graphics });

type ArenaSceneProps = {
  offset: {
    x: number;
    y: number;
  };
  playerId?: string | null;
  snapshot: SnapshotPayload;
  world: WorldConfig;
};

type BurnMark = {
  alpha: number;
  radius: number;
  x: number;
  y: number;
};

type Spark = {
  alpha: number;
  color: number;
  radius: number;
  x: number;
  y: number;
};

type Scuff = {
  alpha: number;
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  width: number;
};

const arenaCache = new Map<
  string,
  {
    burnMarks: BurnMark[];
    scuffs: Scuff[];
    sparks: Spark[];
  }
>();

function createSeededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function getArenaBounds(world: WorldConfig) {
  const inset = Math.max(26, world.cellSize * 0.4);

  return {
    centerX: world.width / 2,
    centerY: world.height / 2,
    innerHeight: world.height - inset * 2,
    innerWidth: world.width - inset * 2,
    innerX: inset,
    innerY: inset,
    inset,
  };
}

function getArenaDecor(world: WorldConfig) {
  const key = `${world.width}-${world.height}-${world.cellSize}`;
  const cached = arenaCache.get(key);

  if (cached) {
    return cached;
  }

  const sparkRandom = createSeededRandom(world.width + world.height + 17);
  const scuffRandom = createSeededRandom(world.width * 3 + world.cellSize * 7);
  const burnRandom = createSeededRandom(world.height * 5 + world.cellSize * 11);
  const { innerHeight, innerWidth, innerX, innerY } = getArenaBounds(world);
  const sparks: Spark[] = [];
  const scuffs: Scuff[] = [];
  const burnMarks: BurnMark[] = [];

  for (let index = 0; index < 44; index += 1) {
    const color = sparkRandom() > 0.55 ? 0xffa35d : 0x7bc6ff;

    sparks.push({
      alpha: 0.08 + sparkRandom() * 0.2,
      color,
      radius: 1.4 + sparkRandom() * 3.2,
      x: innerX + sparkRandom() * innerWidth,
      y: innerY + sparkRandom() * innerHeight,
    });
  }

  for (let index = 0; index < 26; index += 1) {
    const startX = innerX + scuffRandom() * innerWidth;
    const startY = innerY + scuffRandom() * innerHeight;
    const deltaX = (scuffRandom() - 0.5) * world.cellSize * 1.6;
    const deltaY = (scuffRandom() - 0.5) * world.cellSize * 1.2;

    scuffs.push({
      alpha: 0.08 + scuffRandom() * 0.1,
      endX: startX + deltaX,
      endY: startY + deltaY,
      startX,
      startY,
      width: 1 + scuffRandom() * 2.2,
    });
  }

  for (let index = 0; index < 18; index += 1) {
    burnMarks.push({
      alpha: 0.05 + burnRandom() * 0.06,
      radius: world.cellSize * (0.14 + burnRandom() * 0.26),
      x: innerX + burnRandom() * innerWidth,
      y: innerY + burnRandom() * innerHeight,
    });
  }

  const decor = { burnMarks, scuffs, sparks };
  arenaCache.set(key, decor);

  return decor;
}

function drawBackdrop(graphics: Graphics, world: WorldConfig) {
  const { centerX, centerY } = getArenaBounds(world);

  graphics.clear();
  graphics.rect(0, 0, world.width, world.height).fill({ color: 0x05070b });
  graphics.rect(0, 0, world.width, world.height * 0.46).fill({
    color: 0x0c141d,
    alpha: 0.98,
  });
  graphics.rect(0, world.height * 0.46, world.width, world.height * 0.54).fill({
    color: 0x120f10,
    alpha: 0.94,
  });

  graphics.circle(world.width * 0.2, world.height * 0.12, world.width * 0.19).fill({
    color: 0x64bfff,
    alpha: 0.09,
  });
  graphics.circle(world.width * 0.8, world.height * 0.12, world.width * 0.17).fill({
    color: 0xff7f5c,
    alpha: 0.08,
  });
  graphics.circle(centerX, world.height * 0.08, world.width * 0.2).fill({
    color: 0xffbc62,
    alpha: 0.12,
  });
  graphics.ellipse(centerX, centerY, world.width * 0.3, world.height * 0.26).fill({
    color: 0xffffff,
    alpha: 0.035,
  });
}

function drawFloor(graphics: Graphics, world: WorldConfig) {
  const decor = getArenaDecor(world);
  const { centerX, centerY, innerHeight, innerWidth, innerX, innerY, inset } =
    getArenaBounds(world);

  graphics.clear();

  graphics.roundRect(innerX, innerY, innerWidth, innerHeight, world.cellSize * 0.28).fill({
    color: 0x13191f,
  });
  graphics.roundRect(
    innerX + 8,
    innerY + 8,
    innerWidth - 16,
    innerHeight - 16,
    world.cellSize * 0.22,
  ).fill({
    color: 0x1a2229,
    alpha: 0.96,
  });

  for (let y = innerY + 12, row = 0; y < innerY + innerHeight - 12; y += world.cellSize, row += 1) {
    graphics.rect(innerX + 10, y, innerWidth - 20, Math.min(world.cellSize, innerY + innerHeight - 12 - y)).fill({
      color: row % 2 === 0 ? 0x151c22 : 0x11171c,
      alpha: 0.3,
    });
  }

  graphics.rect(innerX + inset * 0.25, centerY - world.cellSize * 0.9, innerWidth - inset * 0.5, world.cellSize * 1.8).fill({
    color: 0xffbd69,
    alpha: 0.04,
  });
  graphics.rect(centerX - world.cellSize * 0.95, innerY + inset * 0.25, world.cellSize * 1.9, innerHeight - inset * 0.5).fill({
    color: 0x79c0ff,
    alpha: 0.032,
  });

  for (let x = innerX; x <= innerX + innerWidth; x += world.cellSize) {
    graphics.moveTo(x, innerY);
    graphics.lineTo(x, innerY + innerHeight);
  }

  for (let y = innerY; y <= innerY + innerHeight; y += world.cellSize) {
    graphics.moveTo(innerX, y);
    graphics.lineTo(innerX + innerWidth, y);
  }

  graphics.stroke({
    color: 0xa9bac8,
    alpha: 0.08,
    width: 1,
  });

  const majorStep = world.cellSize * 4;

  for (let x = innerX; x <= innerX + innerWidth; x += majorStep) {
    graphics.moveTo(x, innerY);
    graphics.lineTo(x, innerY + innerHeight);
  }

  for (let y = innerY; y <= innerY + innerHeight; y += majorStep) {
    graphics.moveTo(innerX, y);
    graphics.lineTo(innerX + innerWidth, y);
  }

  graphics.stroke({
    color: 0xd9e5ef,
    alpha: 0.11,
    width: 2,
  });

  graphics.circle(centerX, centerY, world.cellSize * 1.18).stroke({
    color: 0xffcf8b,
    alpha: 0.28,
    width: 4,
  });
  graphics.circle(centerX, centerY, world.cellSize * 0.28).fill({
    color: 0xf3f6fb,
    alpha: 0.16,
  });
  graphics.roundRect(
    centerX - world.cellSize * 2.8,
    centerY - world.cellSize * 0.68,
    world.cellSize * 5.6,
    world.cellSize * 1.36,
    world.cellSize * 0.22,
  ).stroke({
    color: 0xf1f6fc,
    alpha: 0.12,
    width: 2.4,
  });

  for (const burn of decor.burnMarks) {
    graphics.circle(burn.x, burn.y, burn.radius).fill({
      color: 0x020304,
      alpha: burn.alpha,
    });
  }

  for (const scuff of decor.scuffs) {
    graphics.moveTo(scuff.startX, scuff.startY);
    graphics.lineTo(scuff.endX, scuff.endY);
    graphics.stroke({
      color: 0xf1f4f9,
      alpha: scuff.alpha,
      width: scuff.width,
    });
  }
}

function drawUnderLights(graphics: Graphics, world: WorldConfig) {
  const { centerX, innerHeight, innerWidth, innerX, innerY } = getArenaBounds(world);
  const lampGap = world.cellSize * 3.4;

  graphics.clear();

  for (
    let x = innerX + world.cellSize * 0.85, lampIndex = 0;
    x < innerX + innerWidth - world.cellSize * 0.5;
    x += lampGap, lampIndex += 1
  ) {
    const color = lampIndex % 2 === 0 ? 0xffa45e : 0x70c2ff;

    graphics.circle(x, innerY + 14, world.cellSize * 0.36).fill({
      color,
      alpha: 0.08,
    });
    graphics.circle(x, innerY + 14, 6).fill({
      color,
      alpha: 0.82,
    });
    graphics.circle(x, innerY + innerHeight - 14, world.cellSize * 0.34).fill({
      color,
      alpha: 0.055,
    });
    graphics.circle(x, innerY + innerHeight - 14, 5).fill({
      color,
      alpha: 0.6,
    });
  }

  graphics.ellipse(centerX, innerY + world.cellSize * 0.8, innerWidth * 0.26, world.cellSize * 0.6).fill({
    color: 0xffbf70,
    alpha: 0.06,
  });
  graphics.ellipse(centerX, innerY + innerHeight - world.cellSize * 0.8, innerWidth * 0.24, world.cellSize * 0.5).fill({
    color: 0x79c3ff,
    alpha: 0.04,
  });
}

function drawFrameOverlay(graphics: Graphics, world: WorldConfig) {
  const { innerHeight, innerWidth, innerX, innerY } = getArenaBounds(world);
  const bracketGap = world.cellSize * 3.8;
  const moduleWidth = world.cellSize * 0.54;
  const moduleHeight = world.cellSize * 0.74;
  const moduleRadius = world.cellSize * 0.12;

  graphics.clear();

  graphics.roundRect(innerX, innerY, innerWidth, innerHeight, world.cellSize * 0.28).stroke({
    color: 0x040608,
    alpha: 0.96,
    width: 18,
  });
  graphics.roundRect(
    innerX + 8,
    innerY + 8,
    innerWidth - 16,
    innerHeight - 16,
    world.cellSize * 0.2,
  ).stroke({
    color: 0xd1dde8,
    alpha: 0.14,
    width: 2,
  });

  for (
    let x = innerX + world.cellSize * 0.85;
    x < innerX + innerWidth - world.cellSize * 0.5;
    x += bracketGap
  ) {
    graphics.roundRect(
      x - moduleWidth / 2,
      innerY - moduleHeight * 0.32,
      moduleWidth,
      moduleHeight,
      moduleRadius,
    ).fill({
      color: 0x070a0e,
      alpha: 0.95,
    });
    graphics.roundRect(
      x - moduleWidth / 2,
      innerY + innerHeight - moduleHeight * 0.68,
      moduleWidth,
      moduleHeight,
      moduleRadius,
    ).fill({
      color: 0x070a0e,
      alpha: 0.94,
    });
  }

  for (let x = innerX + world.cellSize * 0.6; x < innerX + innerWidth - world.cellSize * 0.5; x += world.cellSize * 0.72) {
    graphics.moveTo(x, innerY + 18);
    graphics.lineTo(x + world.cellSize * 0.22, innerY + 4);
    graphics.moveTo(x, innerY + innerHeight - 18);
    graphics.lineTo(x + world.cellSize * 0.22, innerY + innerHeight - 4);
  }

  graphics.stroke({
    color: 0xff9a58,
    alpha: 0.28,
    width: 3,
  });
}

function drawForegroundOverlay(graphics: Graphics, world: WorldConfig) {
  const decor = getArenaDecor(world);
  const { centerX, centerY } = getArenaBounds(world);

  graphics.clear();

  for (const spark of decor.sparks) {
    graphics.circle(spark.x, spark.y, spark.radius).fill({
      color: spark.color,
      alpha: spark.alpha,
    });
  }

  graphics.ellipse(centerX, centerY, world.width * 0.42, world.height * 0.34).stroke({
    color: 0xffffff,
    alpha: 0.035,
    width: 28,
  });
  graphics.rect(0, 0, world.width, world.height * 0.12).fill({
    color: 0x020304,
    alpha: 0.34,
  });
  graphics.rect(0, world.height * 0.88, world.width, world.height * 0.12).fill({
    color: 0x020304,
    alpha: 0.42,
  });
}

export function ArenaScene({
  offset,
  playerId,
  snapshot,
  world,
}: ArenaSceneProps) {
  const localPlayer = snapshot.players.find((player) => player.id === playerId);

  return (
    <pixiContainer x={offset.x} y={offset.y}>
      <pixiGraphics draw={(graphics) => drawBackdrop(graphics, world)} />
      <pixiGraphics draw={(graphics) => drawFloor(graphics, world)} />
      <pixiGraphics draw={(graphics) => drawUnderLights(graphics, world)} />
      {snapshot.droppedItems.map((item) => (
        <DroppedItem item={item} key={item.id} serverTime={snapshot.serverTime} />
      ))}
      {localPlayer ? <ProjectileGuide player={localPlayer} /> : null}
      {snapshot.players.map((player) => (
        <PlayerSprite
          isLocal={player.id === playerId}
          key={player.id}
          player={player}
          serverTime={snapshot.serverTime}
        />
      ))}
      {snapshot.projectiles.map((projectile) => (
        <Projectile key={projectile.id} projectile={projectile} />
      ))}
      <pixiGraphics draw={(graphics) => drawFrameOverlay(graphics, world)} />
      <pixiGraphics draw={(graphics) => drawForegroundOverlay(graphics, world)} />
    </pixiContainer>
  );
}
