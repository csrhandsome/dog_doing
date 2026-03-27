export type Role = 'warrior' | 'mage' | 'bibilabu'
export type TeamId = 'red' | 'blue'

export type WeaponId =
  | 'knife'
  | 'arow'
  | 'gun'
  | 'spear'
  | 'hammer'
  | 'staff'
  | 'fire-staff'

export type RangedWeaponId = 'arow' | 'gun' | 'staff' | 'fire-staff'
export type ProjectileEffect = 'normal' | 'ice' | 'fire'

export type CardId = string
export type CardPolarity = 'boon' | 'chaos' | 'hex'

export type PlayerAction =
  | 'idle'
  | 'move'
  | 'attack'
  | 'block'
  | 'hurt'
  | 'dead'
  | 'dash'

export type MatchSnapshot = {
  durationMs: number
  endsAt: number
  remainingMs: number
  round: number
}

export type WorldConfig = {
  width: number
  height: number
  cellSize: number
  playableInset: number
}

export type InputButtons = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  attack: boolean
  block: boolean
}

export type ClientInputPayload = InputButtons & {
  seq: number
}

export type ClientJoinPayload = {
  name: string
  role: Role
}

export type ClientChooseCardPayload = {
  cardId: CardId
  offerId: string
}

export type PlayerCard = {
  cardId: CardId
  obtainedAt: number
}

export type SnapshotPlayer = {
  cards: PlayerCard[]
  dashChargeRatio: number
  dashCooldownUntil: number
  dashTrailUntil: number
  id: string
  name: string
  role: Role
  team: TeamId
  equippedWeapon: WeaponId
  color: number
  x: number
  y: number
  hp: number
  maxHp: number
  frozenUntil: number
  burningUntil: number
  facing: {
    x: number
    y: number
  }
  action: PlayerAction
  deaths: number
  kills: number
  lastProcessedSeq: number
  respawnAt: number | null
  score: number
}

export type DroppedItemSnapshot = {
  id: string
  weaponId: WeaponId
  x: number
  y: number
}

export type CardOfferOption = {
  cardId: CardId
  description: string
  label: string
  polarity: CardPolarity
  summary: string
}

export type CardOfferPayload = {
  offerId: string
  options: CardOfferOption[]
}

export type SoccerBallSnapshot = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  lastTouchedByPlayerId: string | null
}

export type AnnouncementPayload = {
  id: string
  kind: 'kill' | 'streak' | 'revenge'
  title: string
  subtitle: string
  badge: string
  tone: 'gold' | 'crimson' | 'cobalt'
}

export type ProjectileSnapshot = {
  id: string
  ownerId: string
  weaponId: RangedWeaponId
  x: number
  y: number
  startX: number
  startY: number
  endX: number
  endY: number
  effect: ProjectileEffect
  spawnedAt: number
  expiresAt: number
}

export type SnapshotPayload = {
  match: MatchSnapshot
  serverTime: number
  soccerBall: SoccerBallSnapshot | null
  players: SnapshotPlayer[]
  droppedItems: DroppedItemSnapshot[]
  projectiles: ProjectileSnapshot[]
}

export type ServerMessage =
  | {
      type: 'joined'
      payload: {
        playerId: string
        tickRate: number
        world: WorldConfig
      }
    }
  | {
      type: 'snapshot'
      payload: SnapshotPayload
    }
  | {
      type: 'system'
      payload: {
        level: 'info' | 'warn'
        message: string
      }
    }
  | {
      type: 'announcement'
      payload: AnnouncementPayload
    }
  | {
      type: 'card-offer'
      payload: CardOfferPayload | null
    }

export const EMPTY_INPUT: InputButtons = {
  up: false,
  down: false,
  left: false,
  right: false,
  attack: false,
  block: false,
}

export const DEFAULT_WORLD: WorldConfig = {
  width: 2200,
  height: 1600,
  cellSize: 64,
  playableInset: 224,
}
