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
    id: "seoul",
    name: "서울",
    landmarks: [
      { name: "경복궁", latitude: 37.5796, longitude: 126.977 },
      { name: "광화문광장", latitude: 37.5725, longitude: 126.9769 },
      { name: "서울시청", latitude: 37.5663, longitude: 126.9779 },
      { name: "숭례문", latitude: 37.56, longitude: 126.9754 },
      { name: "명동성당", latitude: 37.5633, longitude: 126.9873 },
      { name: "N서울타워", latitude: 37.5512, longitude: 126.9882 },
      { name: "창덕궁", latitude: 37.5794, longitude: 126.991 },
      { name: "인사동", latitude: 37.574, longitude: 126.9852 },
      { name: "동대문디자인플라자", latitude: 37.5669, longitude: 127.0095 },
      { name: "청계광장", latitude: 37.5693, longitude: 126.9784 },
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
