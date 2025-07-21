"use client";

import type { EvaluationInput, FrontendWorkEvaluation } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import { AlertCircle, Loader2, Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { removeWorkEvaluation, updateWorkEvaluation } from "../evaluation-actions";
import { EvaluationRadioGroup } from "./evaluation-radio-group";
import { Top10RankModal } from "./top10-rank-modal";

interface WorkEvaluationProps {
	workId: string;
	workTitle: string;
	initialEvaluation: FrontendWorkEvaluation | null;
}

export function WorkEvaluation({ workId, workTitle, initialEvaluation }: WorkEvaluationProps) {
	const { data: session } = useSession();
	const [evaluation, setEvaluation] = useState(initialEvaluation);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [showTop10Modal, setShowTop10Modal] = useState(false);
	const [pendingRank, setPendingRank] = useState<number | null>(null);

	const handleEvaluationChange = (input: EvaluationInput) => {
		setError(null);

		if (input.type === "top10") {
			setShowTop10Modal(true);
			return;
		}

		startTransition(async () => {
			const result = await updateWorkEvaluation(workId, {
				...input,
				workTitle,
			});

			if (result.success) {
				if (result.data) {
					setEvaluation(result.data);
				} else if (input.type === "remove") {
					setEvaluation(null);
				}
			} else {
				setError(result.error || "評価の更新に失敗しました");
			}
		});
	};

	const handleTop10RankSelect = (rank: number) => {
		setPendingRank(rank);
		setShowTop10Modal(false);

		startTransition(async () => {
			const result = await updateWorkEvaluation(workId, {
				type: "top10",
				top10Rank: rank,
				workTitle,
			});

			if (result.success && result.data) {
				setEvaluation(result.data);
			} else {
				setError(result.error || "10選への追加に失敗しました");
			}
			setPendingRank(null);
		});
	};

	const handleRemove = () => {
		setError(null);

		startTransition(async () => {
			const result = await removeWorkEvaluation(workId);

			if (result.success) {
				setEvaluation(null);
			} else {
				setError(result.error || "評価の削除に失敗しました");
			}
		});
	};

	if (!session) {
		return (
			<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
				<p className="text-sm text-gray-600">
					評価するには
					<button
						type="button"
						className="text-blue-600 underline hover:text-blue-700"
						onClick={() => {
							// TODO: ログインモーダルを開く
						}}
					>
						ログイン
					</button>
					が必要です
				</p>
			</div>
		);
	}

	const isTop10 = evaluation?.evaluationType === "top10";
	const isLoading = isPending || pendingRank !== null;

	return (
		<div className="space-y-4">
			<div className="rounded-lg border border-gray-200 bg-white p-4">
				<h3 className="mb-3 text-sm font-semibold text-gray-900">作品の評価</h3>

				{error && (
					<div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
						<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<div className="space-y-3">
					{isTop10 && evaluation && (
						<div className="flex items-center justify-between rounded-md bg-yellow-50 p-3">
							<div className="flex items-center gap-2">
								<Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
								<span className="text-sm font-medium text-gray-900">
									10選 {evaluation.top10Rank}位
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowTop10Modal(true)}
								disabled={isLoading}
								className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
							>
								順位変更
							</button>
						</div>
					)}

					<EvaluationRadioGroup
						value={
							evaluation
								? {
										type: evaluation.evaluationType,
										...(evaluation.evaluationType === "star" && {
											starRating: evaluation.starRating,
										}),
									}
								: null
						}
						onChange={handleEvaluationChange}
						disabled={isLoading}
					/>

					{evaluation && (
						<button
							type="button"
							onClick={handleRemove}
							disabled={isLoading}
							className={cn(
								"w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700",
								"hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
								"disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							{isLoading ? (
								<span className="flex items-center justify-center gap-2">
									<Loader2 className="h-4 w-4 animate-spin" />
									処理中...
								</span>
							) : (
								"評価を削除"
							)}
						</button>
					)}
				</div>
			</div>

			<Top10RankModal
				isOpen={showTop10Modal}
				onClose={() => setShowTop10Modal(false)}
				onSelect={handleTop10RankSelect}
				currentRank={evaluation?.evaluationType === "top10" ? evaluation.top10Rank : undefined}
				workTitle={workTitle}
			/>
		</div>
	);
}
