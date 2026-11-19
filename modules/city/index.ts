export type Landmark = {
  name: string;
  longitude: number;
  latitude: number;
};

export type City = {
  id: string;
  name: string;
  landmarks: Landmark[];
};

// 한 판이 10분 안팎에 끝나도록 도시마다 중심부 몇 km 안의 명소만 고른다.
export const cities: City[] = [
  {
    // 서울은 Google 실사 3D 타일에 건물 데이터가 없어 넣지 않는다 (docs/decisions/map-3d-source.md).
    id: "tokyo",
    name: "도쿄",
    landmarks: [
      { name: "도쿄역", latitude: 35.6812, longitude: 139.7671 },
      { name: "고쿄(황거)", latitude: 35.6852, longitude: 139.7528 },
      { name: "긴자 욘초메", latitude: 35.6717, longitude: 139.765 },
      { name: "도쿄 타워", latitude: 35.6586, longitude: 139.7454 },
      { name: "히비야 공원", latitude: 35.6737, longitude: 139.7562 },
      { name: "국회의사당", latitude: 35.6759, longitude: 139.7448 },
      { name: "도쿄 국제포럼", latitude: 35.6768, longitude: 139.7637 },
      { name: "니혼바시", latitude: 35.684, longitude: 139.7745 },
      { name: "롯폰기 힐스", latitude: 35.6604, longitude: 139.7292 },
      { name: "쓰키지 혼간지", latitude: 35.6664, longitude: 139.7722 },
    ],
  },
  {
    id: "new-york",
    name: "뉴욕",
    landmarks: [
      { name: "엠파이어 스테이트 빌딩", latitude: 40.7484, longitude: -73.9857 },
      { name: "타임스 스퀘어", latitude: 40.758, longitude: -73.9855 },
      { name: "록펠러 센터", latitude: 40.7587, longitude: -73.9787 },
      { name: "크라이슬러 빌딩", latitude: 40.7516, longitude: -73.9755 },
      { name: "그랜드 센트럴 터미널", latitude: 40.7527, longitude: -73.9772 },
      { name: "브라이언트 공원", latitude: 40.7536, longitude: -73.9832 },
      { name: "플랫아이언 빌딩", latitude: 40.7411, longitude: -73.9897 },
      { name: "매디슨 스퀘어 가든", latitude: 40.7505, longitude: -73.9934 },
      { name: "유엔 본부", latitude: 40.7489, longitude: -73.968 },
      { name: "플라자 호텔", latitude: 40.7646, longitude: -73.9744 },
    ],
  },
  {
    id: "paris",
    name: "파리",
    landmarks: [
      { name: "에펠탑", latitude: 48.8584, longitude: 2.2945 },
      { name: "개선문", latitude: 48.8738, longitude: 2.295 },
      { name: "루브르 박물관", latitude: 48.8606, longitude: 2.3376 },
      { name: "노트르담 대성당", latitude: 48.853, longitude: 2.3499 },
      { name: "콩코르드 광장", latitude: 48.8656, longitude: 2.3212 },
      { name: "앵발리드", latitude: 48.8559, longitude: 2.3125 },
      { name: "오르세 미술관", latitude: 48.86, longitude: 2.3266 },
      { name: "그랑 팔레", latitude: 48.8661, longitude: 2.3125 },
      { name: "오페라 가르니에", latitude: 48.872, longitude: 2.3316 },
    ],
  },
];

export function getCity(id: string): City | undefined {
  return cities.find((city) => city.id === id);
}

/** 유명 장소들의 가운데 지점. 비행을 시작할 위치로 쓴다. */
export function cityCenter(city: City): { latitude: number; longitude: number } {
  const n = city.landmarks.length;
  return {
    latitude: city.landmarks.reduce((sum, l) => sum + l.latitude, 0) / n,
    longitude: city.landmarks.reduce((sum, l) => sum + l.longitude, 0) / n,
  };
}
