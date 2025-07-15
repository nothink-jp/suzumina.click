import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Eye, Globe, Lock, Server, Shield, UserCheck } from "lucide-react";

export default function PrivacyPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			{/* ページヘッダー */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-4">プライバシーポリシー</h1>
				<p className="text-lg text-muted-foreground">個人情報の取扱いに関する方針</p>
				<p className="text-sm text-muted-foreground mt-2">最終更新: 2025年7月13日</p>
			</div>

			<div className="space-y-8">
				{/* 基本方針 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-suzuka-500" />
							1. 基本方針
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-foreground">
							suzumina.clickは、ユーザーの皆様の個人情報保護を重要と考え、
							個人情報保護法およびその他関連法令を遵守し、適切な取扱いに努めます。
						</p>
						<div className="bg-orange-50 p-4 rounded-lg">
							<h4 className="font-semibold text-orange-800 mb-2">重要なお知らせ</h4>
							<p className="text-sm text-orange-700">
								個人運営のため、企業レベルの完全な保護は保証できません。
								最小限の情報収集に留め、可能な限り安全な管理に努めています。
							</p>
						</div>
					</CardContent>
				</Card>

				{/* 収集する情報 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Eye className="h-5 w-5 text-minase-500" />
							2. 収集する情報
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-4">
							<div>
								<h4 className="font-semibold text-foreground">自動収集情報</h4>
								<div className="bg-gray-50 p-3 rounded-lg mt-2">
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>• IPアドレス</li>
										<li>• ブラウザ情報（User Agent）</li>
										<li>• アクセス日時</li>
										<li>• 利用ページの履歴</li>
										<li>• リファラー情報</li>
									</ul>
								</div>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">ユーザー提供情報</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
									<div className="bg-blue-50 p-3 rounded-lg">
										<h5 className="font-semibold text-blue-800 text-sm">Discord認証情報</h5>
										<ul className="text-xs text-blue-700 mt-1 space-y-1">
											<li>• DiscordユーザーID</li>
											<li>• ユーザー名</li>
											<li>• ギルドメンバーシップ状況</li>
										</ul>
									</div>
									<div className="bg-green-50 p-3 rounded-lg">
										<h5 className="font-semibold text-green-800 text-sm">ユーザー作成コンテンツ</h5>
										<ul className="text-xs text-green-700 mt-1 space-y-1">
											<li>• 作成した音声ボタンデータ</li>
											<li>• お問い合わせ内容（任意）</li>
											<li>• メールアドレス（任意）</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 利用目的 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserCheck className="h-5 w-5 text-suzuka-500" />
							3. 利用目的
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h4 className="font-semibold text-foreground">主要目的</h4>
									<ul className="text-sm text-muted-foreground mt-2 space-y-1">
										<li>• ユーザー認証とアクセス制御</li>
										<li>• コミュニティ機能の提供</li>
										<li>• 音声ボタン作成・管理機能</li>
										<li>• ユーザーサポート</li>
									</ul>
								</div>
								<div>
									<h4 className="font-semibold text-foreground">運営・改善目的</h4>
									<ul className="text-sm text-muted-foreground mt-2 space-y-1">
										<li>• サイトの改善・最適化</li>
										<li>• セキュリティの確保</li>
										<li>• 不正利用の防止</li>
										<li>• 統計分析（匿名化）</li>
									</ul>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 第三者サービス */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Server className="h-5 w-5 text-minase-500" />
							4. 第三者サービス・データ共有
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-foreground">以下の第三者サービスを利用しています：</p>
						<div className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">Google Cloud Platform</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> データ保存・処理
										</p>
										<p>
											<strong>データ:</strong> 全ユーザーデータ
										</p>
										<p>
											<strong>所在地:</strong> アジア太平洋地域
										</p>
										<p>
											<strong>保護策:</strong> Google Cloud セキュリティ
										</p>
									</div>
								</div>
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">Discord OAuth</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> ユーザー認証
										</p>
										<p>
											<strong>データ:</strong> ユーザーID、ユーザー名
										</p>
										<p>
											<strong>権限:</strong> 最小限（パスワード不要）
										</p>
										<p>
											<strong>制御:</strong> Discord設定で管理可能
										</p>
									</div>
								</div>
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">YouTube Data API</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> 動画情報取得
										</p>
										<p>
											<strong>データ:</strong> 動画メタデータのみ
										</p>
										<p>
											<strong>制限:</strong> 視聴履歴等は取得しません
										</p>
										<p>
											<strong>表示:</strong> 公開情報のみ
										</p>
									</div>
								</div>
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">DLsite</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> 作品情報表示
										</p>
										<p>
											<strong>データ:</strong> 公開作品データのみ
										</p>
										<p>
											<strong>方法:</strong> Web経由での取得
										</p>
										<p>
											<strong>個人情報:</strong> 一切取得しません
										</p>
									</div>
								</div>
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">Google Analytics 4</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> サイト利用状況の分析・改善
										</p>
										<p>
											<strong>データ:</strong> 匿名化されたアクセス情報
										</p>
										<p>
											<strong>Cookie:</strong> 分析用Cookie使用
										</p>
										<p>
											<strong>制御:</strong> ユーザー同意管理で制御可能
										</p>
									</div>
								</div>
								<div className="border p-4 rounded-lg">
									<h4 className="font-semibold text-foreground flex items-center gap-2">
										<Badge variant="outline">Google Tag Manager</Badge>
									</h4>
									<div className="text-sm text-muted-foreground mt-2 space-y-1">
										<p>
											<strong>目的:</strong> タグ・分析ツールの管理
										</p>
										<p>
											<strong>データ:</strong> タグ実行に必要な情報のみ
										</p>
										<p>
											<strong>機能:</strong> 他の分析ツールの統合管理
										</p>
										<p>
											<strong>プライバシー:</strong> 単体では個人情報収集なし
										</p>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Cookie・解析ツール */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Globe className="h-5 w-5 text-suzuka-500" />
							5. Cookie・分析ツール
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">必要なCookie</h4>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>
										• <strong>認証Cookie:</strong> ログイン状態の維持
									</li>
									<li>
										• <strong>セッションCookie:</strong> サイト機能の提供
									</li>
									<li>
										• <strong>設定Cookie:</strong> ユーザー設定の保存
									</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">分析・広告Cookie</h4>
								<div className="bg-blue-50 p-3 rounded-lg mt-2">
									<h5 className="font-semibold text-blue-800 text-sm mb-2">Google Analytics 4</h5>
									<ul className="text-xs text-blue-700 space-y-1">
										<li>• サイト利用状況の匿名化分析</li>
										<li>• ユーザー体験の改善目的</li>
										<li>• 同意管理により制御可能</li>
									</ul>
								</div>
								<p className="text-sm text-muted-foreground mt-2">
									これらのツールは、ユーザーの明示的な同意がある場合のみ使用されます。
									同意はいつでも撤回可能です。
								</p>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">Cookieの制御</h4>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>
										• <strong>サイト内設定:</strong> Cookie同意バナーで制御
									</li>
									<li>
										• <strong>ブラウザ設定:</strong> Cookie無効化・削除
									</li>
									<li>
										• <strong>Google設定:</strong>
										<a
											href="https://adssettings.google.com/"
											className="text-suzuka-500 hover:underline"
											target="_blank"
											rel="noopener noreferrer"
										>
											広告設定
										</a>
										・
										<a
											href="https://myaccount.google.com/data-and-privacy"
											className="text-suzuka-500 hover:underline"
											target="_blank"
											rel="noopener noreferrer"
										>
											データとプライバシー
										</a>
									</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* データ管理・保護 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-minase-500" />
							6. データ管理・保護
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">保存・管理</h4>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>• Google Cloud Platform での暗号化保存</li>
									<li>• 定期的なセキュリティアップデート</li>
									<li>• アクセス権限の最小化</li>
									<li>• 不正アクセス監視</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">保存期間</h4>
								<div className="bg-yellow-50 p-3 rounded-lg mt-2">
									<ul className="text-sm text-yellow-800 space-y-1">
										<li>
											• <strong>アカウント情報:</strong> アカウント削除まで
										</li>
										<li>
											• <strong>音声ボタン:</strong> ユーザーが削除するまで
										</li>
										<li>
											• <strong>アクセスログ:</strong> 最大1年間
										</li>
										<li>
											• <strong>お問い合わせ:</strong> 対応完了後1年間
										</li>
									</ul>
								</div>
							</div>
							<div className="bg-red-50 p-4 rounded-lg">
								<h4 className="font-semibold text-red-800 mb-2">個人運営の制約</h4>
								<p className="text-sm text-red-700">
									個人運営のため、企業レベルの完全なデータ保護は保証できません。
									技術的・物理的制約があることをご理解ください。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* ユーザーの権利 */}
				<Card>
					<CardHeader>
						<CardTitle>7. ユーザーの権利・お問い合わせ</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">データに関する権利</h4>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>
										• <strong>確認・開示:</strong> 保存されている個人データの確認
									</li>
									<li>
										• <strong>訂正・削除:</strong> 不正確なデータの修正・削除
									</li>
									<li>
										• <strong>利用停止:</strong> データ処理の停止要求
									</li>
									<li>
										• <strong>データポータビリティ:</strong> データの他サービスへの移行
									</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">権利行使の方法</h4>
								<p className="text-sm text-muted-foreground mt-2">
									<a href="/contact" className="text-suzuka-500 hover:underline">
										お問い合わせページ
									</a>
									から、具体的な要望をお送りください。
									本人確認後、可能な限り速やかに対応いたします。
								</p>
								<p className="text-xs text-muted-foreground mt-2">
									※個人運営のため、対応にお時間をいただく場合があります
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 国際転送・GDPR */}
				<Card>
					<CardHeader>
						<CardTitle>8. 国際データ転送・GDPR対応</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">データ転送</h4>
								<p className="text-sm text-muted-foreground">
									Google Cloud Platform を利用しているため、データは適切な保護措置の下で
									国際的に転送・処理される場合があります。
								</p>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">EU居住者の権利</h4>
								<p className="text-sm text-muted-foreground">
									EU一般データ保護規則（GDPR）に基づく権利を尊重し、
									可能な限り同等の保護を提供するよう努めます。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* ポリシー変更 */}
				<Card>
					<CardHeader>
						<CardTitle>9. プライバシーポリシーの変更</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							本ポリシーは、法令の変更やサービス内容の変更に応じて更新される場合があります。
							重要な変更がある場合は、サイト上でお知らせいたします。
						</p>
					</CardContent>
				</Card>

				{/* お問い合わせ */}
				<Card className="bg-muted/50">
					<CardHeader>
						<CardTitle>お問い合わせ</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							本ポリシーに関するご質問、個人情報の取扱いに関するお問い合わせは、
							<a href="/contact" className="text-suzuka-500 hover:underline mx-1">
								お問い合わせページ
							</a>
							からご連絡ください。
						</p>
						<div className="mt-4 space-y-1 text-xs text-muted-foreground">
							<p>• 個人運営のため、返信をお約束するものではありません</p>
							<p>• 法的要求には適切に対応いたします</p>
						</div>
					</CardContent>
				</Card>

				{/* フッター情報 */}
				<div className="text-center pt-8 border-t">
					<div className="flex items-center justify-center gap-2 mb-2">
						<Badge variant="outline">個人情報保護法準拠</Badge>
						<Badge variant="outline">GDPR配慮</Badge>
					</div>
					<p className="text-xs text-muted-foreground">
						suzumina.click - 個人運営ファンコミュニティサイト
					</p>
				</div>
			</div>
		</div>
	);
}
