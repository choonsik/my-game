"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cities, cityCenter, type City } from "@/modules/city";
import { createRecordStore, type Feeling } from "@/modules/record";
import { acquireFlag, clearTimeMs, startRound, type Round } from "@/modules/round";

import { AcquireBurst } from "./acquire-burst";
import { CitySelect } from "./city-select";
import { ClearDialog, type ClearResult } from "./clear-dialog";
import { FlightHud } from "./flight-hud";
import { createSound } from "./sound";

const ACCESS_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";

// CesiumJS는 무거우므로 도시를 고른 뒤에만 불러온다.
const FlightView = dynamic(() => import("@/modules/flight").then((m) => m.FlightView), {
  ssr: false,
});

type Flight = {
  /** 비행마다 새로 매기는 번호. 같은 도시를 다시 골라도 헬기가 새로 출발한다. */
  id: number;
  city: City;
  status: "loading" | "ready" | "error";
  error: string | null;
  round: Round | null;
  result: ClearResult | null;
  feeling: Feeling | null;
};

export function Game() {
  const records = useMemo(() => createRecordStore(window.localStorage), []);
  const sound = useMemo(() => createSound(), []);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [bursts, setBursts] = useState<number[]>([]);
  const burstId = useRef(0);
  const flightId = useRef(0);
  // 3D 화면은 처음 도시를 고를 때 한 번 띄우고, 도시 목록으로 돌아와도 내리지 않는다.
  const [viewMounted, setViewMounted] = useState(false);

  const flying = flight?.status === "ready" && flight.round !== null && flight.result === null;
  useEffect(() => {
    if (!flying) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [flying]);

  const selectCity = (city: City) => {
    sound.startMusic();
    if (ACCESS_TOKEN) setViewMounted(true);
    setFlight({
      id: ++flightId.current,
      city,
      status: ACCESS_TOKEN ? "loading" : "error",
      error: ACCESS_TOKEN ? null : "Cesium ion token(NEXT_PUBLIC_CESIUM_ION_TOKEN)이 설정되지 않았어요.",
      round: null,
      result: null,
      feeling: null,
    });
  };

  const backToCities = () => {
    sound.stopMusic();
    setBursts([]);
    setFlight(null);
  };

  // 실사 타일이 처음 다 뜬 순간이 비행 시작이다.
  const onReady = useCallback(() => {
    setFlight((current) =>
      current && current.round === null
        ? {
            ...current,
            status: "ready",
            round: startRound({ places: current.city.landmarks, startedAt: Date.now() }),
          }
        : current
    );
  }, []);

  const onError = useCallback((message: string) => {
    setFlight((current) => current && { ...current, status: "error", error: message });
  }, []);

  // 기록 저장과 효과음은 한 번만 일어나야 하므로 state 업데이터 밖에서 처리한다.
  const flightRef = useRef(flight);
  useEffect(() => {
    flightRef.current = flight;
  });
  const onAcquire = useCallback(
    (flagId: string) => {
      const current = flightRef.current;
      if (!current?.round || current.result) return;
      const round = acquireFlag(current.round, flagId, Date.now());
      if (round === current.round) return;
      const time = clearTimeMs(round);
      const result =
        time === null
          ? null
          : { clearTimeMs: time, ...records.saveClearTime(current.city.id, time) };
      const next = { ...current, round, result };
      flightRef.current = next;
      setFlight(next);
      sound.acquire();
      setBursts((list) => [...list, ++burstId.current]);
    },
    [records, sound]
  );

  const cleared = flight?.result != null;
  useEffect(() => {
    if (cleared) sound.clear();
  }, [cleared, sound]);

  const onShoot = useCallback(() => sound.shot(), [sound]);
  const onSpeed = useCallback((ratio: number) => sound.rotorSpeed(ratio), [sound]);
  // 같은 비행 동안에는 같은 session 객체를 넘긴다.
  const sessionId = flight && flight.status !== "error" ? flight.id : null;
  const sessionCity = flight?.city ?? null;
  const session = useMemo(
    () =>
      sessionId !== null && sessionCity
        ? { id: sessionId, start: cityCenter(sessionCity) }
        : null,
    [sessionId, sessionCity]
  );
  const removeBurst = useCallback((id: number) => {
    setBursts((list) => list.filter((b) => b !== id));
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      sound.setMuted(!m);
      return !m;
    });
  };

  const answer = (feeling: Feeling) => {
    if (!flight) return;
    records.saveFeeling(flight.city.id, feeling, Date.now());
    setFlight({ ...flight, feeling });
  };

  const view = viewMounted && (
    <div className={session ? "fixed inset-0" : "invisible fixed inset-0"} aria-hidden={!session}>
      <FlightView
        accessToken={ACCESS_TOKEN}
        session={session}
        flags={flight?.round?.flags ?? []}
        active={flight?.status === "ready" && flight.result === null}
        onReady={onReady}
        onError={onError}
        onAcquire={onAcquire}
        onShoot={onShoot}
        onSpeed={onSpeed}
      />
    </div>
  );

  if (!flight) {
    // 도시 목록으로 돌아올 때마다 저장소에서 다시 읽는다.
    const bestTimes = Object.fromEntries(cities.map((c) => [c.id, records.getBestTime(c.id)]));
    return (
      <>
        {view}
        <CitySelect cities={cities} bestTimes={bestTimes} onSelect={selectCity} />
      </>
    );
  }

  const { city, status, round, result } = flight;
  const elapsed = round ? (result ? result.clearTimeMs : Math.max(0, now - round.startedAt)) : 0;

  return (
    <>
    {view}
    <main className="relative flex-1 overflow-hidden">

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <div className="flex items-center gap-3 text-lg" role="status">
            <Spinner />
            {city.name}의 실제 건물을 불러오는 중…
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
          <Alert variant="destructive" className="max-w-md">
            <WarningCircleIcon />
            <AlertTitle>도시를 불러오지 못했어요</AlertTitle>
            <AlertDescription className="flex flex-col gap-3">
              <p>{flight.error}</p>
              <Button variant="outline" onClick={backToCities}>
                도시 목록으로
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {status === "ready" && round && (
        <>
          <FlightHud
            cityName={city.name}
            flags={round.flags}
            elapsedMs={elapsed}
            muted={muted}
            onToggleMute={toggleMute}
            onExit={backToCities}
          />
        </>
      )}

      {bursts.map((id) => (
        <AcquireBurst key={id} onDone={() => removeBurst(id)} />
      ))}

      {result && (
        <ClearDialog
          cityName={city.name}
          result={result}
          feeling={flight.feeling}
          onAnswer={answer}
          onBackToCities={backToCities}
        />
      )}
    </main>
    </>
  );
}
