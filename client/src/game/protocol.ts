export type Role = 'warrior' | 'mage'

export type PlayerAction = 'idle' | 'move' | 'attack' | 'block' | 'hurt' | 'dead'

export type WorldConfig = {
  width: number
  height: number
  cellSize: number
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

export type SnapshotPlayer = {
  id: string
  name: string
  role: Role
  color: number
  x: number
  y: number
  hp: number
  maxHp: number
  facing: {
    x: number
    y: number
  }
  action: PlayerAction
  lastProcessedSeq: number
  respawnAt: number | null
}

export type SnapshotPayload = {
  serverTime: number
  players: SnapshotPlayer[]
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
}
