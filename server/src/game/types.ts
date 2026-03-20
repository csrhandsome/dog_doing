export type Role = 'warrior' | 'mage'

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

export type ServerSnapshotMessage = {
  type: 'snapshot'
  payload: {
    serverTime: number
    players: PlayerSnapshot[]
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
