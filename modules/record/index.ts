export type Feeling = "yes" | "no";

export type FeelingAnswer = { cityId: string; feeling: Feeling; at: number };

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const BEST_TIMES_KEY = "flying-worker:best-times";
const FEELINGS_KEY = "flying-worker:feelings";

/** 도시별 최고 클리어 시간과 "기분 좀 풀렸나요?" 답을 브라우저 저장소에 남긴다. */
export function createRecordStore(storage: KeyValueStorage) {
  const read = <T>(key: string, fallback: T): T => {
    const raw = storage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  };
  const write = (key: string, value: unknown) =>
    storage.setItem(key, JSON.stringify(value));

  return {
    getBestTime(cityId: string): number | null {
      return read<Record<string, number>>(BEST_TIMES_KEY, {})[cityId] ?? null;
    },

    saveClearTime(
      cityId: string,
      clearTimeMs: number
    ): { bestMs: number; isNewBest: boolean } {
      const bestTimes = read<Record<string, number>>(BEST_TIMES_KEY, {});
      const previous = bestTimes[cityId];
      if (previous !== undefined && previous <= clearTimeMs) {
        return { bestMs: previous, isNewBest: false };
      }
      write(BEST_TIMES_KEY, { ...bestTimes, [cityId]: clearTimeMs });
      return { bestMs: clearTimeMs, isNewBest: true };
    },

    saveFeeling(cityId: string, feeling: Feeling, at: number): void {
      write(FEELINGS_KEY, [
        ...read<FeelingAnswer[]>(FEELINGS_KEY, []),
        { cityId, feeling, at },
      ]);
    },

    getFeelings(): FeelingAnswer[] {
      return read<FeelingAnswer[]>(FEELINGS_KEY, []);
    },
  };
}
