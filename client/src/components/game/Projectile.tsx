import { extend } from "@pixi/react";
import { Graphics } from "pixi.js";

import { RANGED_WEAPON_IDS, WEAPON_COPY } from "../../game/config";
import type {
  ProjectileSnapshot,
  SnapshotPlayer,
  WorldConfig,
} from "../../game/protocol";
import { clampToPlayableBounds } from "../../game/world";
import { getFacing } from "./renderConfig";

extend({ Graphics });

type Point = {
  x: number;
  y: number;
};

type ProjectileProps = {
  projectile: ProjectileSnapshot;
};

type ProjectileGuideProps = {
  player: SnapshotPlayer;
  world: WorldConfig;
};

const PROJECTILE_GUIDE_OFFSET = 40;
const TRAJECTORY_STEPS = 32;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha;
}

function getArrowControlPoint(start: Point, end: Point, arcHeight: number) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / length;
  const normalY = dx / length;

  return {
    x: midX + normalX * Math.min(length * 0.12, 54),
    y: midY - arcHeight + normalY * Math.min(length * 0.08, 36),
  };
}

function getTrajectoryPoint(
  weaponId: ProjectileSnapshot["weaponId"],
  start: Point,
  end: Point,
  alpha: number,
) {
  if (weaponId === "gun") {
    return {
      x: lerp(start.x, end.x, alpha),
      y: lerp(start.y, end.y, alpha),
    };
  }

  const control = getArrowControlPoint(start, end, WEAPON_COPY[weaponId].arcHeight);
  const inverse = 1 - alpha;

  return {
    x:
      inverse * inverse * start.x +
      2 * inverse * alpha * control.x +
      alpha * alpha * end.x,
    y:
      inverse * inverse * start.y +
      2 * inverse * alpha * control.y +
      alpha * alpha * end.y,
  };
}

function drawPolygon(
  graphics: Graphics,
  points: Point[],
  color: number,
  alpha: number,
) {
  if (points.length < 3) {
    return;
  }

  graphics.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index].x, points[index].y);
  }

  graphics.closePath();
  graphics.fill({ color, alpha });
}

function drawDiamond(
  graphics: Graphics,
  point: Point,
  size: number,
  color: number,
  alpha: number,
) {
  drawPolygon(
    graphics,
    [
      { x: point.x, y: point.y - size },
      { x: point.x + size * 0.82, y: point.y },
      { x: point.x, y: point.y + size },
      { x: point.x - size * 0.82, y: point.y },
    ],
    color,
    alpha,
  );
}

function getTravelAngle(
  weaponId: ProjectileSnapshot["weaponId"],
  start: Point,
  end: Point,
  progress: number,
) {
  const leadPoint = getTrajectoryPoint(
    weaponId,
    start,
    end,
    clamp(progress + 0.04, 0, 1),
  );
  const trailPoint = getTrajectoryPoint(
    weaponId,
    start,
    end,
    clamp(progress - 0.04, 0, 1),
  );

  return Math.atan2(leadPoint.y - trailPoint.y, leadPoint.x - trailPoint.x);
}

function drawTrajectoryPath(
  graphics: Graphics,
  weaponId: ProjectileSnapshot["weaponId"],
  start: Point,
  end: Point,
) {
  for (let step = 0; step <= TRAJECTORY_STEPS; step += 1) {
    const progress = step / TRAJECTORY_STEPS;
    const point = getTrajectoryPoint(weaponId, start, end, progress);

    if (step === 0) {
      graphics.moveTo(point.x, point.y);
      continue;
    }

    graphics.lineTo(point.x, point.y);
  }
}

function drawTrajectory(
  graphics: Graphics,
  weaponId: ProjectileSnapshot["weaponId"],
  effect: ProjectileSnapshot["effect"],
  start: Point,
  end: Point,
  alpha = 1,
) {
  const weapon = WEAPON_COPY[weaponId];
  const outerWidth =
    weaponId === "gun" ? 2.6 : effect === "fire" ? 2.4 : 2;

  drawTrajectoryPath(graphics, weaponId, start, end);
  graphics.stroke({
    color: weapon.trailColor,
    alpha,
    width: outerWidth,
  });

  if (effect === "ice") {
    drawTrajectoryPath(graphics, weaponId, start, end);
    graphics.stroke({
      color: 0xe6fbff,
      alpha: alpha * 0.58,
      width: Math.max(1.1, outerWidth * 0.52),
    });
  }

  if (effect === "fire") {
    drawTrajectoryPath(graphics, weaponId, start, end);
    graphics.stroke({
      color: weapon.bulletColor,
      alpha: alpha * 0.5,
      width: Math.max(1.2, outerWidth * 0.56),
    });
  }
}

