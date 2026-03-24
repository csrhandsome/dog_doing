import { Elysia } from "elysia";

import type { GameRoom } from "../server";

export function createServerApi(room: GameRoom) {
  return new Elysia()
    .get("/health", () => room.getHealth())
    .get("/api/debug/players", () => room.getPlayersDebug())
    .get("/api/debug/state", () => room.getStateDebug());
}
