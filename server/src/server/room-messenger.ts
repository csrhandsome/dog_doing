import type { ServerMessage } from "../game/types";

import type { RoomGameplayNotifiers } from "./gameplay";
import {
  broadcastMessage,
  sendAnnouncementToPlayer as dispatchAnnouncementToPlayer,
  sendCardOfferToPlayer as dispatchCardOfferToPlayer,
  sendMessage,
  sendSystemMessage,
  sendSystemToPlayer as dispatchSystemToPlayer,
} from "./messages";
import type { GameRoomStore } from "./store";
import type { GameSocket, RoomSystemLevel } from "./types";

export type GameRoomMessenger = {
  broadcast(message: ServerMessage): void;
  gameplayNotifiers: RoomGameplayNotifiers;
  send(ws: GameSocket, message: ServerMessage): void;
  sendSystem(
    ws: GameSocket,
    level: RoomSystemLevel,
    message: string,
  ): void;
};

export function createGameRoomMessenger(
  store: GameRoomStore,
): GameRoomMessenger {
  const sendSystemToPlayer: RoomGameplayNotifiers["sendSystemToPlayer"] = (
    playerId,
    level,
    message,
  ) => {
    dispatchSystemToPlayer(
      store.players,
      store.sockets,
      playerId,
      level,
      message,
    );
  };
  const sendAnnouncementToPlayer: RoomGameplayNotifiers["sendAnnouncementToPlayer"] = (
    playerId,
    payload,
  ) => {
    dispatchAnnouncementToPlayer(
      store.players,
      store.sockets,
      playerId,
      payload,
    );
  };
  const sendCardOfferToPlayer: RoomGameplayNotifiers["sendCardOfferToPlayer"] = (
    playerId,
    payload,
  ) => {
    dispatchCardOfferToPlayer(
      store.players,
      store.sockets,
      playerId,
      payload,
    );
  };

  return {
    broadcast(message) {
      broadcastMessage(store.sockets, message);
    },
    gameplayNotifiers: {
      sendAnnouncementToPlayer,
      sendCardOfferToPlayer,
      sendSystemToPlayer,
    },
    send(ws, message) {
      sendMessage(ws, message);
    },
    sendSystem(ws, level, message) {
      sendSystemMessage(ws, level, message);
    },
  };
}
