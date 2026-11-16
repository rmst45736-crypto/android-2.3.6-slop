import { AlarmClock, Bell, CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AppPreferences, ComputedTaskMeta, RingtoneItem, TaskItem } from '../types/cadence';
import { formatDurationCompact } from '../utils/scheduling';
import { SevenDaySummary } from './SevenDaySummary';
import { TaskCard } from './TaskCard';

interface HomeQueueScreenProps {
  tasks: TaskItem[];
  nowMs: number;
  activeMeta: ComputedTaskMeta[];
  completedTasks: TaskItem[];
  ringtones: RingtoneItem[];
  preferences: AppPreferences;
  onToggleComplete: (id: string) => void;
  onEditTask: (meta: ComputedTaskMeta) => void;
  onCreateTask: () => void;
  onTestAlarm: (meta?: ComputedTaskMeta) => void;
  onToggleShowCompleted: () => void;
  onClearCompleted: () => void;
  onJumpToRingtones: () => void;
}

export function HomeQueueScreen({
  tasks,
  nowMs,
  activeMeta,
  completedTasks,
  ringtones,
  preferences,
  onToggleComplete,
  onEditTask,
  onCreateTask,
  onTestAlarm,
  onToggleShowCompleted,
  onClearCompleted,
  onJumpToRingtones,
}: HomeQueueScreenProps) {
  const getRingtoneName = (ringtoneId: string | null) => {
    const id = ringtoneId || preferences.defaultRingtoneId;
    return ringtones.find((r) => r.id === id)?.name || 'Galaxy Breeze';
  };

  const nextUpcomingReminder = activeMeta
    .filter((m) => m.msUntilReminder > 0)
    .sort((a, b) => a.reminderAtMs - b.reminderAtMs)[0];

  const stackedCount = activeMeta.filter((m) => m.collisionCount > 0).length;
  const criticalCount = activeMeta.filter(
    (m) => m.isOverdue || m.urgencyLabel === 'Critical' || m.urgencyLabel === 'Urgent'
  ).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* Main Deadline-Ordered Queue */}
      <section aria-label="Deadline Queue" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Upcoming Deadlines
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Sorted soonest to furthest · Red to green shifted by difficulty
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-slate-200">{activeMeta.length}</span>
            <span>active</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-200">
              {preferences.baseLeadHours}h
            </span>
            <span>base lead</span>
          </div>
        </div>

        {/* Mobile compact summary strip */}
        {activeMeta.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs backdrop-blur-xl lg:hidden">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-300">
              <span className="font-medium text-white">
                {nextUpcomingReminder
                  ? `Next ring: ${nextUpcomingReminder.reminderLabel}`
                  : 'All active windows open'}
              </span>
              {stackedCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span className="text-amber-300">{stackedCount} stacked</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => onTestAlarm(activeMeta[0])}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/[0.08] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.14]"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Test Ring</span>
            </button>
          </div>
        )}

        {/* Active Task Cards */}
        {activeMeta.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.035] p-8 text-center backdrop-blur-xl sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-[var(--font-display)] text-lg font-semibold text-white">
              All deadlines cleared
            </h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-400">
              Add a new task with a deadline and difficulty tier to activate your 6-hour stacked
              early reminders.
            </p>
            <button
              type="button"
              onClick={onCreateTask}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition-transform hover:bg-slate-200 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </button>
          </div>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {activeMeta.map((meta) => (
                <TaskCard
                  key={meta.task.id}
                  meta={meta}
                  ringtoneName={getRingtoneName(meta.task.ringtoneId)}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEditTask}
                  onTestAlarm={(m) => onTestAlarm(m)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={onToggleShowCompleted}
                className="inline-flex min-h-[44px] items-center gap-2 text-xs font-medium text-slate-400 transition-colors hover:text-white"
              >
                <span>
                  {preferences.showCompleted ? 'Hide' : 'Show'} completed ({completedTasks.length})
                </span>
              </button>

              {preferences.showCompleted && (
                <button
                  type="button"
                  onClick={onClearCompleted}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-rose-300/90 transition-colors hover:text-rose-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Completed</span>
                </button>
              )}
            </div>

            {preferences.showCompleted && (
              <div className="mt-2 space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-slate-400 line-through">{task.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)} ·
                        Completed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task.id)}
                      aria-label={`Restore ${task.title}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <SevenDaySummary tasks={tasks} nowMs={nowMs} />
      </section>

      {/* Desktop Glassmorphism Telemetry & Urgency Rail */}
      <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
        <div className="rounded-3xl border border-white/[0.09] bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-[var(--font-display)] text-base font-semibold text-white">
              Urgency Spectrum
            </h2>
            <span className="text-xs text-slate-400">Top to Bottom</span>
          </div>

          <div className="mt-4">
            <div
              aria-hidden="true"
              className="h-2.5 w-full rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, hsl(0, 85%, 56%) 0%, hsl(38, 88%, 54%) 35%, hsl(88, 76%, 50%) 70%, hsl(142, 74%, 46%) 100%)',
              }}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Nearest (Red)</span>
              <span>Furthest (Green)</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-300/85">
              Hard tasks shift color toward red and trigger earlier; Easy tasks shift toward green
              while keeping strict deadline order.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.09] bg-white/[0.04] p-5 backdrop-blur-xl">
          <h2 className="font-[var(--font-display)] text-base font-semibold text-white">
            Early Reminder Radar
          </h2>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
              <dt className="text-xs text-slate-400">Urgent Queue</dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-rose-300">
                {criticalCount}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-3">
              <dt className="text-xs text-slate-400">Stacked Windows</dt>
              <dd className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-300">
                {stackedCount}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-white/[0.08] pt-4">
            {nextUpcomingReminder ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <AlarmClock className="h-3.5 w-3.5" />
                  <span>Next Scheduled Ring</span>
                </div>
                <p className="truncate text-sm font-medium text-white">
                  {nextUpcomingReminder.task.title}
                </p>
                <p className="text-xs text-slate-300">
                  {nextUpcomingReminder.reminderLabel} ·{' '}
                  {formatDurationCompact(nextUpcomingReminder.totalLeadMinutes)} early
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {activeMeta.length > 0
                  ? 'All active tasks are currently inside their early reminder window.'
                  : 'No active reminders scheduled.'}
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onTestAlarm(activeMeta[0])}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>Test Alarm</span>
              </button>
              <button
                type="button"
                onClick={onJumpToRingtones}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.08] px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <span>Ringtones</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
