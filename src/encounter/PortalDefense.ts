import {
  PORTAL_DEFENSE_WAVES,
  PORTAL_DEFENSE_BREATHER_MS,
  PORTAL_DEFENSE_INTRO_MS,
  PORTAL_DEFENSE_WAVE_TIMEOUT_MS,
  PORTAL_SPAWN_OFFSETS,
} from '../game/settings';

export type EncounterStatus = 'idle' | 'active' | 'won' | 'lost';

/** The complete, SERIALIZABLE encounter state (feeds a future save system). */
export interface PortalDefenseState {
  status: EncounterStatus;
  /** 0-based index of the current wave (-1 before the first). */
  currentWave: number;
  phase: 'breather' | 'fighting';
}

/**
 * The portal-defense WAVE manager — the encounter's centralized brain, kept
 * separate from rendering. It runs a sequence of escalating waves (data:
 * PORTAL_DEFENSE_WAVES): a short breather, then spawn the wave's townsfolk from
 * the configured spawn points; a wave clears when all its townsfolk are dead (or
 * a non-final wave times out as a stall-safety), then a breather, then the next.
 * Surviving the last wave WINS; the portal hitting 0 HP (reported by the scene)
 * LOSES. It owns no world objects — it drives the scene through discrete hooks
 * (spawn / wave-start / win / lose) and is a TRIGGERABLE unit (start/stop) a
 * future quest objective can launch.
 */
export class PortalDefense {
  private state: EncounterStatus = 'idle';
  private currentWave = -1;
  private phase: 'breather' | 'fighting' = 'breather';
  private phaseEndsAt = 0; // when the current breather ends
  private waveTimeoutAt = 0; // stall-safety for a fighting wave

  /** Spawn ONE townsfolk at the given world offset from the portal. */
  onSpawn?: (offset: { dx: number; dy: number }, indexInWave: number) => void;
  /** A wave is starting (1-based number, total). */
  onWaveStart?: (wave: number, total: number) => void;
  onWin?: () => void;
  onLose?: () => void;
  /** The scene reports how many townsfolk are still alive. */
  aliveCount: () => number = () => 0;

  get status(): EncounterStatus {
    return this.state;
  }
  get isActive(): boolean {
    return this.state === 'active';
  }
  /** 1-based current wave (0 during the intro breather). */
  get waveNumber(): number {
    return this.currentWave + 1;
  }
  get totalWaves(): number {
    return PORTAL_DEFENSE_WAVES.length;
  }

  /** Begin the encounter (no-op if already running). */
  start(time: number): void {
    if (this.state === 'active') return;
    this.state = 'active';
    this.currentWave = -1;
    this.phase = 'breather';
    this.phaseEndsAt = time + PORTAL_DEFENSE_INTRO_MS;
  }

  /** End + reset to idle (the scene clears townsfolk + restores the portal). */
  stop(): void {
    this.state = 'idle';
    this.currentWave = -1;
    this.phase = 'breather';
  }

  /** The scene calls this the moment the portal's HP reaches 0. */
  notifyPortalDestroyed(): void {
    if (this.state !== 'active') return;
    this.state = 'lost';
    this.onLose?.();
  }

  update(time: number): void {
    if (this.state !== 'active') return;

    if (this.phase === 'breather') {
      if (time >= this.phaseEndsAt) this.startNextWave(time);
      return;
    }

    // Fighting: advance when the wave is cleared, or (non-final) when it stalls.
    const cleared = this.aliveCount() === 0;
    const isLast = this.currentWave >= PORTAL_DEFENSE_WAVES.length - 1;
    if (cleared) {
      if (isLast) this.win();
      else this.beginBreather(time);
    } else if (!isLast && time >= this.waveTimeoutAt) {
      this.beginBreather(time); // stragglers persist; keep the sequence moving
    }
  }

  // --- Serialization (structural state for the future save system) ----------

  toJSON(): PortalDefenseState {
    return { status: this.state, currentWave: this.currentWave, phase: this.phase };
  }
  load(s: PortalDefenseState): void {
    this.state = s.status;
    this.currentWave = s.currentWave;
    this.phase = s.phase;
  }

  // --- internals ------------------------------------------------------------

  private beginBreather(time: number): void {
    this.phase = 'breather';
    this.phaseEndsAt = time + PORTAL_DEFENSE_BREATHER_MS;
  }

  private startNextWave(time: number): void {
    this.currentWave += 1;
    this.phase = 'fighting';
    this.waveTimeoutAt = time + PORTAL_DEFENSE_WAVE_TIMEOUT_MS;
    this.onWaveStart?.(this.currentWave + 1, this.totalWaves);
    const count = PORTAL_DEFENSE_WAVES[this.currentWave];
    for (let i = 0; i < count; i++) {
      this.onSpawn?.(PORTAL_SPAWN_OFFSETS[i % PORTAL_SPAWN_OFFSETS.length], i);
    }
  }

  private win(): void {
    this.state = 'won';
    this.onWin?.();
  }
}
