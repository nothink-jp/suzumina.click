/**
 * 再生進捗の監視・通知間隔（ms）の正本。
 * youtube-player-pool の監視タイマーと、進捗フィルの CSS transition の両方がこの値を参照する。
 * transition がこの間隔より短いと「動く→止まる」のカクつきになる（SPR-259）。
 */
export const PROGRESS_TICK_MS = 250;
