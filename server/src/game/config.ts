import type { Role, WeaponId, WorldConfig } from './types'

export const SERVER_CONFIG = {
  hostname: Bun.env.SERVER_HOST ?? Bun.env.HOST ?? '0.0.0.0',
  port: Number(Bun.env.PORT ?? 3001),
  websocketIdleTimeout: 30,
} as const

export const TICK_RATE = 20
export const TICK_MS = 1000 / TICK_RATE

export const WORLD: WorldConfig = {
  width: 2200,
  height: 1600,
  cellSize: 64,
}

export const RESPAWN_PADDING = 160
export const PLAYER_MAX_HP = 100
export const PLAYER_RADIUS = 22
export const BASE_SPEED = 250
export const WEAPON_PICKUP_RADIUS = 28
export const WEAPON_DROP_RESPAWN_MS = 1800
export const BLOCK_SPEED_MULTIPLIER = 0.45
export const ATTACK_RANGE = 118
export const ATTACK_ARC_DOT = 0.2
export const ATTACK_DAMAGE = 22
export const ATTACK_COOLDOWN_MS = 550
export const HURT_STUN_MS = 220
export const ATTACK_ANIMATION_MS = 180
export const RESPAWN_MS = 2600
export const RESPAWN_INVULNERABILITY_MS = 600
export const BLOCK_REACTION_MS = 140
export const ACTION_STATE_MS = 80

export const WEAPON_STATS: Record<
  WeaponId,
  {
    arcHeight: number
    cooldownMs: number
    damage: number
    isRanged: boolean
    projectileRadius: number
    projectileSpeed: number
    range: number
  }
> = {
  knife: {
    arcHeight: 0,
    cooldownMs: ATTACK_COOLDOWN_MS,
    damage: ATTACK_DAMAGE,
    isRanged: false,
    projectileRadius: 0,
    projectileSpeed: 0,
    range: ATTACK_RANGE,
  },
  arow: {
    arcHeight: 120,
    cooldownMs: 860,
    damage: 28,
    isRanged: true,
    projectileRadius: 16,
    projectileSpeed: 720,
    range: 680,
  },
  gun: {
    arcHeight: 0,
    cooldownMs: 320,
    damage: 16,
    isRanged: true,
    projectileRadius: 11,
    projectileSpeed: 1400,
    range: 920,
  },
}

export const PROJECTILE_SPAWN_OFFSET = PLAYER_RADIUS + 18

export const ROLE_COLORS: Record<Role, number> = {
  warrior: 0xbd4f31,
  mage: 0x2e6fd8,
  bibilabu: 0xd9b126,
}
