import { AlarmClock, BellRing, Check, X } from 'lucide-react';
import { motion } from 'motion/react';
import { ActiveAlarm } from '../types/cadence';
import { DIFFICULTY_META, formatDeadlineDisplay } from '../utils/scheduling';

interface AlarmOverlayProps {
  alarm: ActiveAlarm;
  snoozeMinutes: number;
  ringtoneName: string;
  onSnooze: () => void;
  onCompleteTask: () => void;
  onDismiss: () => void;
}

export function AlarmOverlay({
  alarm,
  snoozeMinutes,
  ringtoneName,
  onSnooze,
  onCompleteTask,
  onDismiss,
}: AlarmOverlayProps) {
  const deadlineMs = new Date(alarm.deadlineISO).getTime();

  return (
    <motion.div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Early reminder alarm"
      initial={{ opacity: 0, y: -24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-3 top-3 z-50 mx-auto max-w-xl rounded-3xl border border-rose-400/40 bg-[#140c12]/95 p-4 shadow-2xl shadow-rose-950/50 backdrop-blur-2xl sm:top-5 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-300">
            <BellRing className="h-5 w-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-rose-300">
              <span>{alarm.isTest ? 'Alarm Ringtone Test' : 'Early Deadline Reminder'}</span>
              <span aria-hidden="true">·</span>
              <span>{DIFFICULTY_META[alarm.difficulty].label}</span>
              <span aria-hidden="true">·</span>
              <span>{ringtoneName}</span>
            </div>
            <h3 className="mt-0.5 truncate font-[var(--font-display)] text-base font-semibold text-white">
              {alarm.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-300">
              Due {formatDeadlineDisplay(deadlineMs, Date.now())} · {alarm.reason}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alarm"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {!alarm.isTest && (
          <>
            <button
              type="button"
              onClick={onSnooze}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.14] bg-white/[0.06] px-3.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.12]"
            >
              <AlarmClock className="h-3.5 w-3.5" />
              <span>Snooze {snoozeMinutes}m</span>
            </button>

            <button
              type="button"
              onClick={onCompleteTask}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-400/20 px-3.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Mark Done</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-xs font-semibold text-slate-950 hover:bg-slate-200"
        >
          <span>{alarm.isTest ? 'Stop Test Ring' : 'Dismiss'}</span>
        </button>
      </div>
    </motion.div>
  );
}
