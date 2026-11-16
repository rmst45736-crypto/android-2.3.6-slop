import { RingtoneItem, RingtonePresetKey } from '../types/cadence';

const DB_NAME = 'cadence_audio_store';
const DB_VERSION = 1;
const STORE_NAME = 'custom_ringtones';

export const BUILTIN_RINGTONES: RingtoneItem[] = [
  {
    id: 'builtin-galaxy-breeze',
    name: 'Galaxy Breeze',
    description: 'Crisp polyphonic crystalline chime inspired by classic mobile bells',
    source: 'builtin',
    presetKey: 'galaxy_breeze',
    durationLabel: '3.2s loop',
  },
  {
    id: 'builtin-gingerbread-bell',
    name: 'Gingerbread Bell',
    description: 'Warm retro dual-tone synth ring with nostalgic chime harmonics',
    source: 'builtin',
    presetKey: 'gingerbread_bell',
    durationLabel: '2.8s loop',
  },
  {
    id: 'builtin-amber-pulse',
    name: 'Amber Pulse',
    description: 'Sharp ascending arpeggio engineered to cut through deep focus',
    source: 'builtin',
    presetKey: 'amber_pulse',
    durationLabel: '2.4s loop',
  },
  {
    id: 'builtin-obsidian-glass',
    name: 'Obsidian Glass',
    description: 'Minimal marimba-like glass resonance for low-friction reminders',
    source: 'builtin',
    presetKey: 'obsidian_glass',
    durationLabel: '3.0s loop',
  },
];

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open audio database'));
  });
}

export async function saveCustomAudioBlob(key: string, blob: Blob): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save audio blob'));
    };
  });
}

export async function getCustomAudioBlob(key: string): Promise<Blob | null> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as Blob) || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to load audio blob'));
    };
  });
}

export async function deleteCustomAudioBlob(key: string): Promise<void> {
  const db = await openAudioDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to delete audio blob'));
    };
  });
}

class RingtoneAudioEngine {
  private ctx: AudioContext | null = null;
  private loopTimer: number | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;
  private activePlayId = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public stop(): void {
    this.activePlayId += 1;
    if (this.loopTimer !== null) {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.currentTime = 0;
      } catch {
        // ignore cleanup error
      }
      this.activeHtmlAudio = null;
    }
    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  private playNote(
    ctx: AudioContext,
    freq: number,
    startOffset: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.35), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private triggerPresetOnce(preset: RingtonePresetKey, volume: number): number {
    const ctx = this.ensureContext();
    if (!ctx) return 2600;

    switch (preset) {
      case 'galaxy_breeze': {
        // E5 - B5 - F#6 - E6 crisp polyphonic bell phrase
        const notes = [
          { f: 659.25, t: 0.0, d: 0.36 },
          { f: 987.77, t: 0.16, d: 0.36 },
          { f: 1479.98, t: 0.32, d: 0.45 },
          { f: 1318.51, t: 0.56, d: 0.7 },
          { f: 987.77, t: 1.05, d: 0.35 },
          { f: 1318.51, t: 1.24, d: 0.8 },
        ];
        notes.forEach((n) => {
          this.playNote(ctx, n.f, n.t, n.d, 'sine', volume);
          this.playNote(ctx, n.f * 2, n.t, n.d * 0.6, 'triangle', volume * 0.25);
        });
        return 2800;
      }

      case 'gingerbread_bell': {
        // Retro classic double-chime ring
        const sequence = [0, 0.22, 0.44, 1.05, 1.27, 1.49];
        sequence.forEach((t, idx) => {
          const freq = idx % 2 === 0 ? 1174.66 : 1567.98;
          this.playNote(ctx, freq, t, 0.2, 'triangle', volume);
          this.playNote(ctx, freq * 0.5, t, 0.22, 'sine', volume * 0.45);
        });
        return 2600;
      }

      case 'amber_pulse': {
        // Urgent ascending pattern
        const freqs = [587.33, 739.99, 880, 1174.66, 880, 1174.66];
        freqs.forEach((f, idx) => {
          this.playNote(ctx, f, idx * 0.14, 0.22, 'sawtooth', volume * 0.45);
          this.playNote(ctx, f, idx * 0.14, 0.25, 'sine', volume * 0.7);
        });
        return 2200;
      }

      case 'obsidian_glass': {
        // Warm minimal glass marimba chord
        const chord = [
          { f: 523.25, t: 0.0, d: 0.8 },
          { f: 659.25, t: 0.18, d: 0.8 },
          { f: 783.99, t: 0.36, d: 0.9 },
          { f: 1046.5, t: 0.62, d: 1.1 },
        ];
        chord.forEach((n) => this.playNote(ctx, n.f, n.t, n.d, 'sine', volume));
        return 2700;
      }
    }
  }

  public async play(
    ringtone: RingtoneItem,
    volume: number,
    options?: { loop?: boolean; onEnded?: () => void }
  ): Promise<{ usedFallback: boolean }> {
    this.stop();
    const playId = this.activePlayId;
    const loop = options?.loop ?? false;

    if (ringtone.source === 'custom' && ringtone.indexedDbKey) {
      try {
        const blob = await getCustomAudioBlob(ringtone.indexedDbKey);
        if (playId !== this.activePlayId) return { usedFallback: false };
        if (blob) {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = Math.min(1, Math.max(0, volume));
          audio.loop = loop;
          this.activeObjectUrl = url;
          this.activeHtmlAudio = audio;

          audio.onended = () => {
            if (!loop && playId === this.activePlayId) {
              this.stop();
              options?.onEnded?.();
            }
          };

          await audio.play();
          return { usedFallback: false };
        }
      } catch {
        // Fall back to built-in synth chime if browser autoplay or decode fails
      }
    }

    if (playId !== this.activePlayId) return { usedFallback: false };

    const preset: RingtonePresetKey = ringtone.presetKey || 'galaxy_breeze';
    const intervalMs = this.triggerPresetOnce(preset, volume);

    if (loop) {
      this.loopTimer = window.setInterval(() => {
        if (playId !== this.activePlayId) return;
        this.triggerPresetOnce(preset, volume);
      }, intervalMs);
    } else {
      window.setTimeout(() => {
        if (playId === this.activePlayId) {
          options?.onEnded?.();
        }
      }, intervalMs - 200);
    }

    return { usedFallback: ringtone.source === 'custom' };
  }
}

export const ringtoneEngine = new RingtoneAudioEngine();
