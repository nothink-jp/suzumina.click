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

    // Timestamp型のオブジェクトの場合
    if (
      typeof date === "object" &&
      date !== null &&
      "toDate" in date &&
      typeof date.toDate === "function"
    ) {
      return date.toDate().toISOString();
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
 * 基本的な音声クリップデータ構造のインターフェース
 * エラーハンドリング時の型安全性のために使用
 */
interface BaseAudioClip {
  id?: string;
  title?: string;
  startTime?: number;
  endTime?: number;
  [key: string]: unknown;
}

/**
 * 音声クリップのデータを安全に変換する
 * サーバーコンポーネントからクライアントコンポーネントに渡す際のシリアライズエラーを防ぐ
 *
 * @param clip 変換する音声クリップデータ
 * @returns 安全に変換された音声クリップデータ
 */
export function sanitizeClipForClient<T extends DateLikeObject>(clip: T): T {
  try {
    // 1. まず型安全に扱うためにRecordとして扱う
    const record = clip as Record<string, unknown>;
    // オブジェクトをシャローコピー
    const preProcessed: Record<string, unknown> = { ...record };

    // 日付と思われるプロパティを安全な文字列に変換
    const dateProperties = ["createdAt", "updatedAt", "lastPlayedAt"];
    for (const prop of dateProperties) {
      if (prop in preProcessed) {
        // 日付プロパティを文字列に変換 (型安全なアクセス)
        preProcessed[prop] = toSafeDate(preProcessed[prop]);
      }
    }

    // 2. オブジェクト全体をJSON.stringify→JSON.parseでプロトタイプを完全に除去
    // これにより非シリアライズ可能なオブジェクトが含まれていても問題を回避できる
    const serializedString = JSON.stringify(preProcessed);
    const fullySerializedObject = JSON.parse(serializedString);

    // 型キャストして返す
    return fullySerializedObject as T;
  } catch (error) {
    console.error("クリップのシリアライズ中にエラーが発生しました:", error);

    // エラーが発生した場合はできるだけ多くの安全なデータを返そうとする
    try {
      // clipをBaseAudioClip型として扱い、型安全にアクセス
      const baseClip = clip as unknown as BaseAudioClip;

      // 最低限必要な情報だけのオブジェクトを作成
      const safeMinimalObject = {
        id: typeof baseClip.id === "string" ? baseClip.id : "",
        title:
          typeof baseClip.title === "string" ? baseClip.title : "タイトルなし",
        startTime:
          typeof baseClip.startTime === "number" ? baseClip.startTime : 0,
        endTime: typeof baseClip.endTime === "number" ? baseClip.endTime : 0,
      };
      return safeMinimalObject as unknown as T;
    } catch {
      // 最後の手段として空のオブジェクトを返す
      return {} as T;
    }
  }
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
  if (!Array.isArray(clips)) {
    return [];
  }

  return clips.map((clip) => sanitizeClipForClient(clip));
}
