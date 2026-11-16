import { AppPreferences, RingtoneItem, TaskItem } from '../types/cadence';
import { BUILTIN_RINGTONES } from './audioEngine';

const TASKS_KEY = 'cadence_tasks_v1';
const CUSTOM_RINGTONES_KEY = 'cadence_custom_ringtones_v1';
const PREFS_KEY = 'cadence_preferences_v1';

export const DEFAULT_PREFERENCES: AppPreferences = {
  baseLeadHours: 6,
  defaultRingtoneId: BUILTIN_RINGTONES[0].id,
  volume: 0.8,
  snoozeMinutes: 15,
  notificationsEnabled: false,
  showCompleted: false,
};

function buildInitialSampleTasks(): TaskItem[] {
  const now = Date.now();
  const h = (hours: number) => new Date(now + hours * 3600 * 1000).toISOString();

  return [
    {
      id: 'seed-1',
      title: 'Submit Final Capstone Architecture Brief',
      notes: 'Double-check citations, export PDF, and verify attachment formatting.',
      deadlineISO: h(3.25),
      difficulty: 'hard',
      ringtoneId: 'builtin-amber-pulse',
      completed: false,
      completedAtISO: null,
      // Pre-mark seeded tasks whose reminder window already began so arrival doesn't spam an unprompted popup
      notifiedAtISO: new Date(now - 60000).toISOString(),
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 86400000).toISOString(),
    },
    {
      id: 'seed-2',
      title: 'Team Sync Slides & Demo Deck',
      notes: 'Finalize transition slides and test screen share notes.',
      deadlineISO: h(8.5),
      difficulty: 'medium',
      ringtoneId: null,
      completed: false,
      completedAtISO: null,
      notifiedAtISO: null,
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 72000000).toISOString(),
    },
    {
      id: 'seed-3',
      title: 'API Integration Regression Check',
      notes: 'Shares deadline window with Team Sync Slides — notice the earlier stacked reminder.',
      deadlineISO: h(8.85),
      difficulty: 'hard',
      ringtoneId: 'builtin-galaxy-breeze',
      completed: false,
      completedAtISO: null,
      // Already in early window because of collision + hard bonus; mark acknowledged on seed
      notifiedAtISO: new Date(now - 60000).toISOString(),
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 64000000).toISOString(),
    },
    {
      id: 'seed-4',
      title: 'Review Weekly Sprint Notes',
      notes: 'Summarize blockers and assign follow-ups.',
      deadlineISO: h(16.5),
      difficulty: 'easy',
      ringtoneId: 'builtin-obsidian-glass',
      completed: false,
      completedAtISO: null,
      notifiedAtISO: null,
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 50000000).toISOString(),
    },
    {
      id: 'seed-5',
      title: 'Prepare Hardware Lab Bench Setup',
      notes: 'Verify cables, firmware image, and test checklist.',
      deadlineISO: h(28),
      difficulty: 'medium',
      ringtoneId: null,
      completed: false,
      completedAtISO: null,
      notifiedAtISO: null,
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 36000000).toISOString(),
    },
    {
      id: 'seed-6',
      title: 'Organize Monthly Expense Receipts',
      notes: 'Export bank CSV and file receipts into archive folder.',
      deadlineISO: h(52),
      difficulty: 'easy',
      ringtoneId: 'builtin-gingerbread-bell',
      completed: false,
      completedAtISO: null,
      notifiedAtISO: null,
      snoozedUntilISO: null,
      createdAtISO: new Date(now - 18000000).toISOString(),
    },
    {
      id: 'seed-c1',
      title: 'Patch Auth Session Timeout Edge Case',
      notes: 'Verified token refresh across mobile viewports.',
      deadlineISO: h(-18),
      difficulty: 'hard',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-20),
      notifiedAtISO: h(-26),
      snoozedUntilISO: null,
      createdAtISO: h(-36),
    },
    {
      id: 'seed-c2',
      title: 'Draft Design Tokens Palette',
      notes: 'Locked in obsidian glass surfaces and hue curves.',
      deadlineISO: h(-42),
      difficulty: 'medium',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-44),
      notifiedAtISO: h(-50),
      snoozedUntilISO: null,
      createdAtISO: h(-60),
    },
    {
      id: 'seed-c3',
      title: 'Clean Local Build Artifacts',
      notes: 'Cleared stale cache directories.',
      deadlineISO: h(-40),
      difficulty: 'easy',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-43),
      notifiedAtISO: h(-48),
      snoozedUntilISO: null,
      createdAtISO: h(-54),
    },
    {
      id: 'seed-c4',
      title: 'Benchmark Countdown Timer Drift',
      notes: 'Confirmed sub-second alignment over 8-hour run.',
      deadlineISO: h(-70),
      difficulty: 'hard',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-72),
      notifiedAtISO: h(-79),
      snoozedUntilISO: null,
      createdAtISO: h(-90),
    },
    {
      id: 'seed-c5',
      title: 'Prepare Weekly Project Standup Notes',
      notes: 'Shared milestones and next sprint targets.',
      deadlineISO: h(-96),
      difficulty: 'medium',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-98),
      notifiedAtISO: h(-105),
      snoozedUntilISO: null,
      createdAtISO: h(-118),
    },
    {
      id: 'seed-c6',
      title: 'Archive Q3 Sprint Retrospectives',
      notes: 'Exported markdown summary.',
      deadlineISO: h(-122),
      difficulty: 'easy',
      ringtoneId: null,
      completed: true,
      completedAtISO: h(-124),
      notifiedAtISO: h(-130),
      snoozedUntilISO: null,
      createdAtISO: h(-140),
    },
  ];
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) {
      const seeded = buildInitialSampleTasks();
      localStorage.setItem(TASKS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return buildInitialSampleTasks();
  }
}

export function saveTasks(tasks: TaskItem[]): void {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // ignore storage write failures
  }
}

export function loadCustomRingtones(): RingtoneItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_RINGTONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomRingtones(items: RingtoneItem[]): void {
  try {
    localStorage.setItem(CUSTOM_RINGTONES_KEY, JSON.stringify(items));
  } catch {
    // ignore storage write failures
  }
}

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage write failures
  }
}
