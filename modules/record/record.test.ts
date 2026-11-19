import { describe, expect, it } from "vitest";

import { createRecordStore, type KeyValueStorage } from "@/modules/record";

// 브라우저 저장소 경계를 대신하는 메모리 저장소
function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("최고 클리어 시간", () => {
  it("기록이 없는 도시는 기록 없음이다", () => {
    const store = createRecordStore(memoryStorage());

    expect(store.getBestTime("paris")).toBeNull();
  });

  it("첫 클리어 시간은 최고 기록이 된다", () => {
    const store = createRecordStore(memoryStorage());

    expect(store.saveClearTime("paris", 300_000)).toEqual({
      bestMs: 300_000,
      isNewBest: true,
    });
    expect(store.getBestTime("paris")).toBe(300_000);
  });

  it("더 빠를 때만 갱신되고, 느리면 기존 기록을 지킨다", () => {
    const store = createRecordStore(memoryStorage());
    store.saveClearTime("paris", 300_000);

    expect(store.saveClearTime("paris", 400_000)).toEqual({
      bestMs: 300_000,
      isNewBest: false,
    });
    expect(store.saveClearTime("paris", 250_000)).toEqual({
      bestMs: 250_000,
      isNewBest: true,
    });
    expect(store.getBestTime("paris")).toBe(250_000);
  });

  it("도시마다 따로 기록한다", () => {
    const store = createRecordStore(memoryStorage());
    store.saveClearTime("paris", 300_000);

    expect(store.getBestTime("seoul")).toBeNull();
  });

  it("저장소에 남아 새로 만든 기록 저장소에서도 다시 읽힌다", () => {
    const storage = memoryStorage();
    createRecordStore(storage).saveClearTime("seoul", 420_000);

    expect(createRecordStore(storage).getBestTime("seoul")).toBe(420_000);
  });
});

describe("기분 좀 풀렸나요? 답", () => {
  it("답을 도시와 함께 저장소에 남긴다", () => {
    const storage = memoryStorage();
    createRecordStore(storage).saveFeeling("seoul", "yes", 1);
    createRecordStore(storage).saveFeeling("paris", "no", 2);

    expect(createRecordStore(storage).getFeelings()).toEqual([
      { cityId: "seoul", feeling: "yes", at: 1 },
      { cityId: "paris", feeling: "no", at: 2 },
    ]);
  });
});
