import { useState } from "react";

import { ROLE_COPY, ROLE_ORDER } from "../game/config";
import { GameCanvas } from "../game/GameCanvas";
import {
  DEFAULT_WORLD,
  type Role,
  type SnapshotPayload,
} from "../game/protocol";
import { useGameClient } from "../hook/useGameClient";
import { useKeyboardInput } from "../hook/useKeyboardInput";
import {
  bodyFontClass,
  displayFontClass,
  paperShadowClass,
} from "../styles/styles";

const PREVIEW_SNAPSHOT: SnapshotPayload = {
  serverTime: 0,
  players: [
    {
      action: "idle",
      color: 0xbd4f31,
      equippedWeapon: "knife",
      facing: { x: 1, y: 0 },
      hp: 100,
      id: "preview-warrior",
      lastProcessedSeq: 0,
      maxHp: 100,
      name: "Dog Doing",
      respawnAt: null,
      role: "warrior",
      x: 1040,
      y: 850,
    },
    {
      action: "block",
      color: 0x2e6fd8,
      equippedWeapon: "arow",
      facing: { x: -1, y: 0 },
      hp: 100,
      id: "preview-mage",
      lastProcessedSeq: 0,
      maxHp: 100,
      name: "Hajimi",
      respawnAt: null,
      role: "mage",
      x: 1260,
      y: 850,
    },
    {
      action: "idle",
      color: 0xd9b126,
      equippedWeapon: "gun",
      facing: { x: 0, y: -1 },
      hp: 100,
      id: "preview-bibilabu",
      lastProcessedSeq: 0,
      maxHp: 100,
      name: "Bibilabu",
      respawnAt: null,
      role: "bibilabu",
      x: 1140,
      y: 1020,
    },
  ],
  droppedItems: [
    {
      id: "preview-drop-knife",
      weaponId: "knife",
      x: 880,
      y: 920,
    },
    {
      id: "preview-drop-arow",
      weaponId: "arow",
      x: 1400,
      y: 940,
    },
    {
      id: "preview-drop-gun",
      weaponId: "gun",
      x: 1140,
      y: 700,
    },
  ],
  projectiles: [],
};

function createGuestName() {
  return `DOG-${Math.floor(Math.random() * 900 + 100)}`;
}

function GamePage() {
  const [name] = useState(createGuestName);
  const [selectedRole, setSelectedRole] = useState<Role>("warrior");
  const keyboardInput = useKeyboardInput(true);
  const {
    connect,
    connection,
    disconnect,
    error,
    playerId,
    snapshot,
    status,
    systemMessage,
  } = useGameClient(keyboardInput);
  const selectedRoleInfo = ROLE_COPY[selectedRole];

  const joinArena = (role: Role) => {
    setSelectedRole(role);

    if (status === "connecting") {
      return;
    }

    connect({
      name,
      role,
    });
  };

  if (status === "playing" && snapshot && playerId) {
    return (
      <GameCanvas
        onLeave={() => disconnect()}
        playerId={playerId}
        snapshot={snapshot}
        systemMessage={systemMessage}
        tickRate={connection.tickRate}
        variant="play"
        world={connection.world}
      />
    );
  }

  return (
    <GameCanvas
      overlay={
        <div className="flex min-h-screen items-center justify-center bg-[rgba(20,16,12,0.22)] px-4 py-8">
          <div
            className={[
              paperShadowClass,
              "w-full max-w-[760px] rounded-[2rem] border border-[#171412]/12 bg-[#f7f4ec]/94 p-5 md:p-7",
            ].join(" ")}
          >
            <div className="text-center">
              <p
                className={[
                  bodyFontClass,
                  "text-[0.7rem] uppercase tracking-[0.34em] text-[#171412]/45",
                ].join(" ")}
              >
                choose fighter
              </p>
              <h1
                className={[
                  displayFontClass,
                  "mt-3 text-4xl leading-none md:text-5xl",
                ].join(" ")}
              >
                先选一个角色
              </h1>
              <p
                className={[
                  bodyFontClass,
                  "mt-3 text-sm leading-6 text-[#171412]/62",
                ].join(" ")}
              >
                直接进入场景。点角色就开打，背景只保留二维战场。
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {ROLE_ORDER.map((role) => {
                const roleInfo = ROLE_COPY[role];
                const active = selectedRole === role;

                return (
                  <button
                    className={[
                      "group overflow-hidden rounded-[1.6rem] border bg-white/72 text-left transition",
                      active
                        ? "border-[#171412] shadow-[0_24px_50px_rgba(23,20,18,0.16)]"
                        : "border-[#171412]/12 hover:-translate-y-0.5 hover:border-[#171412]/28",
                      status === "connecting" ? "cursor-wait opacity-80" : "",
                    ].join(" ")}
                    disabled={status === "connecting"}
                    key={role}
                    onClick={() => joinArena(role)}
                    type="button"
                  >
                    <div
                      className={[
                        "aspect-[4/3] overflow-hidden bg-[#ece4d6]",
                        `bg-gradient-to-br ${roleInfo.accentClass}`,
                      ].join(" ")}
                    >
                      <img
                        alt={roleInfo.label}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        src={roleInfo.artSrc}
                      />
                    </div>
                    <div className="px-4 py-4 text-center">
                      <p
                        className={[
                          displayFontClass,
                          "text-3xl leading-none text-[#171412]",
                        ].join(" ")}
                      >
                        {roleInfo.label}
                      </p>
                      <p
                        className={[
                          bodyFontClass,
                          "mt-2 text-[0.68rem] uppercase tracking-[0.26em] text-[#171412]/48",
                        ].join(" ")}
                      >
                        {roleInfo.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p
                className={[
                  bodyFontClass,
                  "text-sm leading-6 text-[#171412]/58",
                ].join(" ")}
              >
                当前代号: {name}
              </p>
              <p
                className={[
                  bodyFontClass,
                  "text-sm leading-6 text-[#171412]/58",
                ].join(" ")}
              >
                {status === "connecting"
                  ? `正在接入 ${selectedRoleInfo.label}`
                  : (error ?? "点击角色直接进入对局")}
              </p>
            </div>
          </div>
        </div>
      }
      playerId={null}
      snapshot={PREVIEW_SNAPSHOT}
      stageBlurred
      systemMessage="choose fighter"
      tickRate={20}
      variant="preview"
      world={DEFAULT_WORLD}
    />
  );
}

export default GamePage;
