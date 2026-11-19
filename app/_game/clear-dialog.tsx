"use client";

import { useRef } from "react";
import { SmileyIcon, SmileyMehIcon, TrophyIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Feeling } from "@/modules/record";

import { formatClearTime } from "./format";

export type ClearResult = { clearTimeMs: number; bestMs: number; isNewBest: boolean };

export function ClearDialog({
  cityName,
  result,
  feeling,
  onAnswer,
  onBackToCities,
}: {
  cityName: string;
  result: ClearResult;
  feeling: Feeling | null;
  onAnswer: (feeling: Feeling) => void;
  onBackToCities: () => void;
}) {
  // 마지막 플래그를 Space로 쏘면 그 키 입력이 첫 버튼("예")을 눌러 버리므로, 팝업 자체에 포커스를 둔다.
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    // 답하거나 목록으로 돌아가기 전에는 닫히지 않는다.
    <Dialog open onOpenChange={() => {}}>
      <DialogContent ref={popupRef} initialFocus={popupRef} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <TrophyIcon weight="fill" className="text-primary" />
            {cityName} 미션 클리어!
          </DialogTitle>
          <DialogDescription>숨겨진 플래그를 모두 찾았어요.</DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">이번 기록</dt>
            <dd className="font-mono text-3xl font-semibold">{formatClearTime(result.clearTimeMs)}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground">최고 기록</dt>
            <dd className="flex items-center gap-2 font-mono text-3xl font-semibold">
              {formatClearTime(result.bestMs)}
              {result.isNewBest && <Badge>신기록!</Badge>}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <p className="font-heading text-lg font-medium">기분 좀 풀렸나요?</p>
          {feeling === null ? (
            <div className="flex gap-2">
              <Button size="lg" onClick={() => onAnswer("yes")}>
                <SmileyIcon data-icon="inline-start" />
                예
              </Button>
              <Button size="lg" variant="outline" onClick={() => onAnswer("no")}>
                <SmileyMehIcon data-icon="inline-start" />
                아니요
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              {feeling === "yes" ? "다행이에요! 다른 도시도 날아 볼까요?" : "다음엔 더 시원하게 만들어 볼게요."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button disabled={feeling === null} onClick={onBackToCities}>
            다른 도시 고르기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
