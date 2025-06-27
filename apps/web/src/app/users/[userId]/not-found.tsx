import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Home, Search, User, UserX } from "lucide-react";
import Link from "next/link";

export default function UserNotFound() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30 flex items-center justify-center">
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<Card>
					<CardHeader className="text-center">
						<div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
							<UserX className="w-8 h-8 text-muted-foreground" />
						</div>
						<CardTitle className="text-xl">ユーザーが見つかりません</CardTitle>
					</CardHeader>
					<CardContent className="text-center space-y-6">
						<div className="space-y-2">
							<p className="text-muted-foreground">
								指定されたユーザーは存在しないか、プロフィールが非公開に設定されています。
							</p>
						</div>

						{/* 理由 */}
						<div className="text-left bg-muted/50 p-4 rounded-lg space-y-2">
							<h3 className="font-semibold text-sm">考えられる理由:</h3>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>• ユーザーIDが間違っている</li>
								<li>• ユーザーがプロフィールを非公開に設定している</li>
								<li>• ユーザーがアカウントを削除した</li>
								<li>• URLに誤りがある</li>
							</ul>
						</div>

						{/* アクションボタン */}
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<Button asChild>
								<Link href="/" className="flex items-center gap-2">
									<Home className="w-4 h-4" />
									ホームに戻る
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/users/me" className="flex items-center gap-2">
									<User className="w-4 h-4" />
									マイプロフィール
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/buttons" className="flex items-center gap-2">
									<Search className="w-4 h-4" />
									音声ボタンを探す
								</Link>
							</Button>
						</div>

						{/* ヘルプ */}
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								URLが正しいかご確認ください。問題が続く場合は{" "}
								<Link href="/contact" className="text-suzuka-600 hover:text-suzuka-700 underline">
									お問い合わせ
								</Link>{" "}
								からご連絡ください。
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
