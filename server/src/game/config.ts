import type { TeamId, WeaponId, WorldConfig } from "./types";

export const SERVER_CONFIG = {
  hostname: Bun.env.SERVER_HOST ?? Bun.env.HOST ?? "0.0.0.0",
  port: Number(Bun.env.PORT ?? 3001),
  websocketIdleTimeout: 30,
} as const;

export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;
export const MATCH_DURATION_MS = 180000;

export const WORLD: WorldConfig = {
  width: 2200,
  height: 1600,
  cellSize: 64,
  playableInset: 224,
};

export const RESPAWN_PADDING = 160;
export const PLAYER_MAX_HP = 100;
export const PLAYER_RADIUS = 22;
export const PLAYER_HURT_RADIUS = 32;
export const BASE_SPEED = 250;
export const WEAPON_PICKUP_RADIUS = 28;
export const WEAPON_DROP_RESPAWN_MS = 1800;
export const CARD_DROP_CHANCE = 1;
export const MAX_PLAYER_CARDS = 3;
export const MIN_PLAYER_MAX_HP = 48;
export const BLOCK_SPEED_MULTIPLIER = 0.45;
export const ATTACK_RANGE = 118;
export const ATTACK_ARC_DOT = 0.2;
export const ATTACK_DAMAGE = 22;
export const ATTACK_COOLDOWN_MS = 550;
export const HURT_STUN_MS = 220;
export const ATTACK_ANIMATION_MS = 180;
export const RESPAWN_MS = 2600;
export const RESPAWN_INVULNERABILITY_MS = 600;
export const BLOCK_REACTION_MS = 140;
export const ACTION_STATE_MS = 80;
export const ICE_SLOW_DURATION_MS = 1800;
export const ICE_SLOW_MULTIPLIER = 0.58;
export const FIRE_BURN_DURATION_MS = 2200;
export const FIRE_BURN_TICK_MS = 550;
export const FIRE_BURN_DAMAGE = 3;
export const SOCCER_BALL_RADIUS = 26;
export const SOCCER_BALL_MAX_SPEED = 960;
export const SOCCER_BALL_FRICTION = 2.9;
export const SOCCER_BALL_BOUNCE_DAMPING = 0.72;
export const SOCCER_BALL_STOP_SPEED = 24;

export const WEAPON_STATS: Record<
  WeaponId,
  {
    arcHeight: number;
    cooldownMs: number;
    damage: number;
    isRanged: boolean;
    projectileEffect: "fire" | "ice" | "normal";
    projectileRadius: number;
    projectileSpeed: number;
    range: number;
  }
> = {
  knife: {
    arcHeight: 0,
    cooldownMs: ATTACK_COOLDOWN_MS,
    damage: ATTACK_DAMAGE,
    isRanged: false,
    projectileEffect: "normal",
    projectileRadius: 0,
    projectileSpeed: 0,
    range: ATTACK_RANGE,
  },
  arow: {
    arcHeight: 120,
    cooldownMs: 860,
    damage: 28,
    isRanged: true,
    projectileEffect: "normal",
    projectileRadius: 16,
    projectileSpeed: 720,
    range: 680,
  },
  gun: {
    arcHeight: 0,
    cooldownMs: 320,
    damage: 16,
    isRanged: true,
    projectileEffect: "normal",
    projectileRadius: 11,
    projectileSpeed: 1400,
    range: 920,
  },
  spear: {
    arcHeight: 0,
    cooldownMs: 620,
    damage: 24,
    isRanged: false,
    projectileEffect: "normal",
    projectileRadius: 0,
    projectileSpeed: 0,
    range: 168,
  },
  hammer: {
    arcHeight: 0,
    cooldownMs: 820,
    damage: 34,
    isRanged: false,
    projectileEffect: "normal",
    projectileRadius: 0,
    projectileSpeed: 0,
    range: 132,
  },
  staff: {
    arcHeight: 72,
    cooldownMs: 580,
    damage: 18,
    isRanged: true,
    projectileEffect: "ice",
    projectileRadius: 13,
    projectileSpeed: 960,
    range: 760,
  },
  "fire-staff": {
    arcHeight: 58,
    cooldownMs: 640,
    damage: 16,
    isRanged: true,
    projectileEffect: "fire",
    projectileRadius: 15,
    projectileSpeed: 920,
    range: 740,
  },
};

export const PROJECTILE_SPAWN_OFFSET = PLAYER_RADIUS + 18;

export const TEAM_COLORS: Record<TeamId, number> = {
  red: 0xc94b42,
  blue: 0x3f74d8,
};
