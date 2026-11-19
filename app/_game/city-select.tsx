"use client";

import { AirplaneTiltIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { City } from "@/modules/city";

import { ControlsHelp } from "./controls-help";
import { formatClearTime } from "./format";

export function CitySelect({
  cities,
  bestTimes,
  onSelect,
}: {
  cities: City[];
  bestTimes: Record<string, number | null>;
  onSelect: (city: City) => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-xl flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            날으는 직장인
          </h1>
          <p className="text-lg text-muted-foreground">
            도시를 골라 실제 건물 위를 날며 숨겨진 플래그를 모두 찾아보세요.
          </p>
        </div>

        <ul className="flex flex-col gap-3" aria-label="도시 목록">
          {cities.map((city) => {
            const best = bestTimes[city.id];
            return (
              <li key={city.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">{city.name}</CardTitle>
                    <CardDescription>
                      최고 기록{" "}
                      <Badge variant={best === null ? "outline" : "secondary"}>
                        {best === null ? "기록 없음" : formatClearTime(best)}
                      </Badge>
                    </CardDescription>
                    <CardAction>
                      <Button onClick={() => onSelect(city)} aria-label={`${city.name}(으)로 날아가기`}>
                        <AirplaneTiltIcon data-icon="inline-start" />
                        날아가기
                      </Button>
                    </CardAction>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>

        <ControlsHelp />
      </div>
    </main>
  );
}
