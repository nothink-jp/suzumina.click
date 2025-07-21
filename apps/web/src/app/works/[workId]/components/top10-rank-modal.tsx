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
}

export function Top10RankModal({
	isOpen,
	onClose,
	onSelect,
	currentRank,
	workTitle,
}: Top10RankModalProps) {
	const [top10List, setTop10List] = useState<FrontendUserTop10List | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setLoading(true);
			getUserTop10List()
				.then(setTop10List)
				.finally(() => setLoading(false));
		}
	}, [isOpen]);

	const handleRankSelect = (rank: number) => {
		onSelect(rank);
	};

	const getRankDisplay = (rank: number) => {
		const existingWork = top10List?.rankings[rank];
		const willBePushedOut =
			rank === 10 && top10List?.totalCount === 10 && (!currentRank || currentRank > 10);

		return (
			<button
				type="button"
				key={rank}
				onClick={() => handleRankSelect(rank)}
				className={cn(
					"flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors",
					currentRank === rank
						? "border-blue-300 bg-blue-50"
						: "border-gray-200 bg-white hover:bg-gray-50",
				)}
			>
				<div className="flex items-center gap-3">
					<span className="text-lg font-bold text-gray-700">{rank}</span>
					<div className="min-w-0 flex-1">
						{existingWork ? (
							<div>
								<p className="truncate text-sm font-medium text-gray-900">
									{existingWork.workTitle}
								</p>
								{currentRank !== rank && (
									<p className="text-xs text-gray-500">→ {rank + 1}位に移動</p>
								)}
							</div>
						) : (
							<p className="text-sm text-gray-500">空き</p>
						)}
					</div>
				</div>

				{willBePushedOut && (
					<div className="ml-2 flex items-center gap-1 text-orange-600">
						<AlertTriangle className="h-4 w-4" />
						<span className="text-xs">削除されます</span>
					</div>
				)}
			</button>
		);
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>10選の順位を選択</DialogTitle>
					<DialogDescription>作品を追加する順位を選択してください</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="rounded-md bg-blue-50 p-3">
						<p className="text-sm font-medium text-blue-900">追加する作品</p>
						<p className="mt-1 text-sm text-blue-700">{workTitle}</p>
					</div>

					{loading ? (
						<div className="flex h-40 items-center justify-center">
							<div className="text-sm text-gray-500">読み込み中...</div>
						</div>
					) : (
						<div className="space-y-2">
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => getRankDisplay(rank))}
						</div>
					)}

					{top10List?.totalCount === 10 && !currentRank && (
						<div className="rounded-md bg-orange-50 p-3">
							<div className="flex items-start gap-2">
								<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-600" />
								<div className="text-sm text-orange-800">
									<p className="font-medium">10作品が登録済みです</p>
									<p className="mt-1">新しい作品を追加すると、10位の作品が自動的に削除されます。</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
