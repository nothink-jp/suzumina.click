"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { ChevronRight, Cookie, RotateCcw, Shield, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAgeVerification } from "@/contexts/AgeVerificationContext";
import {
	getCurrentConsentState,
	resetAllConsent,
	updateConsent,
} from "@/lib/consent/google-consent-mode";

export function SettingsPageContent() {
	const { isAdult, updateAgeVerification } = useAgeVerification();
	const [consentState, setConsentState] = useState({
		analytics: false,
		advertising: false,
		functional: true, // 機能的なCookieは通常必須
		personalization: false,
	});
	const [isLoading, setIsLoading] = useState(true);

	// 現在の同意状態を読み込み
	useEffect(() => {
		const currentState = getCurrentConsentState();

		if (currentState) {
			setConsentState({
				analytics: currentState.analytics || false,
				advertising: currentState.advertising || false,
				functional: currentState.functional !== false, // デフォルトでtrue
				personalization: currentState.personalization || false,
			});
		} else {
			// デフォルト値を設定（同意状態が存在しない場合）
			setConsentState({
				analytics: false,
				advertising: false,
				functional: true,
				personalization: false,
			});
		}
		setIsLoading(false);
	}, []);

	// 年齢制限設定の変更
	const handleAgeVerificationChange = (isAdult: boolean) => {
		updateAgeVerification(isAdult);
	};

	// 全設定をリセット
	const handleResetAll = () => {
		if (confirm("全ての設定をリセットしますか？この操作は元に戻せません。")) {
			// 年齢確認をリセット
			updateAgeVerification(false);
			// Cookie同意をリセット
			resetAllConsent();
			setConsentState({
				analytics: false,
				advertising: false,
				functional: true,
				personalization: false,
			});
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="text-center">
						<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						<p className="mt-2 text-muted-foreground">設定を読み込み中...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				{/* ページヘッダー */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">設定</h1>
					<p className="text-muted-foreground">
						年齢制限、Cookie許諾、その他の設定を管理できます。
					</p>
				</div>

				<div className="space-y-6">
					{/* 年齢制限設定 */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<Shield className="h-5 w-5 text-primary" />
								<div>
									<CardTitle>年齢制限設定</CardTitle>
									<CardDescription>R18コンテンツの表示に関する設定です</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<span className="font-medium">18歳以上として認証</span>
										{isAdult ? (
											<Badge variant="default" className="bg-green-100 text-green-800">
												認証済み
											</Badge>
										) : (
											<Badge variant="secondary">未認証</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										{isAdult
											? "R18コンテンツを含む全ての作品を表示できます"
											: "全年齢対象の作品のみ表示されます"}
									</p>
								</div>
								<Switch
									checked={isAdult}
									onCheckedChange={handleAgeVerificationChange}
									aria-label="年齢確認の切り替え"
								/>
							</div>
							{!isAdult && (
								<div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
									<p className="text-sm text-blue-800">
										🛡️ 現在は全年齢対象のコンテンツのみが表示されています。
										18歳以上の方は上記のスイッチをオンにしてください。
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Cookie設定 */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<Cookie className="h-5 w-5 text-primary" />
								<div>
									<CardTitle>Cookie設定</CardTitle>
									<CardDescription>
										サイトの機能とプライバシーに関するCookie設定です
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* 現在の設定状態の概要表示 */}
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">必須Cookie</span>
									<Badge variant="default" className="bg-green-100 text-green-800">
										有効
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">分析Cookie</span>
									<Badge
										variant={consentState.analytics ? "default" : "secondary"}
										className={consentState.analytics ? "bg-green-100 text-green-800" : ""}
									>
										{consentState.analytics ? "有効" : "無効"}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">広告Cookie</span>
									<Badge
										variant={consentState.advertising ? "default" : "secondary"}
										className={consentState.advertising ? "bg-green-100 text-green-800" : ""}
									>
										{consentState.advertising ? "有効" : "無効"}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">パーソナライゼーション</span>
									<Badge
										variant={consentState.personalization ? "default" : "secondary"}
										className={consentState.personalization ? "bg-green-100 text-green-800" : ""}
									>
										{consentState.personalization ? "有効" : "無効"}
									</Badge>
								</div>
							</div>

							<Separator />

							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<p className="font-medium">詳細設定</p>
									<p className="text-sm text-muted-foreground">
										各カテゴリの詳細設定や個別の制御を行えます
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										// フッターのクッキー設定ボタンをクリックするのと同じ効果
										const event = new CustomEvent("openCookieSettings");
										window.dispatchEvent(event);
									}}
									className="flex items-center gap-2"
								>
									<ChevronRight className="h-4 w-4" />
									設定画面を開く
								</Button>
							</div>

							<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
								<p className="text-sm text-blue-800">
									💡 詳細なCookie設定は画面下部のフッター「クッキー設定」からもアクセスできます。
									詳細については
									<Link
										href="/privacy"
										className="text-blue-600 hover:text-blue-800 underline mx-1"
									>
										プライバシーポリシー
									</Link>
									をご確認ください。
								</p>
							</div>
						</CardContent>
					</Card>

					{/* その他の設定 */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-3">
								<User className="h-5 w-5 text-primary" />
								<div>
									<CardTitle>アカウント設定</CardTitle>
									<CardDescription>プロフィールやアカウント関連の設定です</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<Link href="/settings/profile">
								<Button variant="outline" className="w-full justify-between">
									<span>プロフィール設定</span>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					{/* リセット */}
					<Card className="border-destructive/20">
						<CardHeader>
							<CardTitle className="text-destructive">危険な操作</CardTitle>
							<CardDescription>これらの操作は元に戻すことができません</CardDescription>
						</CardHeader>
						<CardContent>
							<Button variant="destructive" onClick={handleResetAll} className="w-full">
								<RotateCcw className="h-4 w-4 mr-2" />
								全ての設定をリセット
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
