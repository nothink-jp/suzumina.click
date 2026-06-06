"use client";

import type { FrontendUserData } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suzumina.click/ui/components/ui/tabs";
import {
	Calendar,
	ChevronRight,
	Cookie,
	Eye,
	EyeOff,
	Info,
	Lock,
	RotateCcw,
	Settings,
	Shield,
	User,
	UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getCurrentConsentState, resetAllConsent } from "@/lib/consent/google-consent-mode";
import { updateUserProfile } from "../actions";

interface UnifiedSettingsContentProps {
	user: FrontendUserData;
}

export function UnifiedSettingsContent({ user }: UnifiedSettingsContentProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const { isAdult, updateAgeVerification } = useAgeVerification();
	const [isPublicProfile, setIsPublicProfile] = useState(user.isPublicProfile);
	const [activeTab, setActiveTab] = useState("general");
	const [consentState, setConsentState] = useState({
		analytics: false,
		functional: true,
		personalization: false,
	});
	const [isLoading, setIsLoading] = useState(true);

	// 現在の同意状態を読み込み
	useEffect(() => {
		const currentState = getCurrentConsentState();

		if (currentState) {
			setConsentState({
				analytics: currentState.analytics || false,
				functional: currentState.functional !== false,
				personalization: currentState.personalization || false,
			});
		} else {
			setConsentState({
				analytics: false,
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

	// プロフィール公開設定の変更（即座に保存）
	const handleProfileVisibilityChange = async (checked: boolean) => {
		setIsPublicProfile(checked);
		startTransition(async () => {
			try {
				const result = await updateUserProfile({
					isPublicProfile: checked,
				});

				if (result.success) {
					toast.success(checked ? "プロフィールを公開しました" : "プロフィールを非公開にしました");
					router.refresh();
				} else {
					toast.error(result.error || "更新に失敗しました");
					// エラー時は元に戻す
					setIsPublicProfile(!checked);
				}
			} catch (_error) {
				toast.error("予期しないエラーが発生しました");
				// エラー時は元に戻す
				setIsPublicProfile(!checked);
			}
		});
	};

	// 全設定をリセット
	const handleResetAll = () => {
		if (confirm("全ての設定をリセットしますか？この操作は元に戻せません。")) {
			updateAgeVerification(false);
			resetAllConsent();
			setConsentState({
				analytics: false,
				functional: true,
				personalization: false,
			});
			setIsPublicProfile(true);
			toast.success("全ての設定をリセットしました");
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
				<div className="container mx-auto px-4 py-8">
					<div className="max-w-4xl mx-auto">
						<div className="text-center">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">設定を読み込み中...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					{/* ページヘッダー */}
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-foreground mb-2">設定</h1>
						<p className="text-muted-foreground">アカウント設定とサイトの動作設定を管理できます</p>
					</div>

					{/* タブ付き設定 */}
					<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="general" className="flex items-center gap-2">
								<Settings className="h-4 w-4" />
								一般
							</TabsTrigger>
							<TabsTrigger value="profile" className="flex items-center gap-2">
								<User className="h-4 w-4" />
								プロフィール
							</TabsTrigger>
						</TabsList>

						{/* 一般設定タブ */}
						<TabsContent value="general" className="space-y-6">
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
											<span className="text-sm font-medium">パーソナライゼーション</span>
											<Badge
												variant={consentState.personalization ? "default" : "secondary"}
												className={
													consentState.personalization ? "bg-green-100 text-green-800" : ""
												}
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
											💡
											詳細なCookie設定は画面下部のフッター「クッキー設定」からもアクセスできます。
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
						</TabsContent>

						{/* プロフィール設定タブ */}
						<TabsContent value="profile" className="space-y-6">
							<Card>
								<CardHeader>
									<div className="flex items-center gap-3">
										<User className="h-5 w-5 text-primary" />
										<div>
											<CardTitle>基本情報</CardTitle>
											<CardDescription>ユーザー情報の表示設定</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="space-y-2">
										<Label>表示名</Label>
										<p className="text-lg font-medium">{user.displayName}</p>
										<p className="text-sm text-muted-foreground">
											表示名はDiscordのアカウント名から自動的に設定されます
										</p>
									</div>

									<div className="space-y-2">
										<Label>ユーザー名</Label>
										<p className="text-lg font-medium">@{user.username}</p>
										<p className="text-sm text-muted-foreground">
											ユーザー名はDiscordのユーザー名から自動的に設定されます
										</p>
									</div>

									<div className="space-y-2">
										<Label>Discord ID</Label>
										<p className="text-lg font-mono">{user.discordId}</p>
									</div>

									<Separator />

									<div className="space-y-2">
										<Label>メンバーシップステータス</Label>
										<div className="flex items-center gap-2">
											{user.isFamilyMember ? (
												<>
													<span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
														<span className="text-base">👨‍👩‍👧‍👦</span>
														すずみなふぁみりー
													</span>
													<span className="text-sm text-muted-foreground">
														1日110個まで音声ボタン作成可能
													</span>
												</>
											) : (
												<>
													<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
														<span className="text-base">👤</span>
														一般ユーザー
													</span>
													<span className="text-sm text-muted-foreground">
														1日10個まで音声ボタン作成可能
													</span>
												</>
											)}
										</div>
										<p className="text-xs text-muted-foreground">
											※ ci-en支援者は
											<a
												href="https://ci-en.dlsite.com/creator/9805"
												target="_blank"
												rel="noopener noreferrer"
												className="text-blue-600 hover:text-blue-700 underline"
											>
												こちら
											</a>
											からDiscordサーバーに参加できます
										</p>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<div className="flex items-center gap-3">
										<Lock className="h-5 w-5 text-primary" />
										<div>
											<CardTitle>プライバシー設定</CardTitle>
											<CardDescription>プロフィールの公開範囲を設定</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span className="font-medium">プロフィールを公開</span>
												{isPublicProfile ? (
													<Badge variant="default" className="bg-green-100 text-green-800">
														<Eye className="w-3 h-3 mr-1" />
														公開
													</Badge>
												) : (
													<Badge variant="secondary">
														<EyeOff className="w-3 h-3 mr-1" />
														非公開
													</Badge>
												)}
											</div>
											<p className="text-sm text-muted-foreground">
												他のユーザーがあなたのプロフィールページを閲覧できるようになります
											</p>
										</div>
										<Switch
											checked={isPublicProfile}
											onCheckedChange={handleProfileVisibilityChange}
											disabled={isPending}
											aria-label="プロフィール公開の切り替え"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<div className="flex items-center gap-3">
										<Info className="h-5 w-5 text-primary" />
										<div>
											<CardTitle>アカウント情報</CardTitle>
											<CardDescription>あなたの登録情報</CardDescription>
										</div>
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Calendar className="w-4 h-4" />
											<span>メンバー登録日</span>
										</div>
										<span className="font-medium">{user.memberSince}</span>
									</div>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-muted-foreground">
											<UserCheck className="w-4 h-4" />
											<span>最終ログイン</span>
										</div>
										<span className="font-medium">{user.lastActiveText}</span>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
