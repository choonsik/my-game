export type Place = {
  name: string;
  longitude: number;
  latitude: number;
};

export type Flag = {
  id: string;
  /** 플래그가 근처에 있는 유명 장소의 이름 */
  hint: string;
  longitude: number;
  latitude: number;
  acquired: boolean;
};

export type Round = {
  flags: Flag[];
  startedAt: number;
  clearedAt: number | null;
};

export const FLAGS_PER_ROUND = 5;
export const HIDE_RADIUS_METERS = 300;

const METERS_PER_DEGREE_LAT = 111_320;

/** 판마다 유명 장소를 무작위로 골라, 각 장소 반경 안의 무작위 지점에 플래그를 하나씩 숨긴다. */
export function startRound({
  places,
  startedAt,
  random = Math.random,
}: {
  places: Place[];
  startedAt: number;
  random?: () => number;
}): Round {
  const pool = [...places];
  const chosen: Place[] = [];
  while (chosen.length < FLAGS_PER_ROUND && pool.length > 0) {
    chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  const flags = chosen.map((place, index) => {
    // 원판 안에서 고르게 퍼지도록 반지름에 제곱근을 쓴다.
    const distance = HIDE_RADIUS_METERS * Math.sqrt(random());
    const angle = 2 * Math.PI * random();
    const dLat = (distance * Math.cos(angle)) / METERS_PER_DEGREE_LAT;
    const dLon =
      (distance * Math.sin(angle)) /
      (METERS_PER_DEGREE_LAT * Math.cos((place.latitude * Math.PI) / 180));
    return {
      id: `flag-${index}`,
      hint: place.name,
      latitude: place.latitude + dLat,
      longitude: place.longitude + dLon,
      acquired: false,
    };
  });

  return { flags, startedAt, clearedAt: null };
}

/** 플래그를 획득한다. 이미 획득했거나 클리어한 판은 바뀌지 않는다. */
export function acquireFlag(round: Round, flagId: string, at: number): Round {
  const target = round.flags.find((flag) => flag.id === flagId);
  if (!target || target.acquired || round.clearedAt !== null) return round;

  const flags = round.flags.map((flag) =>
    flag.id === flagId ? { ...flag, acquired: true } : flag
  );
  const cleared = flags.every((flag) => flag.acquired);
  return { ...round, flags, clearedAt: cleared ? at : null };
}

export function acquiredCount(round: Round): number {
  return round.flags.filter((flag) => flag.acquired).length;
}

/** 비행 시작부터 마지막 플래그 획득까지 걸린 시간. 아직 클리어하지 않았으면 null. */
export function clearTimeMs(round: Round): number | null {
  return round.clearedAt === null ? null : round.clearedAt - round.startedAt;
}
