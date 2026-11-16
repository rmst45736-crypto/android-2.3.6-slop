import { BellRing, Clock, Play, Square, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppPreferences, Difficulty, RingtoneItem, TaskItem } from '../types/cadence';
import { ringtoneEngine } from '../utils/audioEngine';
import {
  computeSingleTaskLead,
  DIFFICULTY_META,
  formatDeadlineDisplay,
  formatReminderClock,
} from '../utils/scheduling';

interface TaskSheetModalProps {
  isOpen: boolean;
  editingTask: TaskItem | null;
  defaultDifficulty?: Difficulty;
  allTasks: TaskItem[];
  ringtones: RingtoneItem[];
  preferences: AppPreferences;
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    notes: string;
    deadlineISO: string;
    difficulty: Difficulty;
    ringtoneId: string | null;
  }) => void;
  onDelete?: (id: string) => void;
}

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function TaskSheetModal({
  isOpen,
  editingTask,
  defaultDifficulty = 'medium',
  allTasks,
  ringtones,
  preferences,
  onClose,
  onSave,
  onDelete,
}: TaskSheetModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(defaultDifficulty);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [ringtoneId, setRingtoneId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsPreviewing(false);

    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes);
      setDifficulty(editingTask.difficulty);
      setDeadlineInput(toLocalDatetimeInputValue(new Date(editingTask.deadlineISO)));
      setRingtoneId(editingTask.ringtoneId || '');
    } else {
      setTitle('');
      setNotes('');
      setDifficulty(defaultDifficulty);
      const defaultDate = new Date(Date.now() + 8 * 3600 * 1000);
      defaultDate.setMinutes(0, 0, 0);
      setDeadlineInput(toLocalDatetimeInputValue(defaultDate));
      setRingtoneId('');
    }
  }, [isOpen, editingTask, defaultDifficulty]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ringtoneEngine.stop();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const previewLead = useMemo(() => {
    if (!deadlineInput) return null;
    const parsed = new Date(deadlineInput);
    if (Number.isNaN(parsed.getTime())) return null;

    return computeSingleTaskLead(
      {
        id: editingTask?.id,
        deadlineISO: parsed.toISOString(),
        difficulty,
      },
      allTasks,
      preferences.baseLeadHours
    );
  }, [deadlineInput, difficulty, allTasks, editingTask?.id, preferences.baseLeadHours]);

  if (!isOpen) return null;

  const applyQuickOffsetHours = (hoursFromNow: number) => {
    const target = new Date(Date.now() + hoursFromNow * 3600 * 1000);
    setDeadlineInput(toLocalDatetimeInputValue(target));
  };

  const applyTomorrowMorning = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    target.setHours(9, 0, 0, 0);
    setDeadlineInput(toLocalDatetimeInputValue(target));
  };

  const handlePreviewSelectedTone = async () => {
    if (isPreviewing) {
      ringtoneEngine.stop();
      setIsPreviewing(false);
      return;
    }
    const targetId = ringtoneId || preferences.defaultRingtoneId;
    const tone = ringtones.find((r) => r.id === targetId) || ringtones[0];
    if (!tone) return;
    setIsPreviewing(true);
    await ringtoneEngine.play(tone, preferences.volume, {
      loop: false,
      onEnded: () => setIsPreviewing(false),
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a task title.');
      return;
    }
    const parsed = new Date(deadlineInput);
    if (!deadlineInput || Number.isNaN(parsed.getTime())) {
      setError('Please choose a valid deadline date and time.');
      return;
    }

    ringtoneEngine.stop();
    onSave({
      id: editingTask?.id,
      title: trimmed,
      notes: notes.trim(),
      deadlineISO: parsed.toISOString(),
      difficulty,
      ringtoneId: ringtoneId || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          ringtoneEngine.stop();
          onClose();
        }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Bottom Sheet (mobile) / Centered Dialog (desktop) */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-sheet-title"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 36 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/[0.12] bg-[#0c1018]/95 p-5 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-6"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden"
        />

        <div className="flex items-center justify-between gap-3">
          <h2
            id="task-sheet-title"
            className="font-[var(--font-display)] text-lg font-semibold text-white"
          >
            {editingTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            type="button"
            onClick={() => {
              ringtoneEngine.stop();
              onClose();
            }}
            aria-label="Close modal"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="task-title-input" className="block text-xs font-medium text-slate-300">
              Task Title
            </label>
            <input
              id="task-title-input"
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Finish Lab Report & Upload PDF"
              className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.12] bg-black/35 px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-white/35 focus:outline-none"
            />
          </div>

          {/* Difficulty / Importance Selector */}
          <div>
            <span className="block text-xs font-medium text-slate-300">
              Difficulty &amp; Importance
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['hard', 'medium', 'easy'] as Difficulty[]).map((tier) => {
                const selected = difficulty === tier;
                const activeStyles: Record<Difficulty, string> = {
                  hard: 'border-rose-400/60 bg-rose-500/20 text-rose-200',
                  medium: 'border-amber-400/60 bg-amber-500/20 text-amber-200',
                  easy: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200',
                };
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setDifficulty(tier)}
                    className={`h-11 rounded-xl border text-xs font-semibold transition-colors ${
                      selected
                        ? activeStyles[tier]
                        : 'border-white/[0.1] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    {DIFFICULTY_META[tier].label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {DIFFICULTY_META[difficulty].description}
            </p>
          </div>

          {/* Deadline Date/Time + Quick Chips */}
          <div>
            <label htmlFor="task-deadline-input" className="block text-xs font-medium text-slate-300">
              Deadline
            </label>
            <input
              id="task-deadline-input"
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => {
                setDeadlineInput(e.target.value);
                setError(null);
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-white/[0.12] bg-black/35 px-3.5 font-mono text-sm text-white focus:border-white/35 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickOffsetHours(2)}
                className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                +2h
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetHours(6.5)}
                className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                +6.5h
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetHours(10)}
                className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                +10h
              </button>
              <button
                type="button"
                onClick={applyTomorrowMorning}
                className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                Tomorrow 9 AM
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetHours(48)}
                className="h-8 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.1] hover:text-white"
              >
                In 2 Days
              </button>
            </div>
          </div>

          {/* Live Stacked Early Reminder Preview */}
          {previewLead && (
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Clock className="h-3.5 w-3.5 text-amber-300" />
                <span>{formatReminderClock(previewLead.reminderAtMs, Date.now())}</span>
                <span className="text-slate-400">·</span>
                <span className="font-normal text-slate-300">
                  Due {formatDeadlineDisplay(new Date(deadlineInput).getTime(), Date.now())}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{previewLead.leadBreakdownText}</p>
            </div>
          )}

          {/* Ringtone Override */}
          <div>
            <label htmlFor="task-ringtone-select" className="block text-xs font-medium text-slate-300">
              Reminder Ringtone
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <BellRing className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="task-ringtone-select"
                  value={ringtoneId}
                  onChange={(e) => setRingtoneId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-white/[0.12] bg-black/45 pl-9 pr-3 text-sm text-white focus:border-white/35 focus:outline-none"
                >
                  <option value="">
                    Use App Default (
                    {ringtones.find((r) => r.id === preferences.defaultRingtoneId)?.name ||
                      'Galaxy Breeze'}
                    )
                  </option>
                  {ringtones.map((tone) => (
                    <option key={tone.id} value={tone.id}>
                      {tone.name} {tone.source === 'custom' ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handlePreviewSelectedTone}
                aria-label="Preview selected ringtone"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.14]"
              >
                {isPreviewing ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label htmlFor="task-notes-input" className="block text-xs font-medium text-slate-300">
              Notes (optional)
            </label>
            <textarea
              id="task-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Checklist items, links, or details..."
              className="mt-1.5 w-full rounded-xl border border-white/[0.12] bg-black/35 p-3 text-sm text-white placeholder:text-slate-500 focus:border-white/35 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-300">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {editingTask && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  ringtoneEngine.stop();
                  onDelete(editingTask.id);
                  onClose();
                }}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  ringtoneEngine.stop();
                  onClose();
                }}
                className="h-11 rounded-xl border border-white/[0.1] px-4 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 rounded-xl bg-white px-5 text-xs font-semibold text-slate-950 transition-transform hover:bg-slate-200 active:scale-[0.98]"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
