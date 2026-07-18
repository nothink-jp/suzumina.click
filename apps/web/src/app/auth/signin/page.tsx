import { Suspense } from "react";
import { signInAction } from "@/app/auth/actions";
import { LoginErrorTracker } from "@/components/analytics/login-error-tracker";
import { DiscordSignInButton } from "@/components/user/discord-signin-button";

interface SignInPageProps {
	searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

async function SignInForm({ searchParams }: SignInPageProps) {
	const { callbackUrl, error } = await searchParams;
	return (
		<div className="min-h-screen flex items-center justify-center bg-muted">
			<LoginErrorTracker error={error} />
			<div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg">
				<div className="text-center">
					<h2 className="text-3xl font-bold text-foreground mb-2">すずみなくりっく！</h2>
					<p className="text-muted-foreground mb-6">涼花みなせファンサイトにログイン</p>

					{error && (
						<div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
							<p className="text-destructive text-sm">
								{error === "AccessDenied"
									? "アクセスが拒否されました。もう一度お試しください。"
									: error === "Configuration"
										? "認証設定にエラーがあります。管理者にお問い合わせください。"
										: "ログインに失敗しました。もう一度お試しください。"}
							</p>
						</div>
					)}
				</div>

				<form action={signInAction.bind(null, callbackUrl ?? "/")} className="space-y-4">
					<DiscordSignInButton
						className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors duration-200"
						iconClassName="w-5 h-5"
						label="Discordでログイン"
					/>
				</form>

				<div className="text-center text-sm text-muted-foreground space-y-3">
					<p>Discordアカウントでログインして、音声ボタンを作成・共有しましょう！</p>

					{/* プレビューリリース案内 */}
					<div className="bg-info/10 border border-info/30 rounded-lg p-4 text-left">
						<div className="flex items-start gap-2">
							<span className="text-lg">🎉</span>
							<div className="space-y-2">
								<h4 className="font-semibold text-info text-sm">一般公開スタート！</h4>
								<p className="text-foreground text-xs leading-relaxed">
									すずみなくりっく！は全てのDiscordユーザーに公開されました。
									<br />• 一般ユーザー：1日10個まで音声ボタン作成可能
									<br />• ふぁみりーメンバー：1日110個まで音声ボタン作成可能
								</p>
								<div className="pt-2">
									<a
										href="https://ci-en.dlsite.com/creator/9805"
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-info hover:text-info/90 text-xs font-medium underline"
									>
										<span>💝</span>
										涼花みなせさんのci-enで支援者になる
									</a>
									<p className="text-info text-xs mt-1">
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

export default function SignInPage({ searchParams }: SignInPageProps) {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
						<p className="mt-4 text-muted-foreground">読み込み中...</p>
					</div>
				</div>
			}
		>
			<SignInForm searchParams={searchParams} />
		</Suspense>
	);
}
