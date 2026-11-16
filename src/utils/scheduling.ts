import { ComputedTaskMeta, Difficulty, TaskItem } from '../types/cadence';

export const CLUSTER_WINDOW_MS = 60 * 60 * 1000; // ±60 minutes counts as same deadline window
const MAX_COLLISION_BONUS_MINUTES = 360; // Cap stacked collision bonus at +6h

export const DIFFICULTY_META: Record<
  Difficulty,
  {
    label: string;
    bonusMinutes: number;
    collisionWeightMinutes: number;
    hueShift: number;
    description: string;
  }
> = {
  hard: {
    label: 'Hard',
    bonusMinutes: 180, // +3h
    collisionWeightMinutes: 120, // +2h per colliding hard task
    hueShift: -28,
    description: 'High impact · +3h early lead · shifts color toward red',
  },
  medium: {
    label: 'Medium',
    bonusMinutes: 90, // +1.5h
    collisionWeightMinutes: 90, // +1.5h per colliding medium task
    hueShift: 0,
    description: 'Standard priority · +1.5h early lead · neutral position hue',
  },
  easy: {
    label: 'Easy',
    bonusMinutes: 0, // +0h
    collisionWeightMinutes: 60, // +1h per colliding easy task
    hueShift: 24,
    description: 'Low friction · 6h base lead · shifts color toward green',
  },
};

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function formatDurationCompact(totalMinutes: number): string {
  const rounded = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function formatCountdown(diffMs: number): string {
  const overdue = diffMs < 0;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);

  const days = Math.floor(absSec / 86400);
  const hours = Math.floor((absSec % 86400) / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const seconds = absSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  let core: string;
  if (days > 0) {
    core = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    core = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return overdue ? `-${core}` : core;
}

export function formatDeadlineDisplay(deadlineMs: number, nowMs: number): string {
  const d = new Date(deadlineMs);
  const now = new Date(nowMs);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDeadline = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDeadline - startOfToday) / 86400000);

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (dayDiff === 0) return `Today, ${timeStr}`;
  if (dayDiff === 1) return `Tomorrow, ${timeStr}`;
  if (dayDiff === -1) return `Yesterday, ${timeStr}`;

  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${dateStr}, ${timeStr}`;
}

export function formatReminderClock(reminderMs: number, nowMs: number): string {
  if (reminderMs <= nowMs) {
    return 'Reminder active';
  }
  const diff = reminderMs - nowMs;
  if (diff < 60 * 60 * 1000) {
    const mins = Math.max(1, Math.ceil(diff / 60000));
    return `Rings in ${mins}m`;
  }
  const d = new Date(reminderMs);
  const now = new Date(nowMs);
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Rings at ${timeStr}`;

  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `Rings ${dateStr}, ${timeStr}`;
}

export function computeSingleTaskLead(
  target: { deadlineISO: string; difficulty: Difficulty; id?: string },
  allActiveTasks: TaskItem[],
  baseLeadHours: number
): {
  baseLeadMinutes: number;
  difficultyBonusMinutes: number;
  collisionCount: number;
  collisionBonusMinutes: number;
  totalLeadMinutes: number;
  reminderAtMs: number;
  leadBreakdownText: string;
} {
  const deadlineMs = new Date(target.deadlineISO).getTime();
  const baseLeadMinutes = Math.round(clamp(baseLeadHours, 1, 24) * 60);
  const difficultyBonusMinutes = DIFFICULTY_META[target.difficulty].bonusMinutes;

  const collidingTasks = allActiveTasks.filter((other) => {
    if (other.completed) return false;
    if (target.id && other.id === target.id) return false;
    const otherMs = new Date(other.deadlineISO).getTime();
    return Math.abs(otherMs - deadlineMs) <= CLUSTER_WINDOW_MS;
  });

  const collisionCount = collidingTasks.length;
  const rawCollisionMinutes = collidingTasks.reduce(
    (sum, other) => sum + DIFFICULTY_META[other.difficulty].collisionWeightMinutes,
    0
  );
  const collisionBonusMinutes = Math.min(MAX_COLLISION_BONUS_MINUTES, rawCollisionMinutes);

  const totalLeadMinutes = baseLeadMinutes + difficultyBonusMinutes + collisionBonusMinutes;
  const reminderAtMs = deadlineMs - totalLeadMinutes * 60 * 1000;

  const parts: string[] = [`${formatDurationCompact(baseLeadMinutes)} base`];
  if (difficultyBonusMinutes > 0) {
    parts.push(`+${formatDurationCompact(difficultyBonusMinutes)} ${DIFFICULTY_META[target.difficulty].label}`);
  }
  if (collisionBonusMinutes > 0) {
    parts.push(
      `+${formatDurationCompact(collisionBonusMinutes)} stacked (${collisionCount} shared)`
    );
  }

  return {
    baseLeadMinutes,
    difficultyBonusMinutes,
    collisionCount,
    collisionBonusMinutes,
    totalLeadMinutes,
    reminderAtMs,
    leadBreakdownText: `${formatDurationCompact(totalLeadMinutes)} early · ${parts.join(' ')}`,
  };
}

