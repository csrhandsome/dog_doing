import type { WorldConfig } from "./protocol";

const VISUAL_WORLD_EDGE_PADDING = 22;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getPlayableBounds(world: WorldConfig, padding = 0) {
  return {
    minX: world.playableInset + padding,
    maxX: world.width - world.playableInset - padding,
    minY: world.playableInset + padding,
    maxY: world.height - world.playableInset - padding,
  };
}

export function clampToPlayableBounds(
  world: WorldConfig,
  x: number,
  y: number,
  padding = 0,
) {
  const bounds = getPlayableBounds(world, padding);

  return {
    x: clamp(x, bounds.minX, bounds.maxX),
    y: clamp(y, bounds.minY, bounds.maxY),
  };
}

export function getPitchBounds(world: WorldConfig, padding = 0) {
  const margin = VISUAL_WORLD_EDGE_PADDING;
  const trackWidth = world.cellSize * 1.08;
  const fieldInset = margin + trackWidth;
  const outerWidth = world.width - margin * 2;
  const outerHeight = world.height - margin * 2;
  const fieldX = fieldInset;
  const fieldY = fieldInset;
  const fieldWidth = world.width - fieldInset * 2;
  const fieldHeight = world.height - fieldInset * 2;

  return {
    centerX: world.width / 2,
    centerY: world.height / 2,
    fieldHeight,
    fieldWidth,
    fieldX,
    fieldY,
    goalBoxHeight: world.cellSize * 2.36,
    goalBoxWidth: world.cellSize * 1.12,
    maxX: fieldX + fieldWidth - padding,
    maxY: fieldY + fieldHeight - padding,
    minX: fieldX + padding,
    minY: fieldY + padding,
    outerHeight,
    outerWidth,
    outerX: margin,
    outerY: margin,
    penaltyBoxHeight: world.cellSize * 4.9,
    penaltyBoxWidth: world.cellSize * 2.4,
    trackWidth,
  };
}
