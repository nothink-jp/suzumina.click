"use client";

import {
	checkMigrationReadiness,
	generateMigrationGuide,
} from "@suzumina.click/ui/components/custom/list";
import { useMemo } from "react";

// 現在のVideoListGenericの設定を再現
const currentConfig = {
	baseUrl: "/videos",
	filters: [
		{
			key: "year",
			type: "select" as const,
			label: "年代",
			options: [],
			defaultValue: "all",
		},
		{
			key: "categoryNames",
			type: "select" as const,
			label: "カテゴリ",
			options: [
				{ value: "all", label: "すべてのカテゴリ" },
				{ value: "ゲーム", label: "ゲーム" },
				{ value: "エンターテインメント", label: "エンターテインメント" },
				{ value: "音楽", label: "音楽" },
			],
			defaultValue: "all",
		},
		{
			key: "videoType",
			type: "select" as const,
			label: "動画種別",
			options: [
				{ value: "all", label: "すべての動画" },
				{ value: "live_archive", label: "配信アーカイブ" },
				{ value: "premiere", label: "プレミア公開" },
				{ value: "regular", label: "通常動画" },
				{ value: "live_upcoming", label: "配信中・配信予定" },
			],
			defaultValue: "all",
		},
	],
	sorts: [
		{ value: "newest", label: "新しい順" },
		{ value: "oldest", label: "古い順" },
	],
	defaultSort: "newest",
	searchConfig: {
		placeholder: "動画タイトルで検索...",
		debounceMs: 300,
	},
	paginationConfig: {
		itemsPerPage: 12,
		itemsPerPageOptions: [12, 24, 48],
	},
	urlParamMapping: {
		year: "year",
		categoryNames: "categoryNames",
		videoType: "videoType",
	},
};

export default function VideoListMigrationCheck() {
	const { ready, warnings, unsupportedFeatures } = useMemo(
		() => checkMigrationReadiness(currentConfig),
		[],
	);

	const migrationGuide = useMemo(
		() => generateMigrationGuide("VideoListGeneric", currentConfig),
		[],
	);

	return (
		<div className="p-6 bg-muted rounded-lg">
			<h2 className="text-lg font-semibold mb-4">移行準備状況</h2>

			<div className="mb-4">
				<p className={`font-medium ${ready ? "text-green-600" : "text-orange-600"}`}>
					{ready ? "✅ 移行可能" : "⚠️ 一部準備が必要"}
				</p>
			</div>

			{unsupportedFeatures.length > 0 && (
				<div className="mb-4">
					<h3 className="font-medium mb-2">未サポート機能:</h3>
					<ul className="list-disc list-inside text-sm">
						{unsupportedFeatures.map((feature) => (
							<li key={feature} className="text-destructive">
								{feature}
							</li>
						))}
					</ul>
				</div>
			)}

			{warnings.length > 0 && (
				<div className="mb-4">
					<h3 className="font-medium mb-2">警告:</h3>
					<ul className="list-disc list-inside text-sm">
						{warnings.map((warning) => (
							<li key={warning} className="text-orange-600">
								{warning}
							</li>
						))}
					</ul>
				</div>
			)}

			<details className="mt-6">
				<summary className="cursor-pointer font-medium">移行ガイド（クリックして展開）</summary>
				<pre className="mt-2 p-4 bg-background rounded text-xs overflow-x-auto whitespace-pre-wrap">
					{migrationGuide}
				</pre>
			</details>
		</div>
	);
}
