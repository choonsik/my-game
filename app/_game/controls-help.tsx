import { Kbd, KbdGroup } from "@/components/ui/kbd";

const CONTROLS: { keys: string[]; label: string }[] = [
  { keys: ["W", "S"], label: "앞·뒤" },
  { keys: ["A", "D"], label: "좌·우 회전" },
  { keys: ["E", "Q"], label: "위·아래" },
  { keys: ["Shift"], label: "가속" },
  { keys: ["Space"], label: "쏘기" },
];

export function ControlsHelp({ className }: { className?: string }) {
  return (
    <dl className={className ?? "flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"}>
      {CONTROLS.map(({ keys, label }) => (
        <div key={label} className="flex items-center gap-1.5">
          <dt>
            <KbdGroup>
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </KbdGroup>
          </dt>
          <dd>{label}</dd>
        </div>
      ))}
    </dl>
  );
}
