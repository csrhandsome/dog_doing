import hajimiArt from '../assets/hajimi.png'
import dogdoingArt from '../assets/dogdoing.png'
import type { Role } from './protocol'

export const ROLE_ORDER: Role[] = ['warrior', 'mage']

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
}

export const HUD_KEYS = [
  { key: 'WASD', label: 'Move' },
  { key: 'J', label: 'Attack' },
  { key: 'K', label: 'Guard' },
]
