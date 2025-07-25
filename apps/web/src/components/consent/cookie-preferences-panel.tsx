"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@suzumina.click/ui/components/ui/dialog";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { BarChart3, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import { type ConsentState, getCurrentConsentState } from "@/lib/consent/google-consent-mode";

// Map old ConsentChoices to new ConsentState format (without advertising)
type ConsentChoices = {
	necessary: boolean;
	functional: boolean;
	analytics: boolean;
	personalization: boolean;
};

interface CookieCategory {
	id: keyof ConsentChoices;
	name: string;
	description: string;
	details: string;
	icon: React.ReactNode;
	required: boolean;
	examples: string[];
}

const COOKIE_CATEGORIES: CookieCategory[] = [
	{
		id: "necessary",
		name: "必須クッキー",
		description: "サイトの基本機能に必要",
		details: "ログイン状態の維持、セキュリティ機能の提供に使用。",
		icon: <Shield className="h-4 w-4 text-minase-600" />,
		required: true,
		examples: ["セッション管理", "セキュリティ", "設定の保存"],
	},
	{
		id: "analytics",
		name: "分析クッキー",
		description: "サイト改善のための分析",
		details: "Google Analyticsによるサイト利用状況の分析。",
		icon: <BarChart3 className="h-4 w-4 text-suzuka-600" />,
		required: false,
		examples: ["Google Analytics", "ページビュー分析", "ユーザー行動分析"],
	},
	{
		id: "personalization",
		name: "パーソナライゼーション",
		description: "カスタマイズ体験",
		details: "お気に入りやテーマ設定などの個人化機能。",
		icon: <User className="h-4 w-4 text-suzuka-700" />,
		required: false,
		examples: ["テーマ設定", "言語設定", "カスタム表示"],
	},
];

interface CookiePreferencesPanelProps {
	onSave: (choices: ConsentState) => void;
	onCancel: () => void;
	open?: boolean;
}

export function CookiePreferencesPanel({
	onSave,
	onCancel,
	open = true,
}: CookiePreferencesPanelProps) {
	const isClient = useIsClient();
	const [preferences, setPreferences] = useState<ConsentChoices>({
		necessary: true,
		functional: true,
		analytics: false,
		personalization: false,
	});

	useEffect(() => {
		// Load existing preferences when client-side using unified system
		if (isClient && open) {
			// パネルが開かれた時に最新の設定を読み込む
			const saved = getCurrentConsentState();
			if (saved) {
				setPreferences({
					necessary: true, // Always true
					functional: saved.functional !== false, // Default to true if undefined
					analytics: saved.analytics === true,
					personalization: saved.personalization === true,
				});
			} else {
				// Set default values if no saved consent
				setPreferences({
					necessary: true,
					functional: true, // Default to true
					analytics: false,
					personalization: false,
				});
			}
		}
	}, [isClient, open]); // openに依存するように変更

	const handleToggle = (categoryId: keyof ConsentChoices, enabled: boolean) => {
		setPreferences((prev) => ({
			...prev,
			[categoryId]: enabled,
		}));
	};

	const handleAcceptAll = () => {
		const allAccepted: ConsentState = {
			functional: true,
			analytics: true,
			advertising: false, // No advertising services
			personalization: true,
		};
		setPreferences({
			necessary: true,
			functional: true,
			analytics: true,
			personalization: true,
		});
		onSave(allAccepted);
	};

	const handleRejectOptional = () => {
		const minimal: ConsentState = {
			functional: true,
			analytics: false,
			advertising: false, // No advertising services
			personalization: false,
		};
		setPreferences({
			necessary: true,
			functional: true,
			analytics: false,
			personalization: false,
		});
		onSave(minimal);
	};

	const handleSaveCustom = () => {
		const consentState: ConsentState = {
			functional: preferences.functional,
			analytics: preferences.analytics,
			advertising: false, // No advertising services
			personalization: preferences.personalization,
		};
		onSave(consentState);
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Shield className="h-5 w-5" />
						クッキー設定
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-2 pb-4">
					<p className="text-sm text-muted-foreground leading-relaxed">
						各カテゴリのクッキーについて、個別に許可・拒否を選択できます。
						設定はいつでも変更可能です。
					</p>
				</div>

				{/* スクロール可能なコンテンツエリア */}
				<div className="max-h-[50vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-muted">
					{COOKIE_CATEGORIES.map((category) => (
						<div key={category.id} className="border border-border rounded-lg p-4 space-y-3">
							{/* Category header */}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="p-1 bg-muted rounded">{category.icon}</div>
									<div>
										<div className="flex items-center gap-2">
											<h4 className="font-medium text-foreground">{category.name}</h4>
											{category.required && (
												<Badge variant="secondary" className="text-xs">
													必須
												</Badge>
											)}
										</div>
										<p className="text-sm text-muted-foreground">{category.description}</p>
									</div>
								</div>

								<Switch
									checked={preferences[category.id]}
									onCheckedChange={(checked) => handleToggle(category.id, checked)}
									disabled={category.required}
								/>
							</div>

							{/* Category details */}
							<div className="ml-8">
								<p className="text-xs text-muted-foreground/70 mb-2">{category.details}</p>
								<div className="flex flex-wrap gap-1">
									{category.examples.map((example) => (
										<Badge key={example} variant="outline" className="text-xs">
											{example}
										</Badge>
									))}
								</div>
							</div>
						</div>
					))}

					{/* 重要な情報 */}
					<div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground space-y-2">
						<h5 className="font-medium text-foreground">重要な情報</h5>
						<ul className="space-y-1 ml-4 list-disc">
							<li>設定は1年間保存され、期限後に再確認をお願いします</li>
							<li>必須クッキーはサイト機能のため無効化できません</li>
							<li>設定の変更は、サイト下部の「クッキー設定」からいつでも可能です</li>
							<li>
								詳細は
								<a href="/privacy" className="text-suzuka-600 hover:underline ml-1">
									プライバシーポリシー
								</a>
								をご確認ください
							</li>
						</ul>
					</div>
				</div>

				{/* 固定フッター（アクションボタン） */}
				<div className="pt-4 border-t border-border">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="flex flex-1 gap-2">
							<Button variant="outline" size="sm" onClick={handleRejectOptional} className="flex-1">
								必須のみ
							</Button>
							<Button variant="outline" size="sm" onClick={handleAcceptAll} className="flex-1">
								すべて許可
							</Button>
						</div>
						<div className="flex gap-2">
							<Button variant="ghost" size="sm" onClick={onCancel}>
								キャンセル
							</Button>
							<Button
								size="sm"
								onClick={handleSaveCustom}
								className="bg-suzuka-600 hover:bg-suzuka-700 text-white"
							>
								設定を保存
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
