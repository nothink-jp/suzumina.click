import { GlobalLayout } from "@/components/GlobalLayout";
import { UserInfoDisplay } from "@/components/UserInfoDisplay";

/**
 * 環境変数のデバッグ情報を表示するコンポーネント
 */
function EnvironmentDebug() {
  const envVars = {
    "NODE_ENV": process.env.NODE_ENV,
    "NEXTAUTH_URL": process.env.NEXTAUTH_URL,
    "NEXTAUTH_SECRET": process.env.NEXTAUTH_SECRET,
    "DISCORD_CLIENT_ID": process.env.DISCORD_CLIENT_ID,
    "DISCORD_CLIENT_SECRET": process.env.DISCORD_CLIENT_SECRET,
    "DISCORD_GUILD_ID": process.env.DISCORD_GUILD_ID,
    "DATABASE_URL": process.env.DATABASE_URL,
    "AUTH_TRUST_HOST": process.env.AUTH_TRUST_HOST,
  };

  return (
    <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left">
      <h2 className="text-lg font-semibold mb-2">環境変数デバッグ情報</h2>
      <div className="space-y-1">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="font-mono w-64">{key}:</span>
            <span className="ml-2 break-all">
              {value ? (
                value.startsWith("Secret:") ? 
                  "Secret Managerから設定済み" : 
                  "直接設定済み"
              ) : "未設定"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * アプリケーションのホームページコンポーネント。
 * ウェルカムメッセージを表示し、UserInfoDisplay コンポーネントをレンダリングします。
 * @returns ホームページの React 要素。
 */
export default function HomePage() {
  return (
    <GlobalLayout>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">すずみなふぁみりー</h1>
        <p className="mt-4 text-lg text-gray-600">
          コミュニティサイトへようこそ
        </p>

        {/* UserInfoDisplay クライアントコンポーネントをレンダリング */}
        <UserInfoDisplay />

        {/* 環境変数デバッグ情報を表示 */}
        <EnvironmentDebug />
      </div>
    </GlobalLayout>
  );
}
