/**
 * Firebaseデータ変換ユーティリティ
 *
 * FirestoreのTimestampオブジェクトをJavaScriptのDateオブジェクトに変換するなど、
 * データの型変換を行うユーティリティ関数を提供します。
 */

// インデックスシグネチャを持つ汎用オブジェクト型
interface IndexableObject {
  [key: string]: unknown;
}

/**
 * オブジェクト内のFirestore Timestampフィールドを処理する関数
 *
 * オブジェクト内のタイムスタンプフィールドを通常のJavaScriptのDateオブジェクトに変換します。
 * これにより、JSONシリアライズなどの処理が容易になります。
 *
 * @param data 処理対象のオブジェクト
 * @returns タイムスタンプが処理されたオブジェクト（元のオブジェクトを変更せず新しいオブジェクトを返す）
 */
export function processTimestamps<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  // 配列の場合は各要素を処理
  if (Array.isArray(data)) {
    return data.map((item) => processTimestamps(item)) as unknown as T;
  }

  // オブジェクトの場合はプロパティを処理
  // 書き込み可能な新しいオブジェクトを作成
  const result: Record<string, unknown> = { ...(data as object) };

  // すべてのプロパティを処理
  for (const key in result) {
    const value = result[key];

    // FirebaseのTimestampオブジェクトの特徴を持つかチェック
    if (
      value &&
      typeof value === "object" &&
      "toDate" in value &&
      typeof value.toDate === "function"
    ) {
      // TimestampをDateに変換
      result[key] = value.toDate();
    }
    // ネストされたオブジェクトを再帰的に処理
    else if (value && typeof value === "object") {
      result[key] = processTimestamps(value);
    }
  }

  return result as unknown as T;
}
