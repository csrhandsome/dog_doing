import { Elysia } from 'elysia'

import type { GameRoom } from './game/room'

export function createApp(room: GameRoom) {
  return new Elysia()
    .get('/health', () => room.getHealth())
    .ws('/ws', {
      open(ws) {
        room.handleOpen(ws)
      },
      message(ws, rawMessage) {
        room.handleMessage(ws, rawMessage)
      },
      close(ws) {
        room.handleClose(ws)
      },
    })
}
