import hajimiArt from '../assets/hajimi.png'
import dogdoingArt from '../assets/dogdoing.png'
import bibilabuArt from '../assets/bibilabu.png'
import arowArt from '../assets/weapon/arow.png'
import gunArt from '../assets/weapon/gun.png'
import knifeArt from '../assets/weapon/knife.png'
import type { Role, WeaponId } from './protocol'

export const ROLE_ORDER: Role[] = ['warrior', 'mage', 'bibilabu']

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
    subtitle: 'Frontline pressure',
    accentClass: 'from-[#b45030]/20 via-[#b45030]/8 to-transparent',
    tag: 'steel / rush',
    summary: '更厚实的正面压制感。适合贴脸打断与逼位。',
    spriteScale: 0.22,
    notes: ['攻击轮廓偏硬朗', '格挡正面更可靠', '近战压迫感更强'],
  },
  mage: {
    artSrc: hajimiArt,
    label: 'Hajimi',
    subtitle: 'Mobile duelist',
    accentClass: 'from-[#2e6fd8]/20 via-[#2e6fd8]/8 to-transparent',
    tag: 'ink / orbit',
    summary: '更轻、更灵动的纸面游斗感。适合边走边卡角度。',
    spriteScale: 0.145,
    notes: ['轮廓更圆润', '移动姿态更轻', '视觉上更醒目'],
  },
  bibilabu: {
    artSrc: bibilabuArt,
    label: 'Bibilabu',
    subtitle: 'Oddball skirmisher',
    accentClass: 'from-[#d2b020]/28 via-[#d2b020]/12 to-transparent',
    tag: 'banana / trick',
    summary: '怪得很对。视觉更抓眼，适合拿远程武器拉扯和骚扰。',
    spriteScale: 0.165,
    notes: ['轮廓最离谱', '冲进场里会立刻被看到', '拿枪和弓都更有戏'],
  },
}

export const WEAPON_ORDER: WeaponId[] = ['knife', 'arow', 'gun']

export const WEAPON_COPY: Record<
  WeaponId,
  {
    artSrc: string
    arcHeight: number
    bulletColor: number
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
    isRanged: false,
    label: 'Knife',
    pickupScale: 0.18,
    range: 118,
    spriteScale: 0.14,
    trailColor: 0xb45030,
  },
  arow: {
    artSrc: arowArt,
    arcHeight: 120,
    bulletColor: 0xc48f2c,
    isRanged: true,
    label: 'Arow',
    pickupScale: 0.17,
    range: 680,
    spriteScale: 0.125,
    trailColor: 0xd4b657,
  },
  gun: {
    artSrc: gunArt,
    arcHeight: 0,
    bulletColor: 0x171412,
    isRanged: true,
    label: 'Gun',
    pickupScale: 0.16,
    range: 920,
    spriteScale: 0.115,
    trailColor: 0x3a3a3a,
  },
}

export const RANGED_WEAPON_IDS = WEAPON_ORDER.filter(
  (weaponId) => WEAPON_COPY[weaponId].isRanged,
)

export const HUD_KEYS = [
  { key: 'WASD', label: 'Move' },
  { key: 'J', label: 'Attack' },
  { key: 'K', label: 'Guard' },
]
