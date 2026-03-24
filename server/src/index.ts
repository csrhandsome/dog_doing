import { websocket } from "elysia/ws";

import { createApp } from "./app";
import { SERVER_CONFIG } from "./game/config";
import { GameRoom } from "./server/server";

const room = new GameRoom();
const app = createApp(room);

app.listen({
  hostname: SERVER_CONFIG.hostname,
  port: SERVER_CONFIG.port,
  websocket: {
    ...websocket,
    idleTimeout: SERVER_CONFIG.websocketIdleTimeout,
  },
});

room.start();

const displayHost =
  SERVER_CONFIG.hostname === "0.0.0.0" ? "127.0.0.1" : SERVER_CONFIG.hostname;
const displayPort = app.server?.port ?? SERVER_CONFIG.port;

console.log(
  `dog-doing server listening on http://${displayHost}:${displayPort}`,
);
console.log(
  `websocket endpoint available at ws://${displayHost}:${displayPort}/ws`,
);
