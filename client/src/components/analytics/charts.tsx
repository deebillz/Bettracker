import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import type { DayPoint, PeriodPoint } from "@/lib/analytics";
import { shortDate } from "@/lib/analytics";
import { axisMoney, signedMoney } from "@/lib/format";

const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID = "hsl(var(--border))";
const GAIN = "hsl(var(--gain))";
const LOSS = "hsl(var(--loss))";

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md space-y-0.5">{children}</div>
  );
}

function Swatch({ positive }: { positive: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle"
      style={{ background: positive ? GAIN : LOSS }}
      aria-hidden
    />
  );
}

// ---------- Running profit over time (single series) ----------

function LineTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DayPoint;
  return (
    <TooltipBox>
      <div className="font-medium">{shortDate(p.date)}</div>
      <div className="text-muted-foreground">
        That day: <span className="text-foreground tabular-nums">{signedMoney(p.profit)}</span> ({p.bets} bet{p.bets === 1 ? "" : "s"})
      </div>
      <div className="text-muted-foreground">
        Running total: <span className="text-foreground font-medium tabular-nums">{signedMoney(p.cumulative)}</span>
      </div>
    </TooltipBox>
  );
}

export function ProfitLine({ points }: { points: DayPoint[] }) {
  // A lone day still needs a starting point to draw a line from
  const data = points.length === 1 ? [{ ...points[0], date: "", cumulative: 0 }, points[0]] : points;
  const last = points[points.length - 1];
  return (
    <div className="h-[240px] w-full" data-testid="chart-profit-line">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 56, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tickFormatter={(d) => (d ? shortDate(d) : "")}
            minTickGap={24}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={52} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          <Tooltip content={<LineTooltip />} cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }} />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            isAnimationActive={false}
            label={(props: { x?: number; y?: number; index?: number }) =>
              props.index === data.length - 1 && last ? (
                <text
                  key="end-label"
                  x={(props.x ?? 0) + 8}
                  y={(props.y ?? 0) + 4}
                  fontSize={12}
                  fontWeight={600}
                  fill="hsl(var(--foreground))"
                >
                  {signedMoney(last.cumulative, 0)}
                </text>
              ) : (
                <g key={`l-${props.index}`} />
              )
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Profit per day / week / month (diverging bars from zero) ----------

function BarTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PeriodPoint;
  return (
    <TooltipBox>
      <div className="font-medium">{p.label}</div>
      <div>
        <Swatch positive={p.profit >= 0} />
        <span className="tabular-nums font-medium">{signedMoney(p.profit)}</span>
      </div>
      <div className="text-muted-foreground">
        {p.bets} settled · {p.wins}W-{p.losses}L
      </div>
    </TooltipBox>
  );
}

/** Bar with its rounded end away from zero, so the baseline stays flat. */
function RoundedEndBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: PeriodPoint }) {
  const { x = 0, width = 0, fill } = props;
  let { y = 0, height = 0 } = props;
  if (height < 0) {
    y += height;
    height = -height;
  }
  if (height < 0.5) return <g />;
  const r = Math.min(4, width / 2, height);
  const up = (props.payload?.profit ?? 0) >= 0;
  const d = up
    ? `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`
    : `M${x},${y} V${y + height - r} Q${x},${y + height} ${x + r},${y + height} H${x + width - r} Q${x + width},${y + height} ${x + width},${y + height - r} V${y} Z`;
  return <path d={d} fill={fill} />;
}

export function PeriodBars({ points }: { points: PeriodPoint[] }) {
  return (
    <div className="h-[220px] w-full" data-testid="chart-period-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={points.length > 20 ? 2 : "20%"}>
          <CartesianGrid stroke={GRID} strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axisMoney} width={52} />
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
          <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
          <Bar dataKey="profit" shape={<RoundedEndBar />} maxBarSize={40} isAnimationActive={false}>
            {points.map((p) => (
              <Cell key={p.key} fill={p.profit >= 0 ? GAIN : LOSS} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
