import { BellRing, Layers, ListChecks, Plus } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlarmOverlay } from './components/AlarmOverlay';
import { DifficultyScreen } from './components/DifficultyScreen';
import { HomeQueueScreen } from './components/HomeQueueScreen';
import { RingtoneStudioScreen } from './components/RingtoneStudioScreen';
import { TaskSheetModal } from './components/TaskSheetModal';
import {
  ActiveAlarm,
  AppPreferences,
  ComputedTaskMeta,
  Difficulty,
  RingtoneItem,
  ScreenIndex,
  TaskItem,
} from './types/cadence';
import {
  BUILTIN_RINGTONES,
  deleteCustomAudioBlob,
  ringtoneEngine,
} from './utils/audioEngine';
import { computeTasksWithMeta } from './utils/scheduling';
import {
  loadCustomRingtones,
  loadPreferences,
  loadTasks,
  saveCustomRingtones,
  savePreferences,
  saveTasks,
} from './utils/storage';

const SCREEN_LABELS: { index: ScreenIndex; label: string; shortLabel: string }[] = [
  { index: 0, label: 'All Tasks', shortLabel: 'Queue' },
  { index: 1, label: 'By Difficulty', shortLabel: 'Tiers' },
  { index: 2, label: 'Ringtones', shortLabel: 'Alerts' },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
};

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [customRingtones, setCustomRingtones] = useState<RingtoneItem[]>(() =>
    loadCustomRingtones()
  );
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [[activeScreen, direction], setScreenState] = useState<[ScreenIndex, number]>([0, 0]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultSheetDifficulty, setDefaultSheetDifficulty] = useState<Difficulty>('medium');

  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);

  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  const allRingtones = useMemo(
    () => [...BUILTIN_RINGTONES, ...customRingtones],
    [customRingtones]
  );

  const navigateScreen = useCallback(
    (next: ScreenIndex) => {
      if (next === activeScreen) return;
      setScreenState([next, next > activeScreen ? 1 : -1]);
    },
    [activeScreen]
  );

  // Persist state changes
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveCustomRingtones(customRingtones);
  }, [customRingtones]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  // 1-second precision live clock tick
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Keyboard arrow navigation between screens when not typing in inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sheetOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight' && activeScreen < 2) {
        navigateScreen((activeScreen + 1) as ScreenIndex);
      } else if (e.key === 'ArrowLeft' && activeScreen > 0) {
        navigateScreen((activeScreen - 1) as ScreenIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreen, navigateScreen, sheetOpen]);

  const { activeMeta, completedTasks } = useMemo(
    () => computeTasksWithMeta(tasks, nowMs, preferences.baseLeadHours),
    [tasks, nowMs, preferences.baseLeadHours]
  );

  const resolveRingtone = useCallback(
    (ringtoneId: string | null): RingtoneItem => {
      const targetId = ringtoneId || preferences.defaultRingtoneId;
      return (
        allRingtones.find((r) => r.id === targetId) ||
        allRingtones[0] ||
        BUILTIN_RINGTONES[0]
      );
    },
    [allRingtones, preferences.defaultRingtoneId]
  );

  const triggerAlarmForTask = useCallback(
    (meta: ComputedTaskMeta, isTest = false) => {
      const tone = resolveRingtone(meta.task.ringtoneId);
      setActiveAlarm({
        taskId: meta.task.id,
        title: meta.task.title,
        difficulty: meta.task.difficulty,
        deadlineISO: meta.task.deadlineISO,
        ringtoneId: tone.id,
        reason: meta.leadBreakdownText,
        isTest,
      });

      void ringtoneEngine.play(tone, preferences.volume, { loop: true });

      if (
        !isTest &&
        preferences.notificationsEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`Early Reminder: ${meta.task.title}`, {
            body: `Due ${meta.deadlineLabel} · ${meta.leadBreakdownText}`,
            tag: `cadence-${meta.task.id}`,
          });
        } catch {
          // Ignore browser notification restrictions
        }
      }
    },
    [preferences.notificationsEnabled, preferences.volume, resolveRingtone]
  );

  // Real-time reminder trigger check on each clock tick
  useEffect(() => {
    if (activeAlarm) return;

    const dueTrigger = activeMeta.find((meta) => {
      const { task } = meta;
      if (meta.msRemaining <= -3600000) return false; // Ignore tasks overdue > 1h

      if (task.snoozedUntilISO) {
        const snoozeMs = new Date(task.snoozedUntilISO).getTime();
        return nowMs >= snoozeMs;
      }

      if (task.notifiedAtISO) return false;
      return meta.isInReminderWindow;
    });

    if (dueTrigger) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === dueTrigger.task.id
            ? { ...t, notifiedAtISO: new Date(nowMs).toISOString(), snoozedUntilISO: null }
            : t
        )
      );
      triggerAlarmForTask(dueTrigger, false);
    }
  }, [activeMeta, nowMs, activeAlarm, triggerAlarmForTask]);

  const handleTestAlarm = (meta?: ComputedTaskMeta) => {
    if (meta) {
      triggerAlarmForTask(meta, true);
      return;
    }
    const tone = resolveRingtone(null);
    setActiveAlarm({
      taskId: 'test-alarm',
      title: 'Sample Early Deadline Reminder',
      difficulty: 'hard',
      deadlineISO: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
      ringtoneId: tone.id,
      reason: `${preferences.baseLeadHours}h base +3h Hard`,
      isTest: true,
    });
    void ringtoneEngine.play(tone, preferences.volume, { loop: true });
  };

  const handleDismissAlarm = () => {
    ringtoneEngine.stop();
    setActiveAlarm(null);
  };

  const handleSnoozeAlarm = () => {
    if (!activeAlarm) return;
    ringtoneEngine.stop();
    const snoozeUntil = new Date(Date.now() + preferences.snoozeMinutes * 60 * 1000).toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeAlarm.taskId ? { ...t, snoozedUntilISO: snoozeUntil } : t
      )
    );
    setActiveAlarm(null);
  };

  const handleToggleComplete = (id: string) => {
    if (activeAlarm && activeAlarm.taskId === id) {
      ringtoneEngine.stop();
      setActiveAlarm(null);
    }
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAtISO: nextCompleted ? new Date().toISOString() : null,
          snoozedUntilISO: null,
        };
      })
    );
  };

  const handleSaveTask = (payload: {
    id?: string;
    title: string;
    notes: string;
    deadlineISO: string;
    difficulty: Difficulty;
    ringtoneId: string | null;
  }) => {
    if (payload.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.id
            ? {
                ...t,
                title: payload.title,
                notes: payload.notes,
                deadlineISO: payload.deadlineISO,
                difficulty: payload.difficulty,
                ringtoneId: payload.ringtoneId,
                // Reset notification lock if deadline or difficulty changed so reminder re-arms cleanly
                notifiedAtISO: null,
                snoozedUntilISO: null,
              }
            : t
        )
      );
    } else {
      const newTask: TaskItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: payload.title,
        notes: payload.notes,
        deadlineISO: payload.deadlineISO,
        difficulty: payload.difficulty,
        ringtoneId: payload.ringtoneId,
        completed: false,
        completedAtISO: null,
        notifiedAtISO: null,
        snoozedUntilISO: null,
        createdAtISO: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, newTask]);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (activeAlarm?.taskId === id) {
      ringtoneEngine.stop();
      setActiveAlarm(null);
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const handleUpdatePreferences = (patch: Partial<AppPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  };

  const handleAddCustomRingtone = (item: RingtoneItem) => {
    setCustomRingtones((prev) => [...prev, item]);
  };

  const handleDeleteCustomRingtone = (id: string) => {
    const target = customRingtones.find((r) => r.id === id);
    if (target?.indexedDbKey) {
      void deleteCustomAudioBlob(target.indexedDbKey);
    }
    setCustomRingtones((prev) => prev.filter((r) => r.id !== id));
    if (preferences.defaultRingtoneId === id) {
      handleUpdatePreferences({ defaultRingtoneId: BUILTIN_RINGTONES[0].id });
    }
    setTasks((prev) =>
      prev.map((t) => (t.ringtoneId === id ? { ...t, ringtoneId: null } : t))
    );
  };

  const openNewTaskModal = (difficulty: Difficulty = 'medium') => {
    setEditingTask(null);
    setDefaultSheetDifficulty(difficulty);
    setSheetOpen(true);
  };

  const openEditTaskModal = (meta: ComputedTaskMeta) => {
    setEditingTask(meta.task);
    setDefaultSheetDifficulty(meta.task.difficulty);
    setSheetOpen(true);
  };

  // Horizontal touch swipe handlers for phone-like screen transitions
  const handleTouchStart = (e: React.TouchEvent) => {
    if (sheetOpen) return;
    const target = e.target as HTMLElement | null;
    const isRangeInput = target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'range';
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ignore: Boolean(isRangeInput),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || touchStartRef.current.ignore) {
      touchStartRef.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 58 && Math.abs(dx) > Math.abs(dy) * 1.45) {
      if (dx < 0 && activeScreen < 2) {
        navigateScreen((activeScreen + 1) as ScreenIndex);
      } else if (dx > 0 && activeScreen > 0) {
        navigateScreen((activeScreen - 1) as ScreenIndex);
      }
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-[100dvh] flex-col">
        {/* Top Bar Contract: Brand wordmark — Nav links — 1 primary CTA */}
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#07090e]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:h-16 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => navigateScreen(0)}
              className="whitespace-nowrap shrink-0 font-[var(--font-display)] text-lg font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:text-xl"
            >
              Cadence
            </button>

            <nav aria-label="Primary screens" className="hidden items-center gap-7 md:flex">
              {SCREEN_LABELS.map((item) => {
                const isActive = activeScreen === item.index;
                return (
                  <button
                    key={item.index}
                    type="button"
                    onClick={() => navigateScreen(item.index)}
                    className={`relative whitespace-nowrap shrink-0 py-1 text-sm font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="desktop-nav-indicator"
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-white"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => openNewTaskModal()}
                className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-4 text-xs font-semibold text-slate-950 transition-transform hover:bg-slate-200 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Task</span>
              </button>
            </div>
          </div>
        </header>

        {/* Swipeable Multi-Screen Content Viewport */}
        <main
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-7 md:pb-12 lg:px-8"
        >
          {/* Mobile Screen Swipe Indicator Strip */}
          <div className="mb-4 flex items-center justify-between text-xs text-slate-400 md:hidden">
            <span>Swipe left or right to switch screens</span>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {SCREEN_LABELS.map((s) => (
                <span
                  key={s.index}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    activeScreen === s.index ? 'w-5 bg-white' : 'w-1.5 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeScreen}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeScreen === 0 && (
                <HomeQueueScreen
                  tasks={tasks}
                  nowMs={nowMs}
                  activeMeta={activeMeta}
                  completedTasks={completedTasks}
                  ringtones={allRingtones}
                  preferences={preferences}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={openEditTaskModal}
                  onCreateTask={() => openNewTaskModal()}
                  onTestAlarm={handleTestAlarm}
                  onToggleShowCompleted={() =>
                    handleUpdatePreferences({ showCompleted: !preferences.showCompleted })
                  }
                  onClearCompleted={handleClearCompleted}
                  onJumpToRingtones={() => navigateScreen(2)}
                />
              )}

              {activeScreen === 1 && (
                <DifficultyScreen
                  activeMeta={activeMeta}
                  ringtones={allRingtones}
                  preferences={preferences}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={openEditTaskModal}
                  onTestAlarm={(m) => handleTestAlarm(m)}
                  onCreateWithDifficulty={(diff) => openNewTaskModal(diff)}
                />
              )}

              {activeScreen === 2 && (
                <RingtoneStudioScreen
                  ringtones={allRingtones}
                  preferences={preferences}
                  activeMeta={activeMeta}
                  onUpdatePreferences={handleUpdatePreferences}
                  onAddCustomRingtone={handleAddCustomRingtone}
                  onDeleteCustomRingtone={handleDeleteCustomRingtone}
                  onTestAlarm={handleTestAlarm}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Thumb Navigation Bar */}
        <nav
          aria-label="Mobile screen navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.09] bg-[#07090e]/90 backdrop-blur-xl md:hidden"
        >
          <div className="grid h-16 grid-cols-3 items-center">
            {SCREEN_LABELS.map((item) => {
              const isActive = activeScreen === item.index;
              const Icon =
                item.index === 0
                  ? ListChecks
                  : item.index === 1
                  ? Layers
                  : BellRing;

              return (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => navigateScreen(item.index)}
                  className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                  <span className="text-[11px] font-medium tracking-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Task Add/Edit Sheet */}
        <AnimatePresence>
          {sheetOpen && (
            <TaskSheetModal
              isOpen={sheetOpen}
              editingTask={editingTask}
              defaultDifficulty={defaultSheetDifficulty}
              allTasks={tasks}
              ringtones={allRingtones}
              preferences={preferences}
              onClose={() => setSheetOpen(false)}
              onSave={handleSaveTask}
              onDelete={handleDeleteTask}
            />
          )}
        </AnimatePresence>

        {/* Live Early-Reminder Alarm Banner */}
        <AnimatePresence>
          {activeAlarm && (
            <AlarmOverlay
              alarm={activeAlarm}
              snoozeMinutes={preferences.snoozeMinutes}
              ringtoneName={resolveRingtone(activeAlarm.ringtoneId).name}
              onSnooze={handleSnoozeAlarm}
              onCompleteTask={() => handleToggleComplete(activeAlarm.taskId)}
              onDismiss={handleDismissAlarm}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
