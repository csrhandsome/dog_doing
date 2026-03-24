import { Elysia } from "elysia";

import type { GameRoom } from "../server";

export function createGameWs(room: GameRoom) {
  return new Elysia().ws("/ws", {
    open(ws) {
      room.handleOpen(ws);
    },
    message(ws, rawMessage) {
      room.handleMessage(ws, rawMessage);
    },
    close(ws) {
      room.handleClose(ws);
    },
  });
}
