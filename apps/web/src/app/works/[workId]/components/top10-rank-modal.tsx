"use client";

import type { FrontendUserTop10List } from "@suzumina.click/shared-types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@suzumina.click/ui/components/ui/dialog";
import { cn } from "@suzumina.click/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserTop10List } from "../evaluation-actions";

interface Top10RankModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelect: (rank: number) => void;
	currentRank?: number;
	workTitle: string;
	workId: string;
}

export function Top10RankModal({
	isOpen,
	onClose,
	onSelect,
	currentRank,
	workTitle,
	workId,
}: Top10RankModalProps) {
	const [top10List, setTop10List] = useState<FrontendUserTop10List | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setLoading(true);
			getUserTop10List()
				.then(setTop10List)
				.finally(() => setLoading(false));
		} else {
			// モーダルが閉じられた時に状態をリセット
			setTop10List(null);
			setLoading(false);
		}
	}, [isOpen]);

	const handleRankSelect = (rank: number) => {
		// 現在の作品が既に同じ順位に登録されている場合は何もしない
		const existingWork = top10List?.rankings[rank];
		if (existingWork?.workId === workId) {
			return;
		}

		onSelect(rank);
	};

	// 現在の作品が既に10選に登録されているかチェック
	const _isCurrentWorkInTop10 = top10List
		? Object.values(top10List.rankings).some((work) => work?.workId === workId)
		: false;

	const getButtonStyles = (rank: number, isSameWorkAtRank: boolean) => {
		if (currentRank === rank) return "border-blue-300 bg-blue-50";
		if (isSameWorkAtRank) return "border-yellow-300 bg-yellow-50 hover:bg-yellow-100";
		return "border-gray-200 bg-white hover:bg-gray-50";
	};

	const renderWorkInfo = (
		existingWork: FrontendUserTop10List["rankings"][number] | undefined,
		isSameWorkAtRank: boolean,
		rank: number,
	) => {
		if (!existingWork) {
			return <p className="text-sm text-gray-500">空き</p>;
		}

		return (
			<div className="space-y-1">
				<p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
					{existingWork.workTitle}
				</p>
				{isSameWorkAtRank ? (
					<p className="text-xs text-yellow-700">現在の作品 (順位変更なし)</p>
				) : currentRank !== rank ? (
					rank + 1 <= 10 ? (
						<p className="text-xs text-gray-500">→ {rank + 1}位に移動</p>
					) : (
						<p className="text-xs text-orange-600">→ 10選から削除されます</p>
					)
				) : null}
			</div>
		);
	};

	const getRankDisplay = (rank: number) => {
		const existingWork = top10List?.rankings[rank];
		const willBePushedOut =
			rank === 10 && top10List?.totalCount === 10 && (!currentRank || currentRank > 10);
		const isSameWorkAtRank = existingWork?.workId === workId;

		// 空きスロット以降を無効化する条件を判定
		const totalCount = top10List?.totalCount || 0;
		const isCurrentWorkInTop10 = top10List
			? Object.values(top10List.rankings).some((work) => work?.workId === workId)
			: false;

		// 新規追加の場合のみ、現在の登録数+1より大きい順位を無効化
		// 既存作品の順位変更の場合は無効化しない
		const shouldDisable = rank > totalCount + 1 && !existingWork && !isCurrentWorkInTop10;

		return (
			<button
				type="button"
				key={rank}
				onClick={() => handleRankSelect(rank)}
				disabled={shouldDisable}
				className={cn(
					"flex w-full items-start rounded-md border px-4 py-3 text-left transition-colors",
					shouldDisable
						? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
						: getButtonStyles(rank, isSameWorkAtRank),
				)}
			>
				<div className="flex w-full items-start gap-3">
					<span className="text-lg font-bold text-gray-700 flex-shrink-0">{rank}</span>
					<div className="min-w-0 flex-1">
						{shouldDisable && !existingWork ? (
							<p className="text-sm text-gray-400">選択不可</p>
						) : (
							renderWorkInfo(existingWork, isSameWorkAtRank, rank)
						)}
					</div>
					{willBePushedOut && (
						<div className="flex items-center gap-1 text-orange-600 flex-shrink-0">
							<AlertTriangle className="h-4 w-4" />
							<span className="text-xs">削除されます</span>
						</div>
					)}
				</div>
			</button>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
				<div className="p-6 pb-0 flex-shrink-0">
					<DialogHeader>
						<DialogTitle>10選の順位を選択</DialogTitle>
						<DialogDescription>作品を追加する順位を選択してください</DialogDescription>
					</DialogHeader>

					<div className="rounded-md bg-blue-50 p-3 mt-4 mb-4">
						<p className="text-sm font-medium text-blue-900">追加する作品</p>
						<p className="mt-1 text-sm text-blue-700">{workTitle}</p>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto px-6 min-h-0">
					{loading ? (
						<div className="flex h-40 items-center justify-center">
							<div className="text-sm text-gray-500">読み込み中...</div>
						</div>
					) : (
						<div className="space-y-2">
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => getRankDisplay(rank))}
						</div>
					)}
				</div>

				{top10List?.totalCount === 10 && !currentRank && (
					<div className="p-6 pt-4 flex-shrink-0">
						<div className="rounded-md bg-orange-50 p-3">
							<div className="flex items-start gap-2">
								<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
								<div className="text-sm text-orange-800">
									<p className="font-medium">10作品が登録済みです</p>
									<p className="mt-1">新しい作品を追加すると、10位の作品が自動的に削除されます。</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