function drawLandingMarker(
  graphics: Graphics,
  weaponId: ProjectileSnapshot["weaponId"],
  effect: ProjectileSnapshot["effect"],
  point: Point,
  alpha: number,
) {
  const weapon = WEAPON_COPY[weaponId];
  const radius = weaponId === "gun" ? 7 : 9;

  if (effect === "ice") {
    graphics.circle(point.x, point.y, radius).stroke({
      color: weapon.trailColor,
      alpha,
      width: 2.2,
    });
    drawDiamond(graphics, point, radius * 0.88, weapon.bulletColor, alpha * 0.72);
    drawDiamond(graphics, point, radius * 1.4, 0xe6fbff, alpha * 0.24);
    return;
  }

  if (effect === "fire") {
    graphics.circle(point.x, point.y, radius).stroke({
      color: weapon.trailColor,
      alpha,
      width: 2.4,
    });
    graphics.circle(point.x, point.y, radius * 1.65).fill({
      color: weapon.trailColor,
      alpha: alpha * 0.16,
    });

    for (const [offsetX, offsetY] of [
      [0, -radius * 1.2],
      [radius * 1.08, 0],
      [0, radius * 1.2],
      [-radius * 1.08, 0],
    ]) {
      graphics.circle(point.x + offsetX, point.y + offsetY, 2.2).fill({
        color: weapon.bulletColor,
        alpha: alpha * 0.6,
      });
    }

    return;
  }

  graphics.circle(point.x, point.y, radius).stroke({
    color: weapon.trailColor,
    alpha,
    width: weaponId === "gun" ? 2 : 2.4,
  });
  graphics.circle(point.x, point.y, radius * 1.8).fill({
    color: weapon.trailColor,
    alpha: alpha * 0.12,
  });
}

function getProjectilePadding(weaponId: ProjectileSnapshot["weaponId"]) {
  return weaponId === "gun" ? 11 : 16;
}

function drawIceProjectile(
  graphics: Graphics,
  point: Point,
  angle: number,
  weaponId: ProjectileSnapshot["weaponId"],
) {
  const weapon = WEAPON_COPY[weaponId];
  const size = weaponId === "gun" ? 7 : 8;
  const normal = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };

  drawDiamond(graphics, point, size * 1.8, weapon.trailColor, 0.18);
  drawDiamond(graphics, point, size, weapon.bulletColor, 0.96);
  drawPolygon(
    graphics,
    [
      {
        x: point.x - normal.x * size * 0.35,
        y: point.y - normal.y * size * 0.35,
      },
      {
        x: point.x + normal.x * size * 0.9,
        y: point.y + normal.y * size * 0.9,
      },
      {
        x: point.x + normal.x * size * 0.18,
        y: point.y + normal.y * size * 0.18,
      },
      {
        x: point.x + Math.cos(angle) * size * 1.4,
        y: point.y + Math.sin(angle) * size * 1.4,
      },
    ],
    0xeefdff,
    0.72,
  );
}

function drawFireProjectile(
  graphics: Graphics,
  point: Point,
  angle: number,
  weaponId: ProjectileSnapshot["weaponId"],
) {
  const weapon = WEAPON_COPY[weaponId];
  const size = weaponId === "gun" ? 6.5 : 8.5;
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -direction.y, y: direction.x };

  drawPolygon(
    graphics,
    [
      {
        x: point.x + direction.x * size * 1.2,
        y: point.y + direction.y * size * 1.2,
      },
      {
        x: point.x + normal.x * size * 0.64,
        y: point.y + normal.y * size * 0.64,
      },
      {
        x: point.x - direction.x * size * 1.3,
        y: point.y - direction.y * size * 1.3,
      },
      {
        x: point.x - normal.x * size * 0.64,
        y: point.y - normal.y * size * 0.64,
      },
    ],
    weapon.trailColor,
    0.96,
  );
  drawPolygon(
    graphics,
    [
      {
        x: point.x + direction.x * size * 0.88,
        y: point.y + direction.y * size * 0.88,
      },
      {
        x: point.x + normal.x * size * 0.36,
        y: point.y + normal.y * size * 0.36,
      },
      {
        x: point.x - direction.x * size * 0.82,
        y: point.y - direction.y * size * 0.82,
      },
      {
        x: point.x - normal.x * size * 0.36,
        y: point.y - normal.y * size * 0.36,
      },
    ],
    weapon.bulletColor,
    0.94,
  );
  graphics.circle(
    point.x - direction.x * size * 0.12,
    point.y - direction.y * size * 0.12,
    size * 1.35,
  ).fill({
    color: weapon.trailColor,
    alpha: 0.18,
  });
}

