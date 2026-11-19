import { describe, expect, it } from "vitest";

import { cities } from "@/modules/city";

describe("도시 목록", () => {
  it("서울, 뉴욕, 파리를 이 순서로 제시한다", () => {
    expect(cities.map((city) => city.name)).toEqual(["서울", "뉴욕", "파리"]);
  });

  it("도시마다 힌트로 쓸 유명 장소를 8곳 이상, 이름이 겹치지 않게 가진다", () => {
    for (const city of cities) {
      const names = city.landmarks.map((landmark) => landmark.name);
      expect(names.length).toBeGreaterThanOrEqual(8);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("유명 장소는 실제 그 도시 안에 있다", () => {
    // 각 도시 중심부를 넉넉히 감싸는 경계 (위도, 경도)
    const bounds: Record<string, [number, number, number, number]> = {
      서울: [37.4, 37.7, 126.8, 127.2],
      뉴욕: [40.6, 40.9, -74.1, -73.8],
      파리: [48.8, 48.92, 2.2, 2.45],
    };
    for (const city of cities) {
      const [minLat, maxLat, minLon, maxLon] = bounds[city.name];
      for (const { latitude, longitude } of city.landmarks) {
        expect(latitude).toBeGreaterThan(minLat);
        expect(latitude).toBeLessThan(maxLat);
        expect(longitude).toBeGreaterThan(minLon);
        expect(longitude).toBeLessThan(maxLon);
      }
    }
  });
});
