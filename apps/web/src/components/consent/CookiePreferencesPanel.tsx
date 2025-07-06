"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { CardContent } from "@suzumina.click/ui/components/ui/card";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { BarChart3, Shield, Target, User } from "lucide-react";
import { useState } from "react";

interface ConsentChoices {
	necessary: boolean;
	analytics: boolean;
	advertising: boolean;
	personalization: boolean;
}

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
		icon: <Shield className="h-4 w-4 text-green-600" />,
		required: true,
		examples: ["セッション管理", "セキュリティ", "設定の保存"],
	},
	{
		id: "analytics",
		name: "分析クッキー",
		description: "サイト改善のための分析",
		details: "Google Analyticsによるサイト利用状況の分析。",
		icon: <BarChart3 className="h-4 w-4 text-blue-600" />,
		required: false,
		examples: ["Google Analytics", "ページビュー分析", "ユーザー行動分析"],
	},
	{
		id: "advertising",
		name: "広告クッキー",
		description: "関連広告の表示",
		details: "Google AdSense、Amazonアソシエイトによる広告配信。",
		icon: <Target className="h-4 w-4 text-orange-600" />,
		required: false,
		examples: ["Google AdSense", "Amazonアソシエイト", "パーソナライズ広告"],
	},
	{
		id: "personalization",
		name: "パーソナライゼーション",
		description: "カスタマイズ体験",
		details: "お気に入りやテーマ設定などの個人化機能。",
		icon: <User className="h-4 w-4 text-purple-600" />,
		required: false,
		examples: ["テーマ設定", "言語設定", "カスタム表示"],
	},
];

interface CookiePreferencesPanelProps {
	onSave: (choices: ConsentChoices) => void;
	onCancel: () => void;
}

export function CookiePreferencesPanel({ onSave, onCancel }: CookiePreferencesPanelProps) {
	const [preferences, setPreferences] = useState<ConsentChoices>(() => {
		// Load existing preferences or use defaults
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("cookie-consent");
			if (saved) {
				try {
					return JSON.parse(saved);
				} catch {
					// Fallback to defaults if parsing fails
				}
			}
		}

		return {
			necessary: true,
			analytics: false,
			advertising: false,
			personalization: false,
		};
	});

	const handleToggle = (categoryId: keyof ConsentChoices, enabled: boolean) => {
		setPreferences((prev) => ({
			...prev,
			[categoryId]: enabled,
		}));
	};

	const handleAcceptAll = () => {
		const allAccepted: ConsentChoices = {
			necessary: true,
			analytics: true,
			advertising: true,
			personalization: true,
		};
		setPreferences(allAccepted);
		onSave(allAccepted);
	};

	const handleRejectOptional = () => {
		const minimal: ConsentChoices = {
			necessary: true,
			analytics: false,
			advertising: false,
			personalization: false,
		};
		setPreferences(minimal);
		onSave(minimal);
	};

	const handleSaveCustom = () => {
		onSave(preferences);
	};

	return (
		<CardContent className="p-0">
			{/* ヘッダー（固定） */}
			<div className="p-6 pb-4 border-b border-border bg-background/50">
				<div className="space-y-2">
					<p className="text-sm text-gray-600 leading-relaxed">
						各カテゴリのクッキーについて、個別に許可・拒否を選択できます。
						設定はいつでも変更可能です。
					</p>
				</div>
			</div>

			{/* スクロール可能なコンテンツエリア */}
			<div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
				{COOKIE_CATEGORIES.map((category) => (
					<div key={category.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
						{/* Category header */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-1 bg-gray-100 rounded">{category.icon}</div>
								<div>
									<div className="flex items-center gap-2">
										<h4 className="font-medium text-gray-900">{category.name}</h4>
										{category.required && (
											<Badge variant="secondary" className="text-xs">
												必須
											</Badge>
										)}
									</div>
									<p className="text-sm text-gray-600">{category.description}</p>
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
							<p className="text-xs text-gray-500 mb-2">{category.details}</p>
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
				<div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
					<h5 className="font-medium text-gray-900">重要な情報</h5>
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
			<div className="p-6 pt-4 border-t border-border bg-background/50">
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
		</CardContent>
	);
}
