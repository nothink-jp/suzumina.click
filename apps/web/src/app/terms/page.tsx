import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, BookOpen, Copyright, Shield, Users } from "lucide-react";

export default function TermsPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			{/* ページヘッダー */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-4">利用規約</h1>
				<p className="text-lg text-muted-foreground">suzumina.clickサービス利用に関する規約</p>
				<p className="text-sm text-muted-foreground mt-2">最終更新: 2025年6月27日</p>
			</div>

			<div className="space-y-8">
				{/* 基本方針 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<BookOpen className="h-5 w-5 text-suzuka-500" />
							1. 基本方針
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-foreground">
							本サイト「suzumina.click」は、声優「涼花みなせ」さんのファンコミュニティサイトとして、個人が趣味で運営しています。
						</p>
						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-semibold text-blue-800 mb-2">重要事項</h4>
							<ul className="text-sm text-blue-700 space-y-1">
								<li>• 涼花みなせさんや関係者様とは一切関係のない非公式サイトです</li>
								<li>• 非営利のファン活動として運営されています</li>
								<li>• 個人運営のため、サービスの継続性は保証されません</li>
							</ul>
						</div>
					</CardContent>
				</Card>

				{/* 免責事項 */}
				<Card className="border-orange-200">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-orange-700">
							<AlertTriangle className="h-5 w-5" />
							2. 免責事項
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">個人運営の限界</h4>
								<p className="text-sm text-muted-foreground">
									本サイトは個人が趣味で運営しているため、以下について保証いたしません：
								</p>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>• サービスの継続性・安定性</li>
									<li>• データの完全な保護・保証</li>
									<li>• 障害やシステムエラーの即座の対応</li>
									<li>• ユーザーサポートの迅速な提供</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">サービス中断・終了</h4>
								<p className="text-sm text-muted-foreground">
									予告なくサービスを一時停止・終了する場合があります。これによる損害について、運営者は責任を負いません。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 禁止事項 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Shield className="h-5 w-5 text-destructive" />
							3. 禁止事項
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-foreground">以下の行為を禁止します：</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-3">
								<div>
									<h4 className="font-semibold text-foreground">一般的な禁止行為</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>• 違法行為・迷惑行為</li>
										<li>• 他のユーザーへの嫌がらせ</li>
										<li>• 虚偽情報の投稿</li>
										<li>• 営利目的での利用</li>
										<li>• システムに負荷をかける行為</li>
									</ul>
								</div>
							</div>
							<div className="space-y-3">
								<div>
									<h4 className="font-semibold text-foreground">コンテンツ関連</h4>
									<ul className="text-sm text-muted-foreground space-y-1">
										<li>• 著作権侵害にあたる音声ボタンの作成</li>
										<li>• 配信アーカイブ以外からの音声抽出</li>
										<li>• 不適切な内容の投稿</li>
										<li>• 他人の権利を侵害する行為</li>
									</ul>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 著作権 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Copyright className="h-5 w-5 text-suzuka-500" />
							4. 著作権について
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">基本方針</h4>
								<p className="text-sm text-muted-foreground">
									本サイトは涼花みなせさんのファン活動として、以下の方針で運営しています：
								</p>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>• 音声・画像の著作権は原著作者に帰属します</li>
									<li>• 公開されている動画・音声作品への参照のみを行います</li>
									<li>• 著作物の直接的な複製・配布は行いません</li>
									<li>• 涼花みなせさんおよび関係者様の二次創作ガイドラインに従います</li>
								</ul>
							</div>
							<div className="bg-green-50 p-4 rounded-lg">
								<h4 className="font-semibold text-green-800 mb-2">権利者の皆様へ</h4>
								<p className="text-sm text-green-700">
									著作権者様からの削除要請には速やかに対応いたします。
									<br />
									お問い合わせページからご連絡ください。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* アカウント・利用資格 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5 text-minase-500" />
							5. アカウント・利用資格
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">認証方式</h4>
								<p className="text-sm text-muted-foreground">
									本サイトはDiscord認証を使用し、「すずみなふぁみりー」Discordサーバーのメンバーのみ利用可能です。
								</p>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">利用制限</h4>
								<p className="text-sm text-muted-foreground">
									不適切な利用が確認された場合、以下の措置を取る場合があります：
								</p>
								<ul className="text-sm text-muted-foreground mt-2 space-y-1">
									<li>• 投稿コンテンツの削除</li>
									<li>• アクセス制限またはアカウント停止</li>
									<li>• 必要に応じて関係当局への報告</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 規約の変更・終了 */}
				<Card>
					<CardHeader>
						<CardTitle>6. 規約の変更・サービス終了</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div>
								<h4 className="font-semibold text-foreground">規約の変更</h4>
								<p className="text-sm text-muted-foreground">
									本規約は予告なく変更する場合があります。変更後の継続利用をもって、新しい規約に同意したものとみなします。
								</p>
							</div>
							<div>
								<h4 className="font-semibold text-foreground">サービス終了</h4>
								<p className="text-sm text-muted-foreground">
									個人運営の事情により、予告なくサービスを終了する場合があります。
									可能な限り事前にお知らせするよう努めますが、緊急時はこの限りではありません。
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 準拠法・管轄 */}
				<Card>
					<CardHeader>
						<CardTitle>7. 準拠法・管轄裁判所</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							本規約は日本国法に従って解釈され、本サービスに関する一切の紛争については、
							日本国の裁判所を専属的管轄裁判所とします。
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
							本規約に関するご質問は、
							<a href="/contact" className="text-suzuka-500 hover:underline mx-1">
								お問い合わせページ
							</a>
							からご連絡ください。
						</p>
						<p className="text-xs text-muted-foreground mt-2">
							個人運営のため、返信をお約束するものではありません。
						</p>
					</CardContent>
				</Card>

				{/* フッター情報 */}
				<div className="text-center pt-8 border-t">
					<div className="flex items-center justify-center gap-2 mb-2">
						<Badge variant="outline">非公式ファンサイト</Badge>
						<Badge variant="outline">個人運営</Badge>
					</div>
					<p className="text-xs text-muted-foreground">
						suzumina.click - 涼花みなせファンコミュニティサイト
					</p>
				</div>
			</div>
		</div>
	);
}
