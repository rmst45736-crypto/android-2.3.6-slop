import {
  Bell,
  BellRing,
  Check,
  Music,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AppPreferences, ComputedTaskMeta, RingtoneItem } from '../types/cadence';
import { ringtoneEngine, saveCustomAudioBlob } from '../utils/audioEngine';
import { formatDurationCompact } from '../utils/scheduling';

interface RingtoneStudioScreenProps {
  ringtones: RingtoneItem[];
  preferences: AppPreferences;
  activeMeta: ComputedTaskMeta[];
  onUpdatePreferences: (patch: Partial<AppPreferences>) => void;
  onAddCustomRingtone: (item: RingtoneItem) => void;
  onDeleteCustomRingtone: (id: string) => void;
  onTestAlarm: (meta?: ComputedTaskMeta) => void;
}

export function RingtoneStudioScreen({
  ringtones,
  preferences,
  activeMeta,
  onUpdatePreferences,
  onAddCustomRingtone,
  onDeleteCustomRingtone,
  onTestAlarm,
}: RingtoneStudioScreenProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      ringtoneEngine.stop();
    };
  }, []);

  const handleTogglePreview = async (item: RingtoneItem) => {
    if (playingId === item.id) {
      ringtoneEngine.stop();
      setPlayingId(null);
      return;
    }

    setPlayingId(item.id);
    await ringtoneEngine.play(item, preferences.volume, {
      loop: false,
      onEnded: () => {
        setPlayingId((curr) => (curr === item.id ? null : curr));
      },
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    const isAudio =
      file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name);

    if (!isAudio) {
      setUploadError('Please choose an audio file (.mp3, .wav, .ogg, .m4a, or .aac).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Audio file must be 15 MB or smaller.');
      return;
    }

    setIsUploading(true);
    try {
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const indexedDbKey = `blob-${id}`;
      await saveCustomAudioBlob(indexedDbKey, file);

      let durationLabel = `${(file.size / 1024).toFixed(0)} KB`;
      try {
        const probeUrl = URL.createObjectURL(file);
        const durationSec = await new Promise<number>((resolve) => {
          const audio = new Audio();
          audio.preload = 'metadata';
          audio.onloadedmetadata = () => {
            URL.revokeObjectURL(probeUrl);
            resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(probeUrl);
            resolve(0);
          };
          audio.src = probeUrl;
        });
        if (durationSec > 0) {
          const mins = Math.floor(durationSec / 60);
          const secs = Math.round(durationSec % 60);
          durationLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        }
      } catch {
        // Keep size fallback label
      }

      const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 42) || 'Custom Ringtone';

      const newRingtone: RingtoneItem = {
        id,
        name: cleanName,
        description: 'Custom uploaded audio saved locally in browser IndexedDB',
        source: 'custom',
        indexedDbKey,
        mimeType: file.type || 'audio/mpeg',
        durationLabel,
      };

      onAddCustomRingtone(newRingtone);
      onUpdatePreferences({ defaultRingtoneId: id });
      setUploadSuccess(`Added "${cleanName}" and set as default ringtone.`);
    } catch {
      setUploadError('Could not save this audio file locally. Check browser storage permissions.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      onUpdatePreferences({ notificationsEnabled: !preferences.notificationsEnabled });
      setNotifPermission('granted');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        onUpdatePreferences({ notificationsEnabled: true });
      }
    } catch {
      setNotifPermission('denied');
    }
  };

  const upcomingTriggers = activeMeta
    .slice()
    .sort((a, b) => a.reminderAtMs - b.reminderAtMs);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* Left Column: Sound Library & Custom Upload */}
      <section aria-label="Ringtone Library" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ringtones &amp; Early Alerts
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Pick a built-in retro chime or upload your own audio track
            </p>
          </div>

          <button
            type="button"
            onClick={() => onTestAlarm(activeMeta[0])}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-slate-950 transition-transform hover:bg-slate-200 active:scale-[0.98]"
          >
            <BellRing className="h-4 w-4" />
            <span>Simulate Alarm</span>
          </button>
        </div>

        {/* Upload Custom Audio Card */}
        <div className="rounded-3xl border border-white/[0.1] bg-white/[0.04] p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-[var(--font-display)] text-base font-semibold text-white">
                Custom Ringtone Upload
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Supports MP3, WAV, OGG, and M4A files up to 15 MB stored privately on your device.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.08] px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.15] disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>{isUploading ? 'Saving Audio...' : 'Upload Audio File'}</span>
            </button>
          </div>

          {uploadError && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-300">
              {uploadError}
            </p>
          )}
          {uploadSuccess && (
            <p className="mt-3 text-xs font-medium text-emerald-300">{uploadSuccess}</p>
          )}
        </div>

        {/* Ringtone Selection List */}
        <div className="space-y-2.5">
          {ringtones.map((item) => {
            const isDefault = preferences.defaultRingtoneId === item.id;
            const isPlaying = playingId === item.id;

            return (
              <div
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 backdrop-blur-xl transition-colors ${
                  isDefault
                    ? 'border-emerald-400/35 bg-emerald-500/[0.09]'
                    : 'border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleTogglePreview(item)}
                    aria-label={isPlaying ? `Stop ${item.name}` : `Preview ${item.name}`}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                      isPlaying
                        ? 'border-white/30 bg-white text-slate-950'
                        : 'border-white/[0.12] bg-black/30 text-white hover:bg-white/[0.12]'
                    }`}
                  >
                    {isPlaying ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate font-[var(--font-display)] text-sm font-semibold text-white sm:text-base">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        · {item.source === 'custom' ? 'Custom Upload' : 'Built-in'}
                      </span>
                      {item.durationLabel && (
                        <span className="font-mono text-xs text-slate-400">
                          · {item.durationLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.source === 'custom' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (playingId === item.id) {
                          ringtoneEngine.stop();
                          setPlayingId(null);
                        }
                        onDeleteCustomRingtone(item.id);
                      }}
                      aria-label={`Delete ${item.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onUpdatePreferences({ defaultRingtoneId: item.id })}
                    className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition-colors ${
                      isDefault
                        ? 'bg-emerald-400/20 text-emerald-200'
                        : 'border border-white/[0.12] bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]'
                    }`}
                  >
                    {isDefault ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Default</span>
                      </>
                    ) : (
                      <>
                        <Music className="h-3.5 w-3.5" />
                        <span>Use Default</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right Column: Reminder Rules, Notifications & Upcoming Schedule */}
      <aside className="space-y-4">
        <div className="rounded-3xl border border-white/[0.09] bg-white/[0.04] p-5 backdrop-blur-xl">
          <h2 className="font-[var(--font-display)] text-base font-semibold text-white">
            Reminder Engine Rules
          </h2>

          {/* Base lead time */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="base-lead-range" className="font-medium text-slate-300">
                Default Base Lead Time
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold tabular-nums text-white">
                  {preferences.baseLeadHours}h early
                </span>
                {preferences.baseLeadHours !== 6 && (
                  <button
                    type="button"
                    onClick={() => onUpdatePreferences({ baseLeadHours: 6 })}
                    aria-label="Reset base lead time to 6 hours"
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>6h</span>
                  </button>
                )}
              </div>
            </div>
            <input
              id="base-lead-range"
              type="range"
              min={1}
              max={12}
              step={1}
              value={preferences.baseLeadHours}
              onChange={(e) =>
                onUpdatePreferences({ baseLeadHours: Number(e.target.value) })
              }
              className="h-2 w-full cursor-pointer accent-white"
            />
            <p className="text-[11px] leading-relaxed text-slate-400">
              Stacked automatically with +1.5h (Medium) / +3h (Hard) and extra lead time whenever
              tasks share a ±1h deadline window.
            </p>
          </div>

          {/* Volume */}
          <div className="mt-5 space-y-2 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="ring-volume-range"
                className="inline-flex items-center gap-1.5 font-medium text-slate-300"
              >
                <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Ringtone Volume</span>
              </label>
              <span className="font-mono font-semibold tabular-nums text-white">
                {Math.round(preferences.volume * 100)}%
              </span>
            </div>
            <input
              id="ring-volume-range"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={preferences.volume}
              onChange={(e) => onUpdatePreferences({ volume: Number(e.target.value) })}
              className="h-2 w-full cursor-pointer accent-white"
            />
          </div>

          {/* Snooze Duration */}
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <span className="block text-xs font-medium text-slate-300">Snooze Interval</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onUpdatePreferences({ snoozeMinutes: mins })}
                  className={`h-10 rounded-xl text-xs font-semibold transition-colors ${
                    preferences.snoozeMinutes === mins
                      ? 'bg-white text-slate-950'
                      : 'border border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>

          {/* Browser Notification Permission */}
          <div className="mt-5 border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-200">Browser Alerts</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {notifPermission === 'unsupported'
                    ? 'In-app alarms active (Notification API unavailable)'
                    : notifPermission === 'granted'
                    ? preferences.notificationsEnabled
                      ? 'System notifications enabled'
                      : 'Permission granted · Alerts paused'
                    : notifPermission === 'denied'
                    ? 'Blocked in browser settings · In-app alarms active'
                    : 'Allow system alerts when a reminder triggers'}
                </p>
              </div>
              {notifPermission !== 'unsupported' && notifPermission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors ${
                    notifPermission === 'granted' && preferences.notificationsEnabled
                      ? 'bg-emerald-400/20 text-emerald-200'
                      : 'bg-white text-slate-950 hover:bg-slate-200'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>
                    {notifPermission === 'granted'
                      ? preferences.notificationsEnabled
                        ? 'Active'
                        : 'Resume'
                      : 'Enable'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Ring Timeline */}
        <div className="rounded-3xl border border-white/[0.09] bg-white/[0.04] p-5 backdrop-blur-xl">
          <h2 className="font-[var(--font-display)] text-base font-semibold text-white">
            Reminder Schedule
          </h2>
          {upcomingTriggers.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No active tasks scheduled.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.07]">
              {upcomingTriggers.slice(0, 5).map((m) => (
                <li key={m.task.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-slate-200">
                      {m.task.title}
                    </span>
                    <span
                      style={{ color: m.accentTextStyle }}
                      className="shrink-0 font-mono text-xs font-medium tabular-nums"
                    >
                      {formatDurationCompact(m.totalLeadMinutes)} early
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {m.reminderLabel} · Due {m.deadlineLabel}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
