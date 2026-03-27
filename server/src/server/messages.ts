import type {
  CardOfferPayload,
  Player,
  ServerMessage,
} from "../game/types";

import type {
  GameSocket,
  RoomAnnouncementPayload,
  RoomSystemLevel,
} from "./types";

export function sendMessage(ws: GameSocket, message: ServerMessage) {
  ws.send(JSON.stringify(message));
}

export function broadcastMessage(
  sockets: Map<string, GameSocket>,
  message: ServerMessage,
) {
  const encoded = JSON.stringify(message);

  for (const ws of sockets.values()) {
    ws.send(encoded);
  }
}

export function sendSystemMessage(
  ws: GameSocket,
  level: RoomSystemLevel,
  message: string,
) {
  sendMessage(ws, {
    type: "system",
    payload: {
      level,
      message,
    },
  });
}

function getPlayerSocket(
  players: Map<string, Player>,
  sockets: Map<string, GameSocket>,
  playerId: string,
) {
  const player = players.get(playerId);

  if (!player) {
    return null;
  }

  return sockets.get(player.socketId) ?? null;
}

export function sendSystemToPlayer(
  players: Map<string, Player>,
  sockets: Map<string, GameSocket>,
  playerId: string,
  level: RoomSystemLevel,
  message: string,
) {
  const ws = getPlayerSocket(players, sockets, playerId);

  if (!ws) {
    return;
  }

  sendSystemMessage(ws, level, message);
}

export function sendAnnouncementToPlayer(
  players: Map<string, Player>,
  sockets: Map<string, GameSocket>,
  playerId: string,
  payload: RoomAnnouncementPayload,
) {
  const ws = getPlayerSocket(players, sockets, playerId);

  if (!ws) {
    return;
  }

  sendMessage(ws, {
    type: "announcement",
    payload: {
      id: crypto.randomUUID(),
      ...payload,
    },
  });
}

export function sendCardOfferToPlayer(
  players: Map<string, Player>,
  sockets: Map<string, GameSocket>,
  playerId: string,
  payload: CardOfferPayload | null,
) {
  const ws = getPlayerSocket(players, sockets, playerId);

  if (!ws) {
    return;
  }

  sendMessage(ws, {
    type: "card-offer",
    payload,
  });
}
