/**
 * 日付をJSON化可能な文字列形式に安全に変換する
 * serverComponentからclientComponentに渡す際のシリアライズエラーを防ぐ
 *
 * @param date 変換する日付（Date | string | undefined | null）
 * @returns ISO形式の文字列
 */
export function toSafeDate(date: Date | string | unknown): string {
  if (!date) return new Date().toISOString(); // undefinedの代わりに現在時刻を返す

  try {
    // 既に文字列の場合はそのまま返す
    if (typeof date === "string") {
      return date;
    }

    // Dateオブジェクトの場合はISO文字列に変換
    if (date instanceof Date) {
      return date.toISOString();
    }

    // その他の型の場合は文字列に変換を試みる
    return String(date);
  } catch (error) {
    console.warn("日付の変換に失敗しました:", error);
    // 変換に失敗した場合は現在時刻を返す
    return new Date().toISOString();
  }
}

/**
 * 日付プロパティを持つ可能性のあるオブジェクトの型
 */
type DateLikeObject = Record<
  string,
  Date | string | number | boolean | null | undefined | string[] | unknown[]
>;

/**
 * 音声クリップのデータを安全に変換する
 * サーバーコンポーネントからクライアントコンポーネントに渡す際のシリアライズエラーを防ぐ
 *
 * @param clip 変換する音声クリップデータ
 * @returns 安全に変換された音声クリップデータ
 */
export function sanitizeClipForClient<T extends DateLikeObject>(clip: T): T {
  // 深いコピーを作成（型安全な方法で）
  const sanitized = { ...clip } as Record<string, unknown>;

  // 日付と思われるプロパティを安全な文字列に変換
  const dateProperties = ["createdAt", "updatedAt", "lastPlayedAt"];

  for (const prop of dateProperties) {
    if (prop in sanitized) {
      // 日付プロパティを文字列に変換
      sanitized[prop] = toSafeDate(sanitized[prop]);
    }
  }

  // 元の型にキャストして返す
  return sanitized as T;
}

/**
 * 複数の音声クリップデータを安全に変換する
 *
 * @param clips 変換する音声クリップデータの配列
 * @returns 安全に変換された音声クリップデータの配列
 */
export function sanitizeClipsForClient<T extends DateLikeObject>(
  clips: T[],
): T[] {
  return clips.map((clip) => sanitizeClipForClient(clip));
}
