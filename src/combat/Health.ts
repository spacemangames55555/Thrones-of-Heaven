/**
 * A reusable health pool. Generic across the player and any enemy.
 */
export class Health {
  readonly max: number;
  current: number;

  constructor(max: number) {
    this.max = max;
    this.current = max;
  }

  get ratio(): number {
    return this.max > 0 ? this.current / this.max : 0;
  }

  get isDead(): boolean {
    return this.current <= 0;
  }

  /** Apply damage; returns the amount actually removed (clamped at 0). */
  damage(amount: number): number {
    const before = this.current;
    this.current = Math.max(0, this.current - amount);
    return before - this.current;
  }

  heal(amount: number): void {
    this.current = Math.min(this.max, this.current + amount);
  }

  full(): void {
    this.current = this.max;
  }
}
