import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Bug, HelpCircle, Lightbulb, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "./components/ContactForm";

export const metadata: Metadata = {
	title: "お問い合わせ",
	description:
		"suzumina.clickに関するご質問、バグ報告、機能要望などをお寄せください。涼花みなせファンサイトの改善にご協力をお願いします。",
	keywords: ["お問い合わせ", "バグ報告", "機能要望", "ヘルプ", "FAQ", "ファンサイト"],
	openGraph: {
		title: "お問い合わせ | すずみなくりっく！",
		description:
			"suzumina.clickに関するご質問、バグ報告、機能要望などをお寄せください。涼花みなせファンサイトの改善にご協力をお願いします。",
		url: "https://suzumina.click/contact",
	},
	alternates: {
		canonical: "/contact",
	},
};

export default function ContactPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			{/* ページヘッダー */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-4">お問い合わせ</h1>
				<p className="text-lg text-muted-foreground">
					suzumina.clickに関するご質問やご要望をお寄せください
				</p>
			</div>

			<div className="space-y-8">
				{/* 重要なお知らせ */}
				<Card className="border-minase-200 bg-minase-50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-minase-700">
							<AlertTriangle className="h-5 w-5" />
							重要なお知らせ
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="space-y-2">
							<p className="text-minase-800">
								• 個人が趣味で運営しているため、
								<b>返信をお約束できません</b>
							</p>
							<p className="text-minase-800">• 緊急性のあるお問い合わせには対応できません</p>
							<p className="text-minase-800">
								• 涼花みなせさんご本人や関係者様への連絡手段ではありません
							</p>
						</div>
					</CardContent>
				</Card>

				{/* お問い合わせ種別の説明 */}
				<Card>
					<CardHeader>
						<CardTitle>お問い合わせ種別</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10">
								<Bug className="h-5 w-5 text-destructive mt-0.5" />
								<div>
									<h4 className="font-semibold text-destructive">バグ報告</h4>
									<p className="text-sm text-destructive/80">
										サイトの不具合や正常に動作しない機能
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-suzuka-50">
								<Lightbulb className="h-5 w-5 text-suzuka-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-suzuka-800">機能要望</h4>
									<p className="text-sm text-suzuka-700">新機能の提案やサイト改善のご提案</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-minase-50">
								<HelpCircle className="h-5 w-5 text-minase-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-minase-800">使い方</h4>
									<p className="text-sm text-minase-700">サイトの使用方法に関するご質問</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
								<MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
								<div>
									<h4 className="font-semibold text-foreground">その他</h4>
									<p className="text-sm text-muted-foreground">上記以外のご意見・ご感想</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* よくある質問 */}
				<Card>
					<CardHeader>
						<CardTitle>よくある質問（FAQ）</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div className="border-l-4 border-suzuka-500 pl-4">
								<h4 className="font-semibold text-foreground">Q: 音声ボタンが再生されません</h4>
								<p className="text-sm text-muted-foreground mt-1">
									A:
									ブラウザの音声自動再生設定を確認してください。一度ページをクリックしてから再生すると動作する場合があります。
								</p>
							</div>
							<div className="border-l-4 border-minase-500 pl-4">
								<h4 className="font-semibold text-foreground">Q: ログインできません</h4>
								<p className="text-sm text-muted-foreground mt-1">
									A:
									現状、すずみなふぁみりーDiscordサーバーのメンバーのみご利用いただけます。先にDiscordサーバーにご参加してからお試しください。
								</p>
							</div>
							<div className="border-l-4 border-suzuka-500 pl-4">
								<h4 className="font-semibold text-foreground">Q: 作成したボタンが表示されません</h4>
								<p className="text-sm text-muted-foreground mt-1">
									A:
									著作権を考慮して、利用許諾のある配信アーカイブ動画以外からはボタンを作成できません。また、作成後しばらくお待ちいただく場合があります。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* お問い合わせフォーム */}
				<Card>
					<CardHeader>
						<CardTitle>お問い合わせフォーム</CardTitle>
					</CardHeader>
					<CardContent>
						<ContactForm />
					</CardContent>
				</Card>

				{/* 対応について */}
				<Card className="bg-muted/50">
					<CardHeader>
						<CardTitle>対応について</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm text-muted-foreground">
						<p>
							• <strong>対応時間</strong>: 個人の空き時間（不定期）
						</p>
						<p>
							• <strong>返信</strong>: 技術的内容のみ対応可能
						</p>
						<p>
							• <strong>要望</strong>: 実装を約束するものではありません
						</p>
						<p>
							• <strong>保存</strong>: お問い合わせ内容は管理者が確認するため保存されます
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
