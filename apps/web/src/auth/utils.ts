/**
 * 本番環境で必須の環境変数が設定されていない場合にスローされるエラー。
 */
export class ConfigurationError extends Error {
  constructor(envVar: string) {
    super(
      `環境変数エラー: ${envVar} が本番環境で設定されていません。正しく設定されているか確認してください。`,
    );
    this.name = "ConfigurationError";
  }
}

/**
 * 本番環境での実行かどうかを判定します。
 * development、test環境以外は本番とみなします。
 * @returns 本番環境の場合は true、それ以外は false
 */
export const isProductionRuntime = () => {
  return process.env.NODE_ENV === "production";
};

/**
 * 環境変数を取得し、必要に応じてエラーをスローします。
 * 本番環境で未設定の場合はエラーをスローします。
 * 非本番環境では空文字列を返します。
 * 空文字列は有効な値として扱います。
 *
 * @param key - 取得する環境変数の名前
 * @returns 環境変数の値（未設定時は非本番環境のみ空文字列）
 * @throws {ConfigurationError} 本番環境で環境変数が未設定の場合
 */
export const getRequiredEnvVar = (key: string): string => {
  const value = process.env[key];

  if (value === undefined && isProductionRuntime()) {
    throw new ConfigurationError(key);
  }

  return value ?? "";
};
