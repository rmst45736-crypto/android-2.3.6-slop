import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TaskItem } from '../types/cadence';

interface SevenDaySummaryProps {
  tasks: TaskItem[];
  nowMs: number;
}

interface DayBucket {
  dayKey: string;
  label: string;
  fullDate: string;
  completed: number;
  pending: number;
  total: number;
  completionRate: number;
  hard: number;
  medium: number;
  easy: number;
}

function getLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function RateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DayBucket }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/[0.14] bg-[#0b0f17]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="font-semibold text-white">{row.fullDate}</p>
      <p className="mt-1 font-mono tabular-nums text-emerald-300">
        {row.completionRate}% completion rate
      </p>
      <p className="mt-0.5 text-slate-300">
        {row.completed} completed · {row.pending} pending
      </p>
    </div>
  );
}

function DifficultyTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DayBucket }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/[0.14] bg-[#0b0f17]/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl">
      <p className="font-semibold text-white">{row.fullDate}</p>
      <div className="mt-1.5 space-y-0.5 font-mono tabular-nums">
        <p className="text-rose-300">Hard: {row.hard}</p>
        <p className="text-amber-300">Medium: {row.medium}</p>
        <p className="text-emerald-300">Easy: {row.easy}</p>
      </div>
    </div>
  );
}

export function SevenDaySummary({ tasks, nowMs }: SevenDaySummaryProps) {
  const { buckets, summaryTotals } = useMemo(() => {
    const today = new Date(nowMs);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const dayBuckets: DayBucket[] = [];
    const bucketMap = new Map<string, DayBucket>();

    for (let offset = 6; offset >= 0; offset--) {
      const d = new Date(startOfToday);
      d.setDate(startOfToday.getDate() - offset);
      const key = getLocalDayKey(d);
      const label =
        offset === 0
          ? 'Today'
          : d.toLocaleDateString([], { weekday: 'short' });
      const fullDate = d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      const entry: DayBucket = {
        dayKey: key,
        label,
        fullDate,
        completed: 0,
        pending: 0,
        total: 0,
        completionRate: 0,
        hard: 0,
        medium: 0,
        easy: 0,
      };
      dayBuckets.push(entry);
      bucketMap.set(key, entry);
    }

    let totalCompleted = 0;
    let totalTracked = 0;
    let hardTotal = 0;
    let mediumTotal = 0;
    let easyTotal = 0;

    for (const task of tasks) {
      // Bucket completed tasks on their completion date; incomplete tasks on deadline (if within last 7d) or creation date
      const candidateISO =
        task.completed && task.completedAtISO
          ? task.completedAtISO
          : (() => {
              const deadlineKey = getLocalDayKey(new Date(task.deadlineISO));
              if (bucketMap.has(deadlineKey)) return task.deadlineISO;
              return task.createdAtISO;
            })();

      const key = getLocalDayKey(new Date(candidateISO));
      const bucket = bucketMap.get(key);
      if (!bucket) continue;

      if (task.completed) {
        bucket.completed += 1;
        totalCompleted += 1;
      } else {
        bucket.pending += 1;
      }
      bucket.total += 1;
      totalTracked += 1;

      bucket[task.difficulty] += 1;
      if (task.difficulty === 'hard') hardTotal += 1;
      else if (task.difficulty === 'medium') mediumTotal += 1;
      else easyTotal += 1;
    }

    for (const b of dayBuckets) {
      b.completionRate = b.total > 0 ? Math.round((b.completed / b.total) * 100) : 0;
    }

    const overallRate =
      totalTracked > 0 ? Math.round((totalCompleted / totalTracked) * 100) : 0;

    return {
      buckets: dayBuckets,
      summaryTotals: {
        overallRate,
        totalCompleted,
        totalTracked,
        hardTotal,
        mediumTotal,
        easyTotal,
      },
    };
  }, [tasks, nowMs]);

  return (
    <section
      aria-label="7-Day Task Summary"
      className="mt-8 border-t border-white/[0.08] pt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[var(--font-display)] text-xl font-semibold tracking-tight text-white">
            7-Day Activity Summary
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Daily completion rates and difficulty distribution over the past 7 days
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>
            Overall rate{' '}
            <strong className="font-mono font-semibold tabular-nums text-emerald-300">
              {summaryTotals.overallRate}%
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono font-semibold tabular-nums text-white">
              {summaryTotals.totalCompleted}
            </strong>{' '}
            of{' '}
            <strong className="font-mono font-semibold tabular-nums text-white">
              {summaryTotals.totalTracked}
            </strong>{' '}
            tasks completed
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Completion Rate Chart */}
        <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-[var(--font-display)] text-sm font-semibold text-white sm:text-base">
                Completion Rate
              </h3>
              <p className="text-xs text-slate-400">Daily percentage finished</p>
            </div>
            <span className="font-mono text-lg font-semibold tabular-nums text-emerald-300">
              {summaryTotals.overallRate}%
            </span>
          </div>

          <div className="mt-4 h-[190px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={buckets} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="cadenceRateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<RateTooltip />} />
                <Area
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#cadenceRateFill)"
                  activeDot={{ r: 4, fill: '#34d399', stroke: '#07090e', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution Chart */}
        <div className="min-w-0 rounded-3xl border border-white/[0.09] bg-white/[0.035] p-4 backdrop-blur-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-[var(--font-display)] text-sm font-semibold text-white sm:text-base">
                Difficulty Distribution
              </h3>
              <p className="text-xs text-slate-400">Task breakdown by tier</p>
            </div>

            {/* Clean unboxed legend */}
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-rose-400" />
                <span>Hard</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {summaryTotals.hardTotal}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-amber-400" />
                <span>Medium</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {summaryTotals.mediumTotal}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                <span>Easy</span>
                <span className="font-mono tabular-nums text-slate-400">
                  {summaryTotals.easyTotal}
                </span>
              </span>
            </div>
          </div>

          <div className="mt-4 h-[190px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<DifficultyTooltip />}
                />
                <Bar dataKey="easy" stackId="tier" fill="#34d399" radius={[0, 0, 4, 4]} />
                <Bar dataKey="medium" stackId="tier" fill="#fbbf24" />
                <Bar dataKey="hard" stackId="tier" fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
