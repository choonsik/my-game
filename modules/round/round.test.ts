import { describe, expect, it } from "vitest";

import {
  acquireFlag,
  acquiredCount,
  clearTimeMs,
  startRound,
  type Place,
} from "@/modules/round";

// 파리 중심부의 실제 유명 장소 8곳
const places: Place[] = [
  { name: "에펠탑", latitude: 48.8584, longitude: 2.2945 },
  { name: "개선문", latitude: 48.8738, longitude: 2.295 },
  { name: "루브르 박물관", latitude: 48.8606, longitude: 2.3376 },
  { name: "노트르담 대성당", latitude: 48.853, longitude: 2.3499 },
  { name: "콩코르드 광장", latitude: 48.8656, longitude: 2.3212 },
  { name: "앵발리드", latitude: 48.8559, longitude: 2.3125 },
  { name: "오르세 미술관", latitude: 48.86, longitude: 2.3266 },
  { name: "오페라 가르니에", latitude: 48.872, longitude: 2.3316 },
];

// 테스트가 독립적으로 계산하는 대권 거리(m)
function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// 재현 가능한 난수열 (mulberry32)
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("한 판 시작", () => {
  it("플래그 5개를 서로 다른 유명 장소에 하나씩 숨긴다", () => {
    const round = startRound({ places, startedAt: 0, random: seeded(1) });

    expect(round.flags).toHaveLength(5);
    expect(new Set(round.flags.map((flag) => flag.hint)).size).toBe(5);
    expect(round.flags.every((flag) => !flag.acquired)).toBe(true);
  });

  it("힌트는 그 플래그가 반경 300m 안에 있는 유명 장소의 이름이다", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const round = startRound({ places, startedAt: 0, random: seeded(seed) });
      for (const flag of round.flags) {
        const place = places.find((p) => p.name === flag.hint);
        expect(place).toBeDefined();
        expect(haversineMeters(flag, place!)).toBeLessThanOrEqual(300);
      }
    }
  });

  it("판마다 유명 장소 조합과 플래그 위치가 달라진다", () => {
    const first = startRound({ places, startedAt: 0 });
    const second = startRound({ places, startedAt: 0 });

    const positions = (round: typeof first) =>
      round.flags.map((f) => `${f.latitude},${f.longitude}`);
    expect(positions(second)).not.toEqual(positions(first));

    const combinations = new Set(
      Array.from({ length: 20 }, () =>
        startRound({ places, startedAt: 0 })
          .flags.map((f) => f.hint)
          .sort()
          .join("|")
      )
    );
    expect(combinations.size).toBeGreaterThan(1);
  });
});

describe("플래그 획득과 클리어", () => {
  it("획득하면 그 플래그가 획득됨으로 바뀌고 획득 개수가 늘어난다", () => {
    const round = startRound({ places, startedAt: 1000, random: seeded(7) });
    const [first] = round.flags;

    const next = acquireFlag(round, first.id, 2000);

    expect(next.flags.find((f) => f.id === first.id)?.acquired).toBe(true);
    expect(acquiredCount(next)).toBe(1);
    expect(acquiredCount(round)).toBe(0);
  });

  it("이미 획득한 플래그는 다시 획득되지 않는다", () => {
    const round = startRound({ places, startedAt: 1000, random: seeded(7) });
    const id = round.flags[0].id;

    const once = acquireFlag(round, id, 2000);
    const twice = acquireFlag(once, id, 3000);

    expect(acquiredCount(twice)).toBe(1);
  });

  it("마지막 플래그를 획득하는 순간 클리어되고, 클리어 시간은 시작부터 마지막 획득까지다", () => {
    let round = startRound({ places, startedAt: 10_000, random: seeded(3) });
    const ids = round.flags.map((f) => f.id);

    ids.slice(0, 4).forEach((id, i) => {
      round = acquireFlag(round, id, 20_000 + i * 1000);
    });
    expect(clearTimeMs(round)).toBeNull();

    round = acquireFlag(round, ids[4], 95_500);
    expect(clearTimeMs(round)).toBe(85_500);
  });

  it("클리어한 뒤의 획득 시도는 클리어 시간을 바꾸지 않는다", () => {
    let round = startRound({ places, startedAt: 0, random: seeded(3) });
    for (const flag of round.flags) round = acquireFlag(round, flag.id, 60_000);

    const after = acquireFlag(round, round.flags[0].id, 90_000);

    expect(clearTimeMs(after)).toBe(60_000);
  });
});
