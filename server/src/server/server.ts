import { TICK_MS, TICK_RATE, WORLD } from "../game/config";
import type { Role } from "../game/types";

import { parseClientMessage, toInputState } from "./core";
import { resolveCardSelection } from "./gameplay";
import {
  connectSocket,
  disconnectSocket,
  getSocketPlayer,
  initializeMatch,
  joinPlayer,
  stepGameRoom,
} from "./room-lifecycle";
import { createGameRoomMessenger } from "./room-messenger";
import { createPlayersDebug, createSnapshot, createStateDebug } from "./snapshots";
import { createGameRoomStore } from "./store";
import type { ServerRuntimeInfo } from "./runtime";
import type { GameSocket } from "./types";

export type { GameSocket } from "./types";

export class GameRoom {
  private readonly store = createGameRoomStore();
  private interval: ReturnType<typeof setInterval> | null = null;
  private readonly messenger = createGameRoomMessenger(this.store);

  constructor(private readonly runtime: ServerRuntimeInfo) {}

  getHealth() {
    return {
      ok: true,
      running: this.isRunning(),
      players: this.store.players.size,
      sockets: this.store.sockets.size,
      tickRate: TICK_RATE,
      instance: this.runtime,
    };
  }

  getPlayersDebug(now = Date.now()) {
    return createPlayersDebug(this.store, this.runtime, now);
  }

  getStateDebug(now = Date.now()) {
    return createStateDebug(this.store, this.runtime, this.isRunning(), now);
  }

  start() {
    if (this.isRunning()) {
      return;
    }

    initializeMatch(this.store, Date.now());
    this.interval = setInterval(() => {
      this.tick();
    }, TICK_MS);
  }

  stop() {
    if (!this.interval) {
      return;
    }

    clearInterval(this.interval);
    this.interval = null;
  }

  handleOpen(ws: GameSocket) {
    connectSocket(this.store, ws);
    this.messenger.sendSystem(ws, "info", "已建立连接");
  }

  handleMessage(ws: GameSocket, rawMessage: unknown) {
    const message = parseClientMessage(rawMessage);

    if (!message) {
      this.messenger.sendSystem(ws, "warn", "消息格式无效");
      return;
    }

    if (message.type === "join") {
      this.handleJoin(ws, message.payload.name, message.payload.role);
      return;
    }

    const lookup = getSocketPlayer(this.store, ws.id);

    if (lookup.state === "missing") {
      this.messenger.sendSystem(ws, "warn", "请先加入对局");
      return;
    }

    if (lookup.state === "stale") {
      return;
    }

    if (message.type === "choose-card") {
      const now = Date.now();

      resolveCardSelection(
        this.store,
        lookup.player,
        message.payload.offerId,
        message.payload.cardId,
        now,
        this.messenger.gameplayNotifiers,
      );
      this.broadcastSnapshot(now);
      return;
    }

    lookup.player.input = toInputState(message.payload);
  }

  handleClose(ws: GameSocket) {
    if (disconnectSocket(this.store, ws.id)) {
      this.broadcastSnapshot();
    }
  }

  private handleJoin(ws: GameSocket, name: string, role: Role) {
    const player = joinPlayer(this.store, ws.id, name, role);

    this.messenger.send(ws, {
      type: "joined",
      payload: {
        playerId: player.id,
        tickRate: TICK_RATE,
        world: WORLD,
      },
    });
    this.messenger.sendSystem(
      ws,
      "info",
      `已自动分配到${player.team === "red" ? "红队" : "蓝队"}`,
    );

    this.broadcastSnapshot();
  }

  private tick() {
    const now = Date.now();
    stepGameRoom(this.store, now, this.messenger.gameplayNotifiers);
    this.broadcastSnapshot(now);
  }

  private isRunning() {
    return this.interval !== null;
  }

  private broadcastSnapshot(now = Date.now()) {
    this.messenger.broadcast(createSnapshot(this.store, now));
  }
}
