type AudioBus = 'sfx' | 'voice' | 'music';
type UnitType = string;

interface AudioClip {
  url: string;
  buffer?: AudioBuffer;
  loading?: boolean;
}

export class TacticalAudio {
  private static ctx: AudioContext | null = null;
  private static unlocked = false;
  private static buses: Record<AudioBus, GainNode | null> = { sfx: null, voice: null, music: null };
  private static busVolumes: Record<AudioBus, number> = { sfx: 0.6, voice: 0.85, music: 0.45 };
  private static cache: Map<string, AudioClip> = new Map();
  private static currentVoice: AudioBufferSourceNode | null = null;
  private static currentBriefing: AudioBufferSourceNode | null = null;

  private static getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupBuses();
      }
    }
    return this.ctx;
  }

  private static setupBuses(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    (Object.keys(this.buses) as AudioBus[]).forEach((bus) => {
      const gain = ctx.createGain();
      gain.gain.value = this.busVolumes[bus];
      gain.connect(ctx.destination);
      this.buses[bus] = gain;
    });
  }

  public static unlock(): void {
    if (this.unlocked || typeof window === 'undefined') return;
    this.getContext();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.unlocked = true;
      });
    } else {
      this.unlocked = true;
    }
  }

  private static ensureUnlockListeners(): void {
    if (typeof window === 'undefined' || this.unlocked) return;
    const once = (): void => {
      this.unlock();
      window.removeEventListener('click', once);
      window.removeEventListener('touchstart', once);
      window.removeEventListener('keydown', once);
    };
    window.addEventListener('click', once, { passive: true });
    window.addEventListener('touchstart', once, { passive: true });
    window.addEventListener('keydown', once, { passive: true });
  }

  private static async loadClip(url: string): Promise<AudioBuffer | null> {
    const ctx = this.getContext();
    if (!ctx) return null;

    const existing = this.cache.get(url);
    if (existing?.buffer) return existing.buffer;
    if (existing?.loading) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          const clip = this.cache.get(url);
          if (clip && !clip.loading) {
            clearInterval(check);
            resolve(clip.buffer ?? null);
          }
        }, 50);
      });
    }

    this.cache.set(url, { url, loading: true });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      this.cache.set(url, { url, buffer });
      return buffer;
    } catch (err) {
      this.cache.set(url, { url });
      return null;
    }
  }

  private static playBuffer(buffer: AudioBuffer, bus: AudioBus, loop = false): AudioBufferSourceNode | null {
    const ctx = this.getContext();
    const busNode = this.buses[bus];
    if (!ctx || !busNode) return null;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(busNode);
    source.start();
    return source;
  }

  private static stopVoice(): void {
    try {
      this.currentVoice?.stop();
    } catch {
      // ignore
    }
    this.currentVoice = null;
  }

  private static stopBriefing(): void {
    try {
      this.currentBriefing?.stop();
    } catch {
      // ignore
    }
    this.currentBriefing = null;
  }

  /** Som de rádio / chirp tático ao selecionar uma unidade. */
  public static playSelect(unitType?: UnitType): void {
    this.ensureUnlockListeners();
    this.unlock();
    this.stopVoice();
    const url = this.resolveVoiceLine(unitType, 'select');
    if (url) {
      void this.loadClip(url).then((buffer) => {
        if (buffer) this.currentVoice = this.playBuffer(buffer, 'voice');
      });
    } else {
      this.playOscillator(880, 1320, 0.08, 'sine', 'sfx');
    }
  }

  /** Confirmação de comando (mover/coletar/etc). */
  public static playCommand(unitType?: UnitType, _order?: string): void {
    this.ensureUnlockListeners();
    this.unlock();
    this.stopVoice();
    const url = this.resolveVoiceLine(unitType, 'move');
    if (url) {
      void this.loadClip(url).then((buffer) => {
        if (buffer) this.currentVoice = this.playBuffer(buffer, 'voice');
      });
    } else {
      this.playOscillator(440, 220, 0.09, 'triangle', 'sfx');
    }
  }

  /** Efeitos de gameplay (gather, deposit, under-attack, construction-done). */
  public static playEffect(cue: 'gather' | 'deposit' | 'under-attack' | 'construction-done'): void {
    this.ensureUnlockListeners();
    this.unlock();
    const url = this.resolveEffect(cue);
    if (url) {
      void this.loadClip(url).then((buffer) => {
        if (buffer) this.playBuffer(buffer, 'sfx');
      });
    } else {
      this.playOscillator(cue === 'gather' ? 660 : 330, cue === 'gather' ? 880 : 165, 0.08, 'sine', 'sfx');
    }
  }

  /** Toca briefing de era; autoplay só funciona após gesto do usuário. */
  public static playBriefing(eraId: number): void {
    this.ensureUnlockListeners();
    this.unlock();
    this.stopBriefing();
    const url = `/assets/audio/era-${eraId}-briefing.mp3`;
    void this.loadClip(url).then((buffer) => {
      if (buffer) this.currentBriefing = this.playBuffer(buffer, 'voice');
    });
  }

  private static resolveVoiceLine(unitType: UnitType | undefined, kind: 'select' | 'move'): string | null {
    if (!unitType) return null;
    const map: Record<string, string> = {
      SCAVENGER_WORKER: `unit-${kind}-scavenger`,
      RUST_RAIDER: `unit-${kind}-raider`,
      SCRAP_BUGGY: `unit-${kind}-buggy`,
      MAINTENANCE_DRONE: `unit-${kind}-drone`,
      BIPED_MECH: `unit-${kind}-mech`
    };
    const key = map[unitType];
    return key ? `/assets/audio/${key}.mp3` : null;
  }

  private static resolveEffect(cue: string): string | null {
    if (cue === 'under-attack') return '/assets/audio/alert-under-attack.mp3';
    if (cue === 'construction-done') return '/assets/audio/alert-construction-done.mp3';
    return null;
  }

  public static debugState(): {
    ctxState: string;
    unlocked: boolean;
    cached: string[];
    lastError?: string;
  } {
    return {
      ctxState: this.ctx?.state ?? 'null',
      unlocked: this.unlocked,
      cached: Array.from(this.cache.keys())
    };
  }

  private static playOscillator(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    bus: AudioBus
  ): void {
    const ctx = this.getContext();
    const busNode = this.buses[bus];
    if (!ctx || !busNode) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(busNode);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}
