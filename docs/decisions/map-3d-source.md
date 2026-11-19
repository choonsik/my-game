# 실제 지도와 3D 건물 소스

## Decisions

- 도시의 실제 지형과 건물은 CesiumJS로 그리고, 데이터는 Cesium ion을 통해 받는 Google Photorealistic 3D Tiles를 사용합니다.
- 인증은 Cesium ion Community(무료) 계정의 access token 하나로 합니다. Google Cloud 결제 계정이나 Google Maps API 키는 쓰지 않습니다.
- 게임에 넣는 도시는 Google Photorealistic 3D Tiles에 실사 건물이 있는 곳으로만 고릅니다. 한국(서울 등)은 실사 건물 데이터가 없어 넣지 않습니다. 첫 도시 목록의 서울 자리는 도쿄로 대신했습니다.

## Boundaries

- 비상업 학습용으로만 성립하는 결정입니다. 수익화하거나 상업적으로 공개하는 순간 다시 봅니다.
- 타일을 녹화하거나 내려받아 다시 배포하지 않습니다. 화면에 스트리밍으로만 보여 줍니다.
- Google과 Cesium의 저작권 표시(attribution)는 화면에서 가리지 않습니다.

## Why

제품의 핵심이 "실제 건물 위를 날아다니는 즐거움"이라 실사 건물이 필요합니다. 같은 실사 타일을 Google에서 직접 받으면 결제 계정과 카드 등록이 필요하지만, Cesium ion Community는 카드 없이 같은 타일을 줍니다. 무료 한도는 월 1,000 root tile 요청이고, 페이지를 한 번 열면 최대 3시간 동안 한 번으로 셉니다. 학습용 사용량에는 충분합니다.

## Reconsider when

- 상업적으로 공개하거나 수익을 내려 할 때 (Cesium ion Commercial 플랜 또는 Google Map Tiles API 직접 사용으로 이동)
- 월 1,000 root tile 요청 한도를 실제로 넘기기 시작할 때
- Cesium ion이 Google 타일 제공 조건이나 무료 한도를 바꿀 때

## Still-rejected alternatives

- Google Map Tiles API 직접 사용 — 같은 화면을 주지만 결제 계정과 카드가 필요하고, 1,000회를 넘으면 1,000회당 $6이 과금됩니다. 상업 공개 시 다시 봅니다.
- Cesium OSM Buildings — 무료 한도는 넉넉하지만 건물이 회색 상자라 "실제 건물" 경험을 주지 못합니다. 실사 타일이 없는 지역(서울 등)을 메울 때 다시 봅니다.
- 서울을 OSM 건물이나 지면만으로 유지 — 실사 건물이 없으면 "실제 건물 위를 난다"는 제품 제약을 못 지켜, 실사 타일이 있는 도쿄로 대신했습니다.
- MapLibre + OSM 건물 돌출 — 키가 필요 없지만 건물이 단색 상자이고 카메라 기울기가 제한되어 자유 비행이 어렵습니다.

## Evidence worth preserving

- 2026-11 확인: Google Photorealistic 3D Tiles는 Enterprise SKU로 월 1,000회 무료, 이후 1,000회당 $6.00 ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing)). 2025년 3월 이후 $200 월 크레딧은 없습니다.
- 2026-11-19 확인: 서울 상공에서는 Google Photorealistic 3D Tiles에 건물이 그려지지 않습니다(한국 지도 데이터 반출 제한으로 알려져 있음). 이 때문에 첫 도시 목록을 서울에서 도쿄로 바꿨습니다(사용자 확인).
- 2026-11 확인: Cesium ion Community 플랜은 Google Photorealistic 3D Tiles 월 1,000 root tile, 비상업 개인 프로젝트·평가·무상 교육에 한정 ([pricing](https://cesium.com/platform/cesium-ion/pricing/)).
