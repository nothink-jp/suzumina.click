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
 * Firestoreのタイムスタンプに似た構造を持つオブジェクトの型
 * toDate メソッドを持つオブジェクトを表現
 */
interface TimestampLike {
  toDate: () => Date;
}

/**
 * 値を再帰的に安全なプレーンな値に変換する
 * 特にNext.jsのサーバーコンポーネントからクライアントコンポーネントに渡す際の
 * シリアライズエラーを防ぐため
 *
 * @param value 変換する値
 * @returns シリアライズ可能な値
 */
function deepSanitize(value: unknown): unknown {
  // nullまたはundefinedはそのまま
  if (value == null) {
    return value;
  }

  // 日付オブジェクトはISO文字列に変換
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Timestampなどの特殊なオブジェクト（toDate()メソッドを持つ）
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    try {
      return (value as TimestampLike).toDate().toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  }

  // 配列の場合は各要素を再帰的に処理
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitize(item));
  }

  // オブジェクトの場合はプロパティごとに再帰的に処理
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};

    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = deepSanitize((value as Record<string, unknown>)[key]);
      }
    }

    return result;
  }

  // プリミティブ値（文字列、数値、真偽値）はそのまま返す
  return value;
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
    // 1. まず再帰的に全てのプロパティを安全な値に変換
    const sanitizedData = deepSanitize(clip);

    // 2. 特定の日付プロパティが存在するか確認し、確実に処理する
    const result = sanitizedData as Record<string, unknown>;
    const dateProperties = ["createdAt", "updatedAt", "lastPlayedAt"];

    for (const prop of dateProperties) {
      if (prop in result) {
        // 既に文字列に変換されているものはそのまま、それ以外は文字列に変換
        if (typeof result[prop] !== "string") {
          result[prop] = toSafeDate(result[prop]);
        }
      }
    }

    // 3. JSON.stringify → JSON.parseでプロトタイプをすべて除去し、純粋なプレーンオブジェクトにする
    // これにより、プロトタイプがnullになり、Next.jsのシリアライズエラーを回避
    const serialized = JSON.stringify(result);
    const plainObject = JSON.parse(serialized);

    // デバッグログ
    console.log(
      "シリアライズ後のプレーンオブジェクト:",
      Object.keys(plainObject).map(
        (key) => `${key}: ${typeof plainObject[key]}`,
      ),
    );

    return plainObject as T;
  } catch (error) {
    console.error("クリップのシリアライズ中にエラーが発生しました:", error);
    console.error("問題のあるデータ:", clip);

    // エラー時のフォールバック: 最低限必要な情報のみのオブジェクトを返す
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // さらにプロトタイプを完全に除去
      const serialized = JSON.stringify(safeMinimalObject);
      return JSON.parse(serialized) as unknown as T;
    } catch {
      // 最後の手段として空のオブジェクトを返す
      console.error("フォールバックオブジェクトの作成にも失敗しました");
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
