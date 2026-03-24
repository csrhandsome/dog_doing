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

type GrassPatch = {
  alpha: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

type TreeShadow = {
  alpha: number;
  radius: number;
  x: number;
  y: number;
};

type TrackScuff = {
  alpha: number;
  endX: number;
  endY: number;
  startX: number;
  startY: number;
  width: number;
};

const playgroundCache = new Map<
  string,
  {
    grassPatches: GrassPatch[];
    trackScuffs: TrackScuff[];
    treeShadows: TreeShadow[];
  }
>();

// Keep the scene boundary aligned with the current server-side movement clamp.
const WORLD_EDGE_PADDING = 22;

function createSeededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function getPlaygroundBounds(world: WorldConfig) {
  const margin = WORLD_EDGE_PADDING;
  const trackWidth = world.cellSize * 1.08;
  const fieldInset = margin + trackWidth;
  const outerWidth = world.width - margin * 2;
  const outerHeight = world.height - margin * 2;
  const fieldWidth = world.width - fieldInset * 2;
  const fieldHeight = world.height - fieldInset * 2;

  return {
    centerX: world.width / 2,
    centerY: world.height / 2,
    fieldHeight,
    fieldInset,
    fieldWidth,
    fieldX: fieldInset,
    fieldY: fieldInset,
    margin,
    outerHeight,
    outerWidth,
    outerX: margin,
    outerY: margin,
    trackWidth,
  };
}

function getPlaygroundDecor(world: WorldConfig) {
  const key = `${world.width}-${world.height}-${world.cellSize}`;
  const cached = playgroundCache.get(key);

  if (cached) {
    return cached;
  }

  const grassRandom = createSeededRandom(world.width + world.height + 41);
  const scuffRandom = createSeededRandom(world.width * 5 + world.cellSize * 13);
  const shadowRandom = createSeededRandom(world.height * 7 + world.cellSize * 19);
  const { fieldHeight, fieldWidth, fieldX, fieldY, outerHeight, outerWidth, outerX, outerY } =
    getPlaygroundBounds(world);
  const grassPatches: GrassPatch[] = [];
  const trackScuffs: TrackScuff[] = [];
  const treeShadows: TreeShadow[] = [];

  for (let index = 0; index < 24; index += 1) {
    grassPatches.push({
      alpha: 0.05 + grassRandom() * 0.08,
      height: world.cellSize * (0.8 + grassRandom() * 1.9),
      width: world.cellSize * (1.1 + grassRandom() * 2.6),
      x: fieldX + grassRandom() * fieldWidth,
      y: fieldY + grassRandom() * fieldHeight,
    });
  }

  for (let index = 0; index < 18; index += 1) {
    const onHorizontal = scuffRandom() > 0.5;
    const startX = onHorizontal
      ? outerX + scuffRandom() * outerWidth
      : (scuffRandom() > 0.5 ? outerX + world.cellSize * 0.72 : outerX + outerWidth - world.cellSize * 0.72);
    const startY = onHorizontal
      ? (scuffRandom() > 0.5 ? outerY + world.cellSize * 0.72 : outerY + outerHeight - world.cellSize * 0.72)
      : outerY + scuffRandom() * outerHeight;

    trackScuffs.push({
      alpha: 0.08 + scuffRandom() * 0.1,
      endX: startX + (scuffRandom() - 0.5) * world.cellSize * (onHorizontal ? 2 : 0.8),
      endY: startY + (scuffRandom() - 0.5) * world.cellSize * (onHorizontal ? 0.8 : 2),
      startX,
      startY,
      width: 1 + scuffRandom() * 2.4,
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const side = index % 4;

    treeShadows.push({
      alpha: 0.06 + shadowRandom() * 0.06,
      radius: world.cellSize * (1.4 + shadowRandom() * 1.8),
      x:
        side === 0
          ? outerX - world.cellSize * 0.5
          : side === 1
            ? outerX + outerWidth + world.cellSize * 0.5
            : outerX + shadowRandom() * outerWidth,
      y:
        side === 2
          ? outerY - world.cellSize * 0.5
          : side === 3
            ? outerY + outerHeight + world.cellSize * 0.5
            : outerY + shadowRandom() * outerHeight,
    });
  }

  const decor = { grassPatches, trackScuffs, treeShadows };
  playgroundCache.set(key, decor);

  return decor;
}

function drawBackdrop(graphics: Graphics, world: WorldConfig) {
  const { centerX, centerY } = getPlaygroundBounds(world);

  graphics.clear();
  graphics.rect(0, 0, world.width, world.height).fill({ color: 0xd8c9a9 });
  graphics.rect(0, 0, world.width, world.height * 0.16).fill({
    color: 0xe7dcc1,
    alpha: 0.58,
  });
  graphics.rect(0, world.height * 0.84, world.width, world.height * 0.16).fill({
    color: 0xc5b489,
    alpha: 0.34,
  });
  graphics.circle(world.width * 0.18, world.height * 0.14, world.width * 0.16).fill({
    color: 0xffffff,
    alpha: 0.05,
  });
  graphics.circle(world.width * 0.8, world.height * 0.12, world.width * 0.14).fill({
    color: 0xfff4ca,
    alpha: 0.08,
  });
  graphics.ellipse(centerX, centerY, world.width * 0.36, world.height * 0.26).fill({
    color: 0xffffff,
    alpha: 0.035,
  });
}

function drawTrackAndField(graphics: Graphics, world: WorldConfig) {
  const decor = getPlaygroundDecor(world);
  const {
    centerX,
    centerY,
    fieldHeight,
    fieldWidth,
    fieldX,
    fieldY,
    outerHeight,
    outerWidth,
    outerX,
    outerY,
    trackWidth,
  } = getPlaygroundBounds(world);
  const outerRadius = world.cellSize * 0.7;
  const fieldRadius = world.cellSize * 0.44;

  graphics.clear();

  graphics.roundRect(outerX, outerY, outerWidth, outerHeight, outerRadius).fill({
    color: 0xc45c40,
  });
  graphics.roundRect(
    outerX + 10,
    outerY + 10,
    outerWidth - 20,
    outerHeight - 20,
    outerRadius - 6,
  ).fill({
    color: 0xd16a4d,
    alpha: 0.76,
  });
  graphics.roundRect(fieldX, fieldY, fieldWidth, fieldHeight, fieldRadius).fill({
    color: 0x74b85f,
  });

  for (let y = fieldY, stripe = 0; y < fieldY + fieldHeight; y += world.cellSize * 0.96, stripe += 1) {
    graphics.rect(fieldX, y, fieldWidth, Math.min(world.cellSize * 0.96, fieldY + fieldHeight - y)).fill({
      color: stripe % 2 === 0 ? 0x7cbe65 : 0x6baa58,
      alpha: 0.26,
    });
  }

  for (let lane = 0; lane < 4; lane += 1) {
    const laneInset = lane * (trackWidth / 4.25) + 6;

    graphics.roundRect(
      outerX + laneInset,
      outerY + laneInset,
      outerWidth - laneInset * 2,
      outerHeight - laneInset * 2,
      Math.max(10, outerRadius - laneInset * 0.6),
    ).stroke({
      color: 0xfef8ef,
      alpha: lane === 0 ? 0.72 : 0.34,
      width: lane === 0 ? 3.4 : 1.7,
    });
  }

  graphics.roundRect(fieldX, fieldY, fieldWidth, fieldHeight, fieldRadius).stroke({
    color: 0xfefcf6,
    alpha: 0.82,
    width: 3,
  });
  graphics.moveTo(centerX, fieldY);
  graphics.lineTo(centerX, fieldY + fieldHeight);
  graphics.stroke({
    color: 0xfefcf6,
    alpha: 0.8,
    width: 3,
  });
  graphics.circle(centerX, centerY, world.cellSize * 1.18).stroke({
    color: 0xfefcf6,
    alpha: 0.82,
    width: 3,
  });
  graphics.circle(centerX, centerY, 6).fill({
    color: 0xfefcf6,
    alpha: 0.92,
  });

  const penaltyBoxWidth = world.cellSize * 2.4;
  const penaltyBoxHeight = world.cellSize * 4.9;
  const goalBoxWidth = world.cellSize * 1.12;
  const goalBoxHeight = world.cellSize * 2.36;

  graphics.rect(fieldX, centerY - penaltyBoxHeight / 2, penaltyBoxWidth, penaltyBoxHeight).stroke({
    color: 0xfefcf6,
    alpha: 0.78,
    width: 3,
  });
  graphics.rect(
    fieldX + fieldWidth - penaltyBoxWidth,
    centerY - penaltyBoxHeight / 2,
    penaltyBoxWidth,
    penaltyBoxHeight,
  ).stroke({
    color: 0xfefcf6,
    alpha: 0.78,
    width: 3,
  });
  graphics.rect(fieldX, centerY - goalBoxHeight / 2, goalBoxWidth, goalBoxHeight).stroke({
    color: 0xfefcf6,
    alpha: 0.76,
    width: 3,
  });
  graphics.rect(
    fieldX + fieldWidth - goalBoxWidth,
    centerY - goalBoxHeight / 2,
    goalBoxWidth,
    goalBoxHeight,
  ).stroke({
    color: 0xfefcf6,
    alpha: 0.76,
    width: 3,
  });

  graphics.moveTo(outerX + trackWidth * 0.64, outerY);
  graphics.lineTo(outerX + trackWidth * 0.64, outerY + trackWidth);
  graphics.stroke({
    color: 0xfef8ef,
    alpha: 0.95,
    width: 4,
  });

  for (
    let x = fieldX + world.cellSize * 0.8;
    x < fieldX + fieldWidth - world.cellSize * 0.4;
    x += world.cellSize * 0.72
  ) {
    graphics.moveTo(x, outerY + trackWidth * 0.28);
    graphics.lineTo(x + world.cellSize * 0.18, outerY + trackWidth * 0.88);
    graphics.moveTo(x, outerY + outerHeight - trackWidth * 0.28);
    graphics.lineTo(x + world.cellSize * 0.18, outerY + outerHeight - trackWidth * 0.88);
  }

  graphics.stroke({
    color: 0xfff5e6,
    alpha: 0.3,
    width: 2,
  });

  for (const patch of decor.grassPatches) {
    graphics.ellipse(patch.x, patch.y, patch.width, patch.height).fill({
      color: 0x4f863f,
      alpha: patch.alpha,
    });
  }

  for (const scuff of decor.trackScuffs) {
    graphics.moveTo(scuff.startX, scuff.startY);
    graphics.lineTo(scuff.endX, scuff.endY);
    graphics.stroke({
      color: 0x6f2d20,
      alpha: scuff.alpha,
      width: scuff.width,
    });
  }
}

function drawCampusDetails(graphics: Graphics, world: WorldConfig) {
  const { outerHeight, outerWidth, outerX, outerY } = getPlaygroundBounds(world);

  graphics.clear();

  graphics.roundRect(outerX - 10, outerY - 10, outerWidth + 20, outerHeight + 20, world.cellSize * 0.74).stroke({
    color: 0x9e8f74,
    alpha: 0.42,
    width: 8,
  });

  for (let x = outerX + world.cellSize * 0.45; x < outerX + outerWidth; x += world.cellSize * 0.58) {
    graphics.moveTo(x, outerY - world.cellSize * 0.3);
    graphics.lineTo(x, outerY + world.cellSize * 0.22);
    graphics.moveTo(x, outerY + outerHeight - world.cellSize * 0.22);
    graphics.lineTo(x, outerY + outerHeight + world.cellSize * 0.3);
  }

  for (let y = outerY + world.cellSize * 0.4; y < outerY + outerHeight; y += world.cellSize * 0.58) {
    graphics.moveTo(outerX - world.cellSize * 0.3, y);
    graphics.lineTo(outerX + world.cellSize * 0.22, y);
    graphics.moveTo(outerX + outerWidth - world.cellSize * 0.22, y);
    graphics.lineTo(outerX + outerWidth + world.cellSize * 0.3, y);
  }

  graphics.stroke({
    color: 0x85775e,
    alpha: 0.3,
    width: 2,
  });

  graphics.roundRect(
    outerX + world.cellSize * 0.24,
    outerY + world.cellSize * 0.24,
    world.cellSize * 1.18,
    world.cellSize * 0.42,
    12,
  ).fill({
    color: 0x627d9b,
    alpha: 0.84,
  });
  graphics.roundRect(
    outerX + outerWidth - world.cellSize * 1.42,
    outerY + outerHeight - world.cellSize * 0.66,
    world.cellSize * 1.18,
    world.cellSize * 0.42,
    12,
  ).fill({
    color: 0x627d9b,
    alpha: 0.84,
  });
}

function drawForegroundOverlay(graphics: Graphics, world: WorldConfig) {
  const decor = getPlaygroundDecor(world);
  const { centerX, centerY, outerHeight, outerWidth, outerX, outerY } =
    getPlaygroundBounds(world);

  graphics.clear();

  for (const shadow of decor.treeShadows) {
    graphics.circle(shadow.x, shadow.y, shadow.radius).fill({
      color: 0x4f6d39,
      alpha: shadow.alpha,
    });
  }

  graphics.ellipse(centerX, centerY, world.width * 0.38, world.height * 0.28).fill({
    color: 0xfff8e1,
    alpha: 0.045,
  });
  graphics.roundRect(outerX, outerY, outerWidth, outerHeight, world.cellSize * 0.7).stroke({
    color: 0xffffff,
    alpha: 0.08,
    width: 18,
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
      <pixiGraphics draw={(graphics) => drawTrackAndField(graphics, world)} />
      <pixiGraphics draw={(graphics) => drawCampusDetails(graphics, world)} />
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
      <pixiGraphics draw={(graphics) => drawForegroundOverlay(graphics, world)} />
    </pixiContainer>
  );
}