function drawTrailParticles(
  graphics: Graphics,
  projectile: ProjectileSnapshot,
  start: Point,
  end: Point,
  progress: number,
) {
  const weapon = WEAPON_COPY[projectile.weaponId];

  for (let index = 1; index <= 4; index += 1) {
    const sampleProgress = clamp(progress - index * 0.07, 0, 1);
    const point = getTrajectoryPoint(projectile.weaponId, start, end, sampleProgress);
    const alpha = Math.max(0, 0.28 - index * 0.05);

    if (projectile.effect === "ice") {
      drawDiamond(graphics, point, Math.max(2.8, 5 - index), weapon.trailColor, alpha);
      continue;
    }

    if (projectile.effect === "fire") {
      graphics.circle(point.x, point.y, Math.max(2.4, 5.8 - index)).fill({
        color: index % 2 === 0 ? weapon.trailColor : weapon.bulletColor,
        alpha,
      });
    }
  }
}

function drawProjectile(graphics: Graphics, projectile: ProjectileSnapshot) {
  const weapon = WEAPON_COPY[projectile.weaponId];
  const start = { x: projectile.startX, y: projectile.startY };
  const end = { x: projectile.endX, y: projectile.endY };
  const totalDistance = Math.max(
    1,
    Math.hypot(projectile.endX - projectile.startX, projectile.endY - projectile.startY),
  );
  const currentDistance = Math.hypot(
    projectile.x - projectile.startX,
    projectile.y - projectile.startY,
  );
  const progress = clamp(currentDistance / totalDistance, 0, 1);
  const bulletPoint = getTrajectoryPoint(projectile.weaponId, start, end, progress);
  const travelAngle = getTravelAngle(projectile.weaponId, start, end, progress);

  graphics.clear();
  drawTrajectory(graphics, projectile.weaponId, projectile.effect, start, end, 0.18);
  drawLandingMarker(graphics, projectile.weaponId, projectile.effect, end, 0.24);
  drawTrailParticles(graphics, projectile, start, end, progress);

  if (projectile.effect === "ice") {
    drawIceProjectile(graphics, bulletPoint, travelAngle, projectile.weaponId);
    return;
  }

  if (projectile.effect === "fire") {
    drawFireProjectile(graphics, bulletPoint, travelAngle, projectile.weaponId);
    return;
  }

  graphics.circle(bulletPoint.x, bulletPoint.y, projectile.weaponId === "gun" ? 5 : 6).fill({
    color: weapon.bulletColor,
    alpha: 0.96,
  });
  graphics.circle(bulletPoint.x, bulletPoint.y, projectile.weaponId === "gun" ? 10 : 12).fill({
    color: weapon.bulletColor,
    alpha: 0.12,
  });
}

function drawProjectileGuide(
  graphics: Graphics,
  player: SnapshotPlayer,
  world: WorldConfig,
) {
  if (!RANGED_WEAPON_IDS.includes(player.equippedWeapon)) {
    graphics.clear();
    return;
  }

  const facing = getFacing(player);
  const weaponId = player.equippedWeapon as ProjectileSnapshot["weaponId"];
  const weapon = WEAPON_COPY[weaponId];
  const projectilePadding = getProjectilePadding(weaponId);
  const start = clampToPlayableBounds(
    world,
    player.x + facing.x * PROJECTILE_GUIDE_OFFSET,
    player.y + facing.y * PROJECTILE_GUIDE_OFFSET,
    projectilePadding,
  );
  const end = clampToPlayableBounds(
    world,
    start.x + facing.x * weapon.range,
    start.y + facing.y * weapon.range,
    projectilePadding,
  );
  const effect = weapon.effect;

  graphics.clear();
  drawTrajectory(
    graphics,
    weaponId,
    effect,
    start,
    end,
    player.action === "attack" ? 0.22 : 0.12,
  );
  drawLandingMarker(
    graphics,
    weaponId,
    effect,
    end,
    player.action === "attack" ? 0.34 : 0.18,
  );
}

export function Projectile({ projectile }: ProjectileProps) {
  return <pixiGraphics draw={(graphics) => drawProjectile(graphics, projectile)} />;
}

export function ProjectileGuide({ player, world }: ProjectileGuideProps) {
  return (
    <pixiGraphics draw={(graphics) => drawProjectileGuide(graphics, player, world)} />
  );
}
