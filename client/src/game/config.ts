import hajimiArt from '../assets/hajimi.png'
import dogdoingArt from '../assets/dogdoing.png'
import bibilabuArt from '../assets/bibilabu.png'
import goalArt from '../assets/field/goal.png'
import soccerBallArt from '../assets/field/soccer-ball.png'
import arowArt from '../assets/weapon/arow.png'
import gunArt from '../assets/weapon/gun.png'
import hammerArt from '../assets/weapon/hammer.png'
import knifeArt from '../assets/weapon/knife.png'
import fireStaffArt from '../assets/weapon/fire-staff.png'
import shieldArt from '../assets/weapon/shield.png'
import spearArt from '../assets/weapon/spear.png'
import staffArt from '../assets/weapon/staff.png'
import type { ProjectileEffect, Role, TeamId, WeaponId } from './protocol'

export const ROLE_ORDER: Role[] = ['warrior', 'mage', 'bibilabu']

export const TEAM_COPY: Record<
  TeamId,
  {
    color: number
    label: string
    shortLabel: string
  }
> = {
  red: {
    color: 0xc94b42,
    label: '红队',
    shortLabel: 'RED',
  },
  blue: {
    color: 0x3f74d8,
    label: '蓝队',
    shortLabel: 'BLUE',
  },
}

export const ROLE_COPY: Record<
  Role,
  {
    artSrc: string
    label: string
    accentClass: string
    summary: string
    spriteScale: number
    subtitle: string
    tag: string
    notes: string[]
  }
> = {
  warrior: {
    artSrc: dogdoingArt,
    label: 'Dog Doing',
    subtitle: '前线压制',
    accentClass: 'from-[#b45030]/20 via-[#b45030]/8 to-transparent',
    tag: '钢铁 / 强攻',
    summary: '更厚实的正面压制感。适合贴脸打断与逼位。',
    spriteScale: 0.22,
    notes: ['攻击轮廓偏硬朗', '格挡正面更可靠', '近战压迫感更强'],
  },
  mage: {
    artSrc: hajimiArt,
    label: 'Hajimi',
    subtitle: '机动决斗',
    accentClass: 'from-[#2e6fd8]/20 via-[#2e6fd8]/8 to-transparent',
    tag: '墨影 / 绕切',
    summary: '更轻、更灵动的纸面游斗感。适合边走边卡角度。',
    spriteScale: 0.145,
    notes: ['轮廓更圆润', '移动姿态更轻', '视觉上更醒目'],
  },
  bibilabu: {
    artSrc: bibilabuArt,
    label: 'Bibilabu',
    subtitle: '怪招游击',
    accentClass: 'from-[#d2b020]/28 via-[#d2b020]/12 to-transparent',
    tag: '香蕉 / 怪招',
    summary: '怪得很对。视觉更抓眼，适合拿远程武器拉扯和骚扰。',
    spriteScale: 0.165,
    notes: ['轮廓最离谱', '冲进场里会立刻被看到', '拿枪和弓都更有戏'],
  },
}

export const WEAPON_ORDER: WeaponId[] = [
  'knife',
  'arow',
  'gun',
  'spear',
  'hammer',
  'staff',
  'fire-staff',
]

export const WEAPON_COPY: Record<
  WeaponId,
  {
    artSrc: string
    arcHeight: number
    bulletColor: number
    effect: ProjectileEffect
    isRanged: boolean
    label: string
    pickupScale: number
    range: number
    spriteScale: number
    trailColor: number
  }
> = {
  knife: {
    artSrc: knifeArt,
    arcHeight: 0,
    bulletColor: 0xbd4f31,
    effect: 'normal',
    isRanged: false,
    label: '小刀',
    pickupScale: 0.18,
    range: 118,
    spriteScale: 0.14,
    trailColor: 0xb45030,
  },
  arow: {
    artSrc: arowArt,
    arcHeight: 120,
    bulletColor: 0xc48f2c,
    effect: 'normal',
    isRanged: true,
    label: '弓箭',
    pickupScale: 0.17,
    range: 680,
    spriteScale: 0.125,
    trailColor: 0xd4b657,
  },
  gun: {
    artSrc: gunArt,
    arcHeight: 0,
    bulletColor: 0x171412,
    effect: 'normal',
    isRanged: true,
    label: '枪',
    pickupScale: 0.16,
    range: 920,
    spriteScale: 0.115,
    trailColor: 0x3a3a3a,
  },
  spear: {
    artSrc: spearArt,
    arcHeight: 0,
    bulletColor: 0x98a4b6,
    effect: 'normal',
    isRanged: false,
    label: '长枪',
    pickupScale: 0.175,
    range: 168,
    spriteScale: 0.13,
    trailColor: 0xcfd8e8,
  },
  hammer: {
    artSrc: hammerArt,
    arcHeight: 0,
    bulletColor: 0xb28b49,
    effect: 'normal',
    isRanged: false,
    label: '战锤',
    pickupScale: 0.178,
    range: 132,
    spriteScale: 0.128,
    trailColor: 0xe1c27a,
  },
  staff: {
    artSrc: staffArt,
    arcHeight: 72,
    bulletColor: 0x71d5ff,
    effect: 'ice',
    isRanged: true,
    label: '冰杖',
    pickupScale: 0.17,
    range: 760,
    spriteScale: 0.125,
    trailColor: 0x9ddfff,
  },
  'fire-staff': {
    artSrc: fireStaffArt,
    arcHeight: 58,
    bulletColor: 0xffb067,
    effect: 'fire',
    isRanged: true,
    label: '火杖',
    pickupScale: 0.172,
    range: 740,
    spriteScale: 0.127,
    trailColor: 0xff5526,
  },
}

export const RANGED_WEAPON_IDS = WEAPON_ORDER.filter(
  (weaponId) => WEAPON_COPY[weaponId].isRanged,
)

export const SHIELD_ROLE: Role = 'warrior'
export const SHIELD_ART_SRC = shieldArt
export const SOCCER_BALL_ART_SRC = soccerBallArt
export const GOAL_ART_SRC = goalArt

export function canRoleUseShield(role: Role | null | undefined) {
  return role === SHIELD_ROLE
}

const BASE_HUD_KEYS = [
  { key: 'WASD', label: '移动' },
  { key: 'J', label: '攻击' },
]

const SHIELD_HUD_KEY = { key: 'K', label: '举盾防御' }

export function getHudKeys(role: Role | null | undefined) {
  return canRoleUseShield(role)
    ? [...BASE_HUD_KEYS, SHIELD_HUD_KEY]
    : BASE_HUD_KEYS
}