export function computeTasksWithMeta(
  tasks: TaskItem[],
  nowMs: number,
  baseLeadHours: number
): {
  activeMeta: ComputedTaskMeta[];
  completedTasks: TaskItem[];
} {
  const activeTasks = tasks
    .filter((t) => !t.completed)
    .slice()
    .sort((a, b) => new Date(a.deadlineISO).getTime() - new Date(b.deadlineISO).getTime());

  const completedTasks = tasks
    .filter((t) => t.completed)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.completedAtISO || a.deadlineISO).getTime();
      const bTime = new Date(b.completedAtISO || b.deadlineISO).getTime();
      return bTime - aTime;
    });

  const totalActive = activeTasks.length;

  const activeMeta: ComputedTaskMeta[] = activeTasks.map((task, idx) => {
    const deadlineMs = new Date(task.deadlineISO).getTime();
    const msRemaining = deadlineMs - nowMs;
    const isOverdue = msRemaining <= 0;

    const lead = computeSingleTaskLead(task, activeTasks, baseLeadHours);
    const msUntilReminder = lead.reminderAtMs - nowMs;
    const isInReminderWindow = msUntilReminder <= 0;

    // Positional gradient: 0 (top, nearest deadline) -> 1 (bottom, furthest deadline)
    // If only 1 task exists, anchor by time remaining (close = red, far = greener)
    let positionRatio: number;
    if (totalActive <= 1) {
      const hoursOut = clamp(msRemaining / 3600000, 0, 48);
      positionRatio = hoursOut / 48;
    } else {
      positionRatio = idx / (totalActive - 1);
    }

    // Base hue from 0 (crimson red) at top to 142 (emerald green) at bottom
    const baseHue = positionRatio * 142;
    const difficultyShift = DIFFICULTY_META[task.difficulty].hueShift;
    const hue = isOverdue ? 0 : Math.round(clamp(baseHue + difficultyShift, 0, 144));

    let urgencyLabel: ComputedTaskMeta['urgencyLabel'];
    if (isOverdue) {
      urgencyLabel = 'Overdue';
    } else if (hue <= 18) {
      urgencyLabel = 'Critical';
    } else if (hue <= 45) {
      urgencyLabel = 'Urgent';
    } else if (hue <= 82) {
      urgencyLabel = 'Soon';
    } else if (hue <= 115) {
      urgencyLabel = 'Upcoming';
    } else {
      urgencyLabel = 'Scheduled';
    }

    // Subtle glassmorphism color tints driven by the computed Red->Green shifted hue
    const cardBgStyle = `linear-gradient(135deg, hsla(${hue}, 82%, 48%, 0.13) 0%, hsla(${hue}, 65%, 24%, 0.06) 55%, rgba(255, 255, 255, 0.03) 100%)`;
    const cardBorderStyle = `hsla(${hue}, 78%, 58%, 0.28)`;
    const accentTextStyle = `hsl(${hue}, 86%, 72%)`;
    const glowStyle = `0 12px 32px -12px hsla(${hue}, 85%, 45%, 0.24)`;

    return {
      task,
      rankIndex: idx,
      totalActive,
      deadlineMs,
      msRemaining,
      isOverdue,
      countdownText: formatCountdown(msRemaining),
      deadlineLabel: formatDeadlineDisplay(deadlineMs, nowMs),
      baseLeadMinutes: lead.baseLeadMinutes,
      difficultyBonusMinutes: lead.difficultyBonusMinutes,
      collisionCount: lead.collisionCount,
      collisionBonusMinutes: lead.collisionBonusMinutes,
      totalLeadMinutes: lead.totalLeadMinutes,
      reminderAtMs: lead.reminderAtMs,
      msUntilReminder,
      isInReminderWindow,
      reminderLabel: formatReminderClock(lead.reminderAtMs, nowMs),
      leadBreakdownText: lead.leadBreakdownText,
      hue,
      urgencyLabel,
      cardBgStyle,
      cardBorderStyle,
      accentTextStyle,
      glowStyle,
    };
  });

  return { activeMeta, completedTasks };
}
