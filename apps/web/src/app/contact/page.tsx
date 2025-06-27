import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Bug, HelpCircle, Lightbulb, MessageSquare } from "lucide-react";
import { ContactForm } from "./components/ContactForm";

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
				<Card className="border-orange-200 bg-orange-50">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-orange-700">
							<AlertTriangle className="h-5 w-5" />
							重要なお知らせ
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="space-y-2">
							<p className="text-orange-800">
								• 個人が趣味で運営しているため、
								<Badge variant="outline" className="mx-1 border-orange-300 text-orange-700">
									返信をお約束できません
								</Badge>
							</p>
							<p className="text-orange-800">• 緊急性のあるお問い合わせには対応できません</p>
							<p className="text-orange-800">• 涼花みなせさんご本人への連絡手段ではありません</p>
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
							<div className="flex items-start gap-3 p-3 rounded-lg bg-red-50">
								<Bug className="h-5 w-5 text-red-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-red-800">バグ報告</h4>
									<p className="text-sm text-red-700">サイトの不具合や正常に動作しない機能</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
								<Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-blue-800">機能要望</h4>
									<p className="text-sm text-blue-700">新機能の提案やサイト改善のご提案</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-green-50">
								<HelpCircle className="h-5 w-5 text-green-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-green-800">使い方</h4>
									<p className="text-sm text-green-700">サイトの使用方法に関するご質問</p>
								</div>
							</div>
							<div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
								<MessageSquare className="h-5 w-5 text-gray-600 mt-0.5" />
								<div>
									<h4 className="font-semibold text-gray-800">その他</h4>
									<p className="text-sm text-gray-700">上記以外のご意見・ご感想</p>
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
									すずみなふぁみりーDiscordサーバーのメンバーのみご利用いただけます。先にDiscordサーバーにご参加してからお試しください。
								</p>
							</div>
							<div className="border-l-4 border-suzuka-500 pl-4">
								<h4 className="font-semibold text-foreground">Q: 作成したボタンが表示されません</h4>
								<p className="text-sm text-muted-foreground mt-1">
									A:
									配信アーカイブ以外からは著作権の関係でボタンを作成できません。また、作成後しばらくお待ちいただく場合があります。
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
