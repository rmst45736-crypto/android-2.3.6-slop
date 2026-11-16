export type Difficulty = 'hard' | 'medium' | 'easy';

export type ScreenIndex = 0 | 1 | 2;

export type RingtonePresetKey =
  | 'galaxy_breeze'
  | 'gingerbread_bell'
  | 'amber_pulse'
  | 'obsidian_glass';

export interface RingtoneItem {
  id: string;
  name: string;
  description: string;
  source: 'builtin' | 'custom';
  presetKey?: RingtonePresetKey;
  indexedDbKey?: string;
  mimeType?: string;
  durationLabel?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  deadlineISO: string;
  difficulty: Difficulty;
  ringtoneId: string | null;
  completed: boolean;
  completedAtISO: string | null;
  notifiedAtISO: string | null;
  snoozedUntilISO: string | null;
  createdAtISO: string;
}

export interface AppPreferences {
  baseLeadHours: number;
  defaultRingtoneId: string;
  volume: number;
  snoozeMinutes: number;
  notificationsEnabled: boolean;
  showCompleted: boolean;
}

export interface ComputedTaskMeta {
  task: TaskItem;
  rankIndex: number;
  totalActive: number;
  deadlineMs: number;
  msRemaining: number;
  isOverdue: boolean;
  countdownText: string;
  deadlineLabel: string;
  baseLeadMinutes: number;
  difficultyBonusMinutes: number;
  collisionCount: number;
  collisionBonusMinutes: number;
  totalLeadMinutes: number;
  reminderAtMs: number;
  msUntilReminder: number;
  isInReminderWindow: boolean;
  reminderLabel: string;
  leadBreakdownText: string;
  hue: number;
  urgencyLabel: 'Overdue' | 'Critical' | 'Urgent' | 'Soon' | 'Upcoming' | 'Scheduled';
  cardBgStyle: string;
  cardBorderStyle: string;
  accentTextStyle: string;
  glowStyle: string;
}

export interface ActiveAlarm {
  taskId: string;
  title: string;
  difficulty: Difficulty;
  deadlineISO: string;
  ringtoneId: string;
  reason: string;
  isTest?: boolean;
}
