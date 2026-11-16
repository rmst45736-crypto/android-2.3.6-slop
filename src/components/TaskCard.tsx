import { BellRing, Check, Clock, Layers, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { ComputedTaskMeta, RingtoneItem } from '../types/cadence';
import { DIFFICULTY_META } from '../utils/scheduling';

interface TaskCardProps {
  meta: ComputedTaskMeta;
  ringtoneName: string;
  onToggleComplete: (id: string) => void;
  onEdit: (meta: ComputedTaskMeta) => void;
  onTestAlarm: (meta: ComputedTaskMeta) => void;
  compact?: boolean;
  ringtones?: RingtoneItem[];
}

export function TaskCard({
  meta,
  ringtoneName,
  onToggleComplete,
  onEdit,
  onTestAlarm,
  compact = false,
}: TaskCardProps) {
  const { task } = meta;
  const diffLabel = DIFFICULTY_META[task.difficulty].label;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: meta.cardBgStyle,
        borderColor: meta.cardBorderStyle,
        boxShadow: meta.glowStyle,
      }}
      className="group relative rounded-2xl border backdrop-blur-xl transition-transform duration-150 hover:-translate-y-0.5"
    >
      <div className={compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'}>
        <div className="flex items-start gap-3">
          {/* 44x44px touch-safe completion hitbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id);
            }}
            aria-label={`Mark "${task.title}" complete`}
            className="-ml-1.5 -mt-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95"
          >
            <span
              style={{ borderColor: meta.accentTextStyle }}
              className="flex h-5 w-5 items-center justify-center rounded-full border-2 bg-black/25 transition-colors group-hover:bg-white/10"
            >
              <Check className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
            </span>
          </button>

          {/* Main clickable card body */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onEdit(meta)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit(meta);
              }
            }}
            className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-[var(--font-display)] text-[15px] font-semibold tracking-[0.01em] text-white sm:text-base">
                  {task.title}
                </h3>

                {/* Zero-pill unboxed metadata line */}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300/90">
                  <span style={{ color: meta.accentTextStyle }} className="font-semibold">
                    {diffLabel}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span style={{ color: meta.accentTextStyle }} className="font-medium">
                    {meta.urgencyLabel}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">
                    ·
                  </span>
                  <span className="text-slate-300">Due {meta.deadlineLabel}</span>
                </div>
              </div>

              {/* Live countdown timer */}
              <div className="flex shrink-0 items-baseline justify-between gap-2 sm:flex-col sm:items-end sm:gap-0.5">
                <div
                  style={{ color: meta.accentTextStyle }}
                  className="font-mono text-base font-semibold tracking-tight tabular-nums sm:text-lg"
                >
                  {meta.countdownText}
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {meta.isOverdue ? 'Past deadline' : 'Time remaining'}
                </span>
              </div>
            </div>

            {!compact && task.notes && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-300/80">
                {task.notes}
              </p>
            )}

            {/* Early reminder & collision footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-2.5 text-xs text-slate-300/85">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{meta.reminderLabel}</span>
                </span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="truncate text-slate-400">{meta.leadBreakdownText}</span>
                {meta.collisionCount > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-500">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-300/95">
                      <Layers className="h-3 w-3 shrink-0" />
                      <span>Stacked deadline</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTestAlarm(meta);
                  }}
                  title={`Test ringtone: ${ringtoneName}`}
                  aria-label={`Test reminder ringtone for ${task.title}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <BellRing className="h-3.5 w-3.5 shrink-0" />
                  <span className="max-w-[110px] truncate">{ringtoneName}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(meta);
                  }}
                  aria-label={`Edit ${task.title}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
