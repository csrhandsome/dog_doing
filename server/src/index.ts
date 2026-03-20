import { createApp } from './app'
import { SERVER_CONFIG } from './game/config'
import { GameRoom } from './game/room'

const room = new GameRoom()
const app = createApp(room)

const server = app.listen({
  hostname: SERVER_CONFIG.hostname,
  port: SERVER_CONFIG.port,
  websocket: {
    idleTimeout: SERVER_CONFIG.websocketIdleTimeout,
  },
})

room.start()

console.log(`dog-doing server listening on ws://localhost:${server.port}/ws`)
