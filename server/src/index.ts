import { websocket } from "elysia/ws";

import { createApp } from "./app";
import { SERVER_CONFIG } from "./game/config";
import { acquireServerRuntimeInfo } from "./server/runtime";
import { GameRoom } from "./server/server";

const runtime = acquireServerRuntimeInfo(SERVER_CONFIG.port);
const room = new GameRoom(runtime);
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
console.log(
  `instance ${runtime.instanceId} pid=${runtime.pid} hostname=${runtime.hostname}${
    runtime.lockPath ? ` lock=${runtime.lockPath}` : " lock=disabled"
  }`,
);
