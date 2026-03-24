import { extend } from "@pixi/react";
import { Graphics } from "pixi.js";

import { RANGED_WEAPON_IDS, WEAPON_COPY } from "../../game/config";
import type { ProjectileSnapshot, SnapshotPlayer } from "../../game/protocol";
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
};

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

function drawTrajectory(
  graphics: Graphics,
  weaponId: ProjectileSnapshot["weaponId"],
  start: Point,
  end: Point,
  alpha = 1,
) {
  const weapon = WEAPON_COPY[weaponId];

  graphics.clear();

  for (let step = 0; step <= 24; step += 1) {
    const progress = step / 24;
    const point = getTrajectoryPoint(weaponId, start, end, progress);

    if (step === 0) {
      graphics.moveTo(point.x, point.y);
      continue;
    }

    graphics.lineTo(point.x, point.y);
  }

  graphics.stroke({
    color: weapon.trailColor,
    alpha,
    width: weaponId === "gun" ? 2.6 : 2,
  });
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

  drawTrajectory(graphics, projectile.weaponId, start, end, 0.18);
  graphics.circle(bulletPoint.x, bulletPoint.y, projectile.weaponId === "gun" ? 5 : 6).fill({
    color: weapon.bulletColor,
    alpha: 0.96,
  });
  graphics.circle(bulletPoint.x, bulletPoint.y, projectile.weaponId === "gun" ? 10 : 12).fill({
    color: weapon.bulletColor,
    alpha: 0.12,
  });
}

function drawProjectileGuide(graphics: Graphics, player: SnapshotPlayer) {
  if (!RANGED_WEAPON_IDS.includes(player.equippedWeapon)) {
    graphics.clear();
    return;
  }

  const facing = getFacing(player);
  const weaponId = player.equippedWeapon as ProjectileSnapshot["weaponId"];
  const weapon = WEAPON_COPY[weaponId];
  const start = {
    x: player.x + facing.x * 36,
    y: player.y + facing.y * 36,
  };
  const end = {
    x: start.x + facing.x * weapon.range,
    y: start.y + facing.y * weapon.range,
  };

  drawTrajectory(
    graphics,
    weaponId,
    start,
    end,
    player.action === "attack" ? 0.22 : 0.12,
  );
}

export function Projectile({ projectile }: ProjectileProps) {
  return <pixiGraphics draw={(graphics) => drawProjectile(graphics, projectile)} />;
}

export function ProjectileGuide({ player }: ProjectileGuideProps) {
  return <pixiGraphics draw={(graphics) => drawProjectileGuide(graphics, player)} />;
}
