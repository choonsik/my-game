"use client";

import dynamic from "next/dynamic";

// CesiumJS와 브라우저 저장소를 쓰므로 서버에서 미리 그리지 않는다.
export const GameLoader = dynamic(() => import("./game").then((m) => m.Game), {
  ssr: false,
});
