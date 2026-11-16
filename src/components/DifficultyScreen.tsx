import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppPreferences, ComputedTaskMeta, Difficulty, RingtoneItem } from '../types/cadence';
import { DIFFICULTY_META } from '../utils/scheduling';
import { TaskCard } from './TaskCard';

interface DifficultyScreenProps {
  activeMeta: ComputedTaskMeta[];
  ringtones: RingtoneItem[];
  preferences: AppPreferences;
  onToggleComplete: (id: string) => void;
  onEditTask: (meta: ComputedTaskMeta) => void;
  onTestAlarm: (meta: ComputedTaskMeta) => void;
  onCreateWithDifficulty: (difficulty: Difficulty) => void;
}

type TierFilter = 'all' | Difficulty;

const TIER_ORDER: Difficulty[] = ['hard', 'medium', 'easy'];

const TIER_ACCENTS: Record<Difficulty, { heading: string; border: string; glow: string }> = {
  hard: {
    heading: 'text-rose-300',
    border: 'border-rose-500/20',
    glow: 'from-rose-500/10 to-transparent',
  },
  medium: {
    heading: 'text-amber-300',
    border: 'border-amber-500/20',
    glow: 'from-amber-500/10 to-transparent',
  },
  easy: {
    heading: 'text-emerald-300',
    border: 'border-emerald-500/20',
    glow: 'from-emerald-500/10 to-transparent',
  },
};

export function DifficultyScreen({
  activeMeta,
  ringtones,
  preferences,
  onToggleComplete,
  onEditTask,
  onTestAlarm,
  onCreateWithDifficulty,
}: DifficultyScreenProps) {
  const [filter, setFilter] = useState<TierFilter>('all');

  const getRingtoneName = (ringtoneId: string | null) => {
    const id = ringtoneId || preferences.defaultRingtoneId;
    return ringtones.find((r) => r.id === id)?.name || 'Galaxy Breeze';
  };

  const grouped: Record<Difficulty, ComputedTaskMeta[]> = {
    hard: activeMeta.filter((m) => m.task.difficulty === 'hard'),
    medium: activeMeta.filter((m) => m.task.difficulty === 'medium'),
    easy: activeMeta.filter((m) => m.task.difficulty === 'easy'),
  };

  const visibleTiers = filter === 'all' ? TIER_ORDER : [filter];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Difficulty Categories
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tasks separated by Hard, Medium, and Easy priority tiers
          </p>
        </div>

        {/* Segmented filter buttons */}
        <div
          role="tablist"
          aria-label="Filter difficulty tier"
          className="inline-flex w-full items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-xl sm:w-auto"
        >
          {(['all', 'hard', 'medium', 'easy'] as TierFilter[]).map((key) => {
            const label = key === 'all' ? 'All Tiers' : DIFFICULTY_META[key].label;
            const count = key === 'all' ? activeMeta.length : grouped[key].length;
            const active = filter === key;

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(key)}
                className={`min-h-[38px] flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:flex-initial ${
                  active
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive 3-column grid when viewing all tiers on desktop, single column when filtered */}
      <div
        className={`grid gap-5 ${
          filter === 'all' ? 'grid-cols-1 lg:grid-cols-3 lg:items-start' : 'grid-cols-1'
        }`}
      >
        {visibleTiers.map((tier) => {
          const items = grouped[tier];
          const info = DIFFICULTY_META[tier];
          const accent = TIER_ACCENTS[tier];

          return (
            <section
              key={tier}
              aria-label={`${info.label} difficulty tasks`}
              className={`rounded-3xl border ${accent.border} bg-gradient-to-b ${accent.glow} bg-white/[0.025] p-4 backdrop-blur-xl sm:p-5`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`font-[var(--font-display)] text-lg font-semibold ${accent.heading}`}>
                      {info.label}
                    </h2>
                    <span className="font-mono text-xs tabular-nums text-slate-400">
                      · {items.length} {items.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{info.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateWithDifficulty(tier)}
                  className="min-h-[36px] shrink-0 whitespace-nowrap rounded-lg border border-white/[0.1] bg-white/[0.05] px-2.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/[0.12] hover:text-white"
                >
                  + Add {info.label}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">No active {info.label.toLowerCase()} tasks</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {items.map((meta) => (
                      <TaskCard
                        key={meta.task.id}
                        meta={meta}
                        ringtoneName={getRingtoneName(meta.task.ringtoneId)}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEditTask}
                        onTestAlarm={(m) => onTestAlarm(m)}
                        compact={filter === 'all'}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
