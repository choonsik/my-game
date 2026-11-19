"use client";

import {
  CheckCircleIcon,
  MapPinIcon,
  SignOutIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Flag } from "@/modules/round";

import { ControlsHelp } from "./controls-help";
import { formatClearTime } from "./format";

export function FlightHud({
  cityName,
  flags,
  elapsedMs,
  muted,
  onToggleMute,
  onExit,
}: {
  cityName: string;
  flags: Flag[];
  elapsedMs: number;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
}) {
  const acquired = flags.filter((flag) => flag.acquired).length;

  return (
    <>
      <Card size="sm" className="absolute top-4 left-4 w-72 bg-card/85 backdrop-blur">
        <CardHeader>
          <CardTitle>{cityName} 힌트</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2" aria-label="힌트 목록">
            {flags.map((flag) => (
              <li
                key={flag.id}
                className="flex items-center gap-2"
                data-acquired={flag.acquired}
              >
                {flag.acquired ? (
                  <CheckCircleIcon weight="fill" className="text-primary" aria-label="획득함" />
                ) : (
                  <MapPinIcon aria-hidden />
                )}
                <span className={flag.acquired ? "text-muted-foreground line-through" : undefined}>
                  {flag.hint} 근처
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="absolute top-4 right-4 flex items-center gap-3 bg-card/85 p-2 pl-4 text-card-foreground shadow-sm backdrop-blur">
        <span className="font-mono text-2xl font-semibold tabular-nums" aria-label="진행 시간">
          {formatClearTime(elapsedMs)}
        </span>
        <Badge variant="outline" className="text-base" aria-label="획득 개수">
          {acquired} / {flags.length}
        </Badge>
        <Button
          variant="secondary"
          size="icon"
          onClick={onToggleMute}
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
        >
          {muted ? <SpeakerSlashIcon /> : <SpeakerHighIcon />}
        </Button>
        <Button variant="secondary" onClick={onExit}>
          <SignOutIcon data-icon="inline-start" />
          나가기
        </Button>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
      />

      <ControlsHelp className="absolute bottom-10 left-4 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-card/80 px-3 py-2 text-xs text-card-foreground backdrop-blur" />
    </>
  );
}
