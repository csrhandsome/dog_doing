import type {
  CardOfferPayload,
  ServerAnnouncementMessage,
  WeaponId,
} from "../game/types";

export type PendingDroppedWeapon = {
  respawnAt: number;
  weaponId: WeaponId;
};

export type PendingCardOffer = CardOfferPayload & {
  createdAt: number;
  playerId: string;
};

export type GameSocket = {
  readonly id: string;
  send(data: string): unknown;
};

export type RoomSystemLevel = "info" | "warn";

export type RoomAnnouncementPayload = Omit<
  ServerAnnouncementMessage["payload"],
  "id"
>;
