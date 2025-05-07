/**
 * 日付を「YYYY年MM月DD日」形式にフォーマットする
 * @param date フォーマットする日付（Date型またはISO文字列）
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date | string | undefined): string {
  // 引数がundefinedの場合は現在日時を使用
  if (date === undefined) {
    return formatDate(new Date());
  }

  // 文字列の場合はDateオブジェクトに変換
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // 日本語ローカライズでフォーマット
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(dateObj);
}

/**
 * 日付を「YYYY年MM月DD日 HH:MM」形式にフォーマットする
 * @param date フォーマットする日付（Date型またはISO文字列）
 * @returns フォーマットされた日付と時刻の文字列
 */
export function formatDateTime(date: Date | string | undefined): string {
  // 引数がundefinedの場合は現在日時を使用
  if (date === undefined) {
    return formatDateTime(new Date());
  }

  // 文字列の場合はDateオブジェクトに変換
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // 日本語ローカライズでフォーマット
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}
