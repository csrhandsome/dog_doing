export type Role = 'warrior' | 'mage' | 'bibilabu'

export type WeaponId = 'knife' | 'arow' | 'gun'

export type Vector = {
  x: number
  y: number
}

export type WorldConfig = {
  width: number
  height: number
  cellSize: number
}

export type InputState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  attack: boolean
  block: boolean
  seq: number
}

export type PlayerAction = 'idle' | 'move' | 'attack' | 'block' | 'hurt' | 'dead'

export type Player = {
  id: string
  socketId: string
  name: string
  role: Role
  equippedWeapon: WeaponId
  color: number
  x: number
  y: number
  facing: Vector
  hp: number
  maxHp: number
  radius: number
  speed: number
  action: PlayerAction
  actionUntil: number
  input: InputState
  previousButtons: {
    attack: boolean
  }
  attackCooldownUntil: number
  invulnerableUntil: number
  respawnAt: number | null
  lastProcessedSeq: number
}

export type DroppedItem = {
  id: string
  weaponId: WeaponId
  x: number
  y: number
}

export type Projectile = {
  id: string
  ownerId: string
  weaponId: Exclude<WeaponId, 'knife'>
  x: number
  y: number
  startX: number
  startY: number
  endX: number
  endY: number
  direction: Vector
  speed: number
  damage: number
  radius: number
  spawnedAt: number
  expiresAt: number
}

export type ClientJoinMessage = {
  type: 'join'
  payload: {
    name: string
    role: Role
  }
}

export type ClientInputMessage = {
  type: 'input'
  payload: InputState
}

export type ClientMessage = ClientJoinMessage | ClientInputMessage

export type ServerJoinedMessage = {
  type: 'joined'
  payload: {
    playerId: string
    tickRate: number
    world: WorldConfig
  }
}

export type PlayerSnapshot = {
  id: string
  name: string
  role: Role
  equippedWeapon: WeaponId
  color: number
  x: number
  y: number
  hp: number
  maxHp: number
  facing: Vector
  action: PlayerAction
  lastProcessedSeq: number
  respawnAt: number | null
}

export type DroppedItemSnapshot = {
  id: string
  weaponId: WeaponId
  x: number
  y: number
}

export type ProjectileSnapshot = {
  id: string
  ownerId: string
  weaponId: Exclude<WeaponId, 'knife'>
  x: number
  y: number
  startX: number
  startY: number
  endX: number
  endY: number
  spawnedAt: number
  expiresAt: number
}

export type ServerSnapshotMessage = {
  type: 'snapshot'
  payload: {
    serverTime: number
    players: PlayerSnapshot[]
    droppedItems: DroppedItemSnapshot[]
    projectiles: ProjectileSnapshot[]
  }
}

export type ServerSystemMessage = {
  type: 'system'
  payload: {
    level: 'info' | 'warn'
    message: string
  }
}

export type ServerMessage = ServerJoinedMessage | ServerSnapshotMessage | ServerSystemMessage
