/**
 * 日付を「YYYY年MM月DD日」形式にフォーマットする
 * @param date フォーマットする日付
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * 日付を「YYYY年MM月DD日 HH:MM」形式にフォーマットする
 * @param date フォーマットする日付
 * @returns フォーマットされた日付と時刻の文字列
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
