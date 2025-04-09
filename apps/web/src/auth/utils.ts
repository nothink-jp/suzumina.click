/**
 * 本番ランタイム環境で必須の環境変数が設定されていない場合にスローされるエラー。
 */
export class ConfigurationError extends Error {
  /**
   * ConfigurationError のインスタンスを作成します。
   * @param envVar - 設定されていない環境変数の名前。
   */
  constructor(envVar: string) {
    super(
      `Configuration Error: ${envVar} is not defined in the production runtime environment. Please ensure it is set correctly.`,
    );
    this.name = "ConfigurationError";
  }
}

/**
 * 現在のプロセスが Next.js のビルドフェーズで実行されているかどうかを判定します。
 * @returns ビルドフェーズの場合は true、それ以外の場合は false。
 */
export const isBuildTime = () => {
  // NEXT_PHASE環境変数がビルド時に設定される
  return process.env.NEXT_PHASE === "phase-production-build";
};

/**
 * 現在のプロセスが本番環境のランタイムで実行されているかどうかを判定します。
 * ビルドフェーズは除外されます。
 * @returns 本番ランタイムの場合は true、それ以外の場合は false。
 */
export const isProductionRuntime = () => {
  return process.env.NODE_ENV === "production" && !isBuildTime();
};

/**
 * 指定されたキーの環境変数を取得します。
 * ビルド時にはダミー値を返し、本番ランタイム時に値が存在しない場合は ConfigurationError をスローします。
 * 開発環境では、値が存在しない場合でもエラーをスローせず、空文字列または実際の値を返します。
 * @param key - 取得する環境変数のキー。
 * @returns 環境変数の値。ビルド時はダミー値、本番ランタイムで未設定の場合はエラー、それ以外は実際の値または空文字列。
 * @throws {ConfigurationError} 本番ランタイム時に環境変数が未設定の場合。
 */
export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];

  // ビルド時にはダミー値を返す
  if (isBuildTime()) {
    return `dummy-${key}`;
  }

  // 本番ランタイム時に値が実際に未設定(undefined or null)の場合のみエラーをスロー
  if ((value === undefined || value === null) && isProductionRuntime()) {
    throw new ConfigurationError(key);
  }

  // 開発環境や、本番ランタイムで値が存在する場合はその値を返す
  return value || "";
};
