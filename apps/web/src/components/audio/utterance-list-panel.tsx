"use client";

import {
	normalizeForTranscriptSearch,
	type TranscriptUtterance,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Captions, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatSeconds } from "@/utils/format-seconds";

const roundTenth = (value: number) => Math.round(value * 10) / 10;

interface UtteranceListPanelProps {
	utterances: TranscriptUtterance[];
	loadedRanges: Array<{ start: number; end: number }>;
	isLoading: boolean;
	error: string | null;
	/** 「この周辺の発話を読み込む」の対象秒（再生位置） */
	currentTime: number;
	/** 対象秒のチャンクが読み込み済みか（ボタンの出し分け） */
	isLoadedAt: (timeSeconds: number) => boolean;
	disabled?: boolean;
	onLoadAt: (timeSeconds: number) => void;
	/** 行クリック（extend=Shift クリック: 現在区間を発話まで広げる） */
	onSelect: (utterance: TranscriptUtterance, extend: boolean) => void;
	/** セリフ検索（SPR-293）: 初回の検索入力でキャッシュ済み全チャンクを読み込む */
	onLoadAllCached: () => void;
	hasLoadedAllCached: boolean;
	/** 検索ヒットの開始秒（探索レーンの縦線マーク用）。検索が空なら [] */
	onSearchHitsChange: (hitStartTimes: number[]) => void;
}

/**
 * 発話リストとセリフ検索（SPR-292/293）。
 * 「探す＝聴く」を「読む」に変える段。クリックで発話に区間スナップ＋タイトルプリフィル。
 * 検索はキャッシュ済み文字起こし（バックログ処理が随時埋める）に対する
 * かな正規化の部分一致。カバレッジが部分的な間はその旨を表示する。
 */
export function UtteranceListPanel({
	utterances,
	loadedRanges,
	isLoading,
	error,
	currentTime,
	isLoadedAt,
	disabled = false,
	onLoadAt,
	onSelect,
	onLoadAllCached,
	hasLoadedAllCached,
	onSearchHitsChange,
}: UtteranceListPanelProps) {
	const [query, setQuery] = useState("");
	const normalizedQuery = normalizeForTranscriptSearch(query);
	const isSearching = normalizedQuery.length > 0;

	// 検索意図が見えた時点でキャッシュ済み全チャンクを読み込む（生成なし＝軽い）
	useEffect(() => {
		if (isSearching && !hasLoadedAllCached) {
			onLoadAllCached();
		}
	}, [isSearching, hasLoadedAllCached, onLoadAllCached]);

	const visibleUtterances = useMemo(() => {
		if (!isSearching) {
			return utterances;
		}
		return utterances.filter((utterance) =>
			normalizeForTranscriptSearch(utterance.text).includes(normalizedQuery),
		);
	}, [utterances, isSearching, normalizedQuery]);

	// 探索レーンの縦線マーク（検索中のみ）
	useEffect(() => {
		onSearchHitsChange(isSearching ? visibleUtterances.map((u) => u.start) : []);
	}, [isSearching, visibleUtterances, onSearchHitsChange]);

	const rangeLabel =
		loadedRanges.length > 0
			? loadedRanges
					.map((range) => `${formatSeconds(range.start)}〜${formatSeconds(range.end)}`)
					.join(" / ")
			: null;
	const currentLoaded = isLoadedAt(currentTime);

	return (
		<div className="bg-card border rounded-lg p-4 shadow-sm">
			<h3 className="mb-1 flex items-center gap-2 text-base font-semibold">
				<Captions className="h-4 w-4 text-primary" />
				セリフから選ぶ
			</h3>
			<p className="mb-3 text-xs text-muted-foreground">
				発話をクリックでその区間に。<strong className="text-foreground">Shift＋クリック</strong>
				で隣の発話まで広げます
			</p>

			<div className="relative mb-3">
				<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="セリフで探す（例: あはは）"
					disabled={disabled}
					className="min-h-[44px] pl-9 text-sm"
				/>
			</div>

			{error && <p className="mb-2 text-sm text-destructive">{error}</p>}

			{isSearching && (
				<p className="mb-2 text-xs text-muted-foreground">
					{visibleUtterances.length > 0
						? `${visibleUtterances.length}件ヒット（探索レーンに位置を表示中）`
						: "ヒットなし"}
					{!hasLoadedAllCached && "・全編読み込み中…"}
				</p>
			)}

			{visibleUtterances.length > 0 && (
				<div className="mb-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
					{visibleUtterances.map((utterance) => (
						<button
							key={`row-${utterance.start}`}
							type="button"
							data-testid="utterance-row"
							disabled={disabled}
							onClick={(event) => onSelect(utterance, event.shiftKey)}
							className="flex items-baseline gap-2 rounded-md border border-transparent px-2 py-1.5 text-left hover:border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
						>
							<span className="font-mono text-[11px] font-semibold whitespace-nowrap text-primary">
								{formatSeconds(utterance.start)}
							</span>
							<span className="min-w-0 flex-1 text-sm leading-snug">{utterance.text}</span>
							<span className="text-xs whitespace-nowrap text-muted-foreground">
								{`${roundTenth(utterance.end - utterance.start).toFixed(1)}秒`}
							</span>
						</button>
					))}
				</div>
			)}

			{isLoading ? (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					文字起こしを生成しています（初回は30秒ほどかかります）
				</div>
			) : (
				!isSearching &&
				!currentLoaded && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => onLoadAt(currentTime)}
						disabled={disabled}
						className="h-9 w-full"
					>
						再生位置の周辺の発話を読み込む
					</Button>
				)
			)}

			{rangeLabel && !isSearching && (
				<p className="mt-2 text-xs text-muted-foreground">読み込み済み: {rangeLabel}</p>
			)}
		</div>
	);
}
