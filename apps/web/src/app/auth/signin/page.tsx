import { Suspense } from "react";
import { signIn } from "@/auth";

interface SignInPageProps {
	searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

function SignInForm({ callbackUrl, error }: { callbackUrl?: string; error?: string }) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
			<div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-gray-900 mb-2">すずみなくりっく！</h2>
					<p className="text-gray-600 mb-6">涼花みなせファンサイトにログイン</p>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
							<p className="text-red-700 text-sm">
								{error === "AccessDenied" ? (
									<>
										<strong>アクセスが拒否されました</strong>
										<br />
										このサイトは「すずみなふぁみりー」Discordサーバーのメンバー限定です。
										<br />
										先にDiscordサーバーにご参加ください。
									</>
								) : error === "Configuration" ? (
									"認証設定にエラーがあります。管理者にお問い合わせください。"
								) : (
									"ログインに失敗しました。もう一度お試しください。"
								)}
							</p>
						</div>
					)}
				</div>

				<form
					action={async () => {
						"use server";
						await signIn("discord", {
							redirectTo: callbackUrl || "/",
						});
					}}
					className="space-y-4"
				>
					<button
						type="submit"
						className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
					>
						<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
							<title>Discordアイコン</title>
							<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
						</svg>
						Discordでログイン
					</button>
				</form>

				<div className="text-center text-sm text-gray-500 space-y-3">
					<p>
						ログインすることで、あなたが「すずみなふぁみりー」Discord
						サーバーのメンバーであることを確認します。
					</p>

					{/* プレビューリリース案内 */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
						<div className="flex items-start gap-2">
							<span className="text-lg">🚀</span>
							<div className="space-y-2">
								<h4 className="font-semibold text-blue-900 text-sm">プレビューリリース中</h4>
								<p className="text-blue-800 text-xs leading-relaxed">
									現在、すずみなくりっく！はプレビューリリース段階です。
									音声ボタンの作成機能は「すずみなふぁみりー」メンバー限定となっております。
								</p>
								<div className="pt-2">
									<a
										href="https://ci-en.dlsite.com/creator/9805"
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs font-medium underline"
									>
										<span>💝</span>
										涼花みなせさんのci-enで支援者になる
									</a>
									<p className="text-blue-700 text-xs mt-1">
										※ ci-en支援者はすずみなふぁみりーDiscordサーバーに参加できます
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
	const params = await searchParams;

	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
						<p className="mt-4 text-gray-600">読み込み中...</p>
					</div>
				</div>
			}
		>
			<SignInForm callbackUrl={params.callbackUrl} error={params.error} />
		</Suspense>
	);
}
