import { useEffect, useMemo, useRef, useState } from "react";

import {
  ROLE_COPY,
  TEAM_COPY,
  WEAPON_COPY,
  getHudKeys,
} from "../../game/config";
import type { SnapshotPayload, SnapshotPlayer } from "../../game/protocol";
import { bodyFontClass, displayFontClass } from "../../styles/styles";
import { InfoPanel } from "../ui/InfoPanel";

type BattleHudProps = {
  authoritativeLocalPlayer?: SnapshotPlayer;
  localPlayer?: SnapshotPlayer;
  snapshot: SnapshotPayload;
  systemMessage?: string;
};

type RankedPlayer = SnapshotPlayer & {
  rank: number;
};

function hexColor(value: number) {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function formatRemainingTime(remainingMs: number) {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function sortPlayersForRanking(players: SnapshotPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.kills !== left.kills) {
      return right.kills - left.kills;
    }

    if (left.deaths !== right.deaths) {
      return left.deaths - right.deaths;
    }

    return left.name.localeCompare(right.name, "zh-Hans-CN");
  });
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[#171412]/10 bg-white/74 px-3 py-2 text-center">
      <p
        className={[
          bodyFontClass,
          "text-[0.62rem] uppercase tracking-[0.26em] text-[#171412]/46",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          displayFontClass,
          "mt-1 text-2xl leading-none text-[#171412]",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export function BattleHud({
  authoritativeLocalPlayer,
  localPlayer,
  snapshot,
  systemMessage,
}: BattleHudProps) {
  const [clockNow, setClockNow] = useState(() =>
    typeof window === "undefined" ? 0 : window.performance.now(),
  );
  const receivedAtRef = useRef(
    typeof window === "undefined" ? 0 : window.performance.now(),
  );
  const rankings = useMemo<RankedPlayer[]>(
    () =>
      sortPlayersForRanking(snapshot.players).map((player, index) => ({
        ...player,
        rank: index + 1,
      })),
    [snapshot.players],
  );
  const teamCounts = useMemo(
    () =>
      snapshot.players.reduce(
        (counts, player) => {
          counts[player.team] += 1;
          return counts;
        },
        { red: 0, blue: 0 },
      ),
    [snapshot.players],
  );

  useEffect(() => {
    receivedAtRef.current =
      typeof window === "undefined" ? 0 : window.performance.now();
  }, [snapshot.serverTime]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const interval = window.setInterval(() => {
      setClockNow(window.performance.now());
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const estimatedServerTime =
    snapshot.serverTime + Math.max(0, clockNow - receivedAtRef.current);
  const remainingMs = Math.max(snapshot.match.endsAt - estimatedServerTime, 0);
  const localStanding = rankings.find((player) => player.id === localPlayer?.id);
  const localRole = localStanding ? ROLE_COPY[localStanding.role] : null;
  const localTeam = localStanding ? TEAM_COPY[localStanding.team] : null;
  const hudKeys = getHudKeys(localPlayer?.role);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-4 p-4 md:p-6">
      <InfoPanel
        className="w-full max-w-[34rem] rounded-[1.8rem] bg-[#f7f4ec]/94 px-5 py-4"
        contentClassName="mt-0"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className={[
                bodyFontClass,
                "text-[0.72rem] uppercase tracking-[0.34em] text-[#171412]/55",
              ].join(" ")}
            >
              计时计分
            </p>
            <div className="mt-2 flex items-end gap-4">
              <h1
                className={[
                  displayFontClass,
                  "text-4xl leading-none text-[#171412] md:text-6xl",
                ].join(" ")}
              >
                {formatRemainingTime(remainingMs)}
              </h1>
              <div
                className={[
                  bodyFontClass,
                  "space-y-1 pb-1 text-[0.7rem] uppercase tracking-[0.26em] text-[#171412]/54",
                ].join(" ")}
              >
                <p>第 {snapshot.match.round} 局</p>
                <p>{snapshot.players.length} 人分队</p>
                <p>
                  红队 {teamCounts.red} · 蓝队 {teamCounts.blue}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatTile label="积分" value={localStanding?.score ?? "--"} />
            <StatTile label="击杀" value={localStanding?.kills ?? "--"} />
            <StatTile label="死亡" value={localStanding?.deaths ?? "--"} />
          </div>
        </div>

        {localStanding ? (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.35rem] border border-[#171412]/12 bg-white/76 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-[#171412]/35"
                  style={{ backgroundColor: hexColor(localStanding.color) }}
                />
                <span
                  className={[
                    displayFontClass,
                    "truncate text-2xl leading-none text-[#171412]",
                  ].join(" ")}
                >
                  {localStanding.name}
                </span>
                <span
                  className={[
                    bodyFontClass,
                    "rounded-full border border-[#171412]/14 px-3 py-1 text-[0.62rem] uppercase tracking-[0.26em] text-[#171412]/54",
                  ].join(" ")}
                >
                  {localRole?.tag ?? ROLE_COPY[localStanding.role].subtitle}
                </span>
                <span
                  className={[
                    bodyFontClass,
                    "rounded-full px-3 py-1 text-[0.62rem] uppercase tracking-[0.22em] text-white",
                  ].join(" ")}
                  style={{ backgroundColor: hexColor(localStanding.color) }}
                >
                  {localTeam?.label}
                </span>
              </div>
              <p
                className={[
                  bodyFontClass,
                  "mt-2 text-sm leading-6 text-[#171412]/68",
                ].join(" ")}
              >
                武器 {WEAPON_COPY[localStanding.equippedWeapon].label} · 生命{" "}
                {authoritativeLocalPlayer?.hp ?? localStanding.hp}/
                {localStanding.maxHp}
              </p>
            </div>

            <div className="text-right">
              <p
                className={[
                  bodyFontClass,
                  "text-[0.68rem] uppercase tracking-[0.28em] text-[#171412]/48",
                ].join(" ")}
              >
                当前排名
              </p>
              <p
                className={[
                  displayFontClass,
                  "mt-1 text-4xl leading-none text-[#171412]",
                ].join(" ")}
              >
                #{localStanding.rank}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p
              className={[
                bodyFontClass,
                "text-[0.68rem] uppercase tracking-[0.3em] text-[#171412]/48",
              ].join(" ")}
            >
              排名 HUD
            </p>
            <p
              className={[
                bodyFontClass,
                "text-sm text-[#171412]/54",
              ].join(" ")}
            >
              击败 +100 分
            </p>
          </div>

          <div className="mt-3 grid gap-2">
            {rankings.slice(0, 5).map((player) => {
              const active = player.id === localStanding?.id;

              return (
                <div
                  className={[
                    "flex items-center gap-3 rounded-[1.2rem] border px-3 py-2 transition",
                    active
                      ? "border-[#171412]/24 bg-white/94"
                      : "border-[#171412]/10 bg-white/72",
                  ].join(" ")}
                  key={player.id}
                >
                  <div className="w-10 shrink-0 text-center">
                    <p
                      className={[
                        displayFontClass,
                        "text-2xl leading-none text-[#171412]",
                      ].join(" ")}
                    >
                      {player.rank}
                    </p>
                  </div>

                  <span
                    className="inline-block h-3 w-3 rounded-full border border-[#171412]/35"
                    style={{ backgroundColor: hexColor(player.color) }}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={[
                        displayFontClass,
                        "truncate text-xl leading-none text-[#171412]",
                      ].join(" ")}
                    >
                      {player.name}
                    </p>
                    <p
                      className={[
                        bodyFontClass,
                        "mt-1 text-sm text-[#171412]/56",
                      ].join(" ")}
                    >
                      {ROLE_COPY[player.role].subtitle} · {TEAM_COPY[player.team].label}
                    </p>
                  </div>

                  <div
                    className={[
                      bodyFontClass,
                      "grid grid-cols-3 gap-3 text-right text-xs uppercase tracking-[0.16em] text-[#171412]/58",
                    ].join(" ")}
                  >
                    <span>{player.score} 分</span>
                    <span>{player.kills} K</span>
                    <span>{player.deaths} D</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </InfoPanel>

      <div className="grid gap-3 sm:min-w-[18rem]">
        <InfoPanel label="连接状态">
          <p
            className={[
              displayFontClass,
              "mt-2 text-2xl leading-none",
            ].join(" ")}
          >
            {systemMessage ?? "已连接"}
          </p>
          {localPlayer ? (
            <>
              <div
                className={[
                  bodyFontClass,
                  "mt-3 flex items-center gap-2 text-sm text-[#171412]/72",
                ].join(" ")}
              >
                <span
                  className="inline-block h-3 w-3 rounded-full border border-[#171412]/40"
                  style={{ backgroundColor: hexColor(localPlayer.color) }}
                />
                <span>{localPlayer.name}</span>
              </div>
              <div
                className={[
                  bodyFontClass,
                  "mt-2 text-sm text-[#171412]/62",
                ].join(" ")}
              >
                {TEAM_COPY[localPlayer.team].label} · 武器{" "}
                {WEAPON_COPY[localPlayer.equippedWeapon].label}
              </div>
              <div
                className={[
                  bodyFontClass,
                  "mt-1 text-sm text-[#171412]/56",
                ].join(" ")}
              >
                坐标 {Math.round(localPlayer.x)}, {Math.round(localPlayer.y)}
              </div>
            </>
          ) : null}
        </InfoPanel>

        <InfoPanel label="操作说明">
          <div className="mt-3 flex flex-wrap gap-2">
            {hudKeys.map((item) => (
              <div
                className="rounded-2xl border border-[#171412]/15 bg-white/70 px-3 py-2"
                key={item.key}
              >
                <p
                  className={[
                    bodyFontClass,
                    "text-[0.62rem] uppercase tracking-[0.28em] text-[#171412]/45",
                  ].join(" ")}
                >
                  {item.label}
                </p>
                <p
                  className={[
                    displayFontClass,
                    "mt-1 text-lg leading-none",
                  ].join(" ")}
                >
                  {item.key}
                </p>
              </div>
            ))}
          </div>
        </InfoPanel>
      </div>
    </div>
  );
}
