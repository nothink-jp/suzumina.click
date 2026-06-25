"use client";

import type { EvaluationInput, FrontendWorkEvaluation } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import { AlertCircle, Loader2, Star } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useSession } from "@/lib/auth/client";
import {
	getWorkEvaluation,
	removeWorkEvaluation,
	updateWorkEvaluation,
} from "../evaluation-actions";
import { EvaluationRadioGroup } from "./evaluation-radio-group";
import { Top10RankModal } from "./top10-rank-modal";

interface WorkEvaluationProps {
	workId: string;
	workTitle: string;
}

export function WorkEvaluation({ workId, workTitle }: WorkEvaluationProps) {
	const user = useSession();
	const [evaluation, setEvaluation] = useState<FrontendWorkEvaluation | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [showTop10Modal, setShowTop10Modal] = useState(false);
	const [pendingRank, setPendingRank] = useState<number | null>(null);

	// per-user の評価は SSR に焼かず、認証済みなら client で自分の評価を取得する（純公開 shell・SPR-226）。
	// これにより /works/[id] を共有キャッシュ可（public）へ戻しても A の評価が B に漏れない。
	useEffect(() => {
		if (!user?.discordId) return;
		let cancelled = false;
		void getWorkEvaluation(workId).then((result) => {
			if (!cancelled) setEvaluation(result);
		});
		return () => {
			cancelled = true;
		};
	}, [user?.discordId, workId]);

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

		// モーダルを閉じる
		setShowTop10Modal(false);
		setPendingRank(null);

		startTransition(async () => {
			const result = await removeWorkEvaluation(workId);

			if (result.success) {
				setEvaluation(null);
			} else {
				setError(result.error || "評価の削除に失敗しました");
			}
		});
	};

	if (!user) {
		return (
			<div className="rounded-lg border border-border bg-muted p-4">
				<p className="text-sm text-muted-foreground">
					評価するには
					<button
						type="button"
						className="text-info underline hover:text-info/90"
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
			<div className="rounded-lg border border-border bg-white p-4">
				<h3 className="mb-3 text-sm font-semibold text-foreground">作品の評価</h3>

				{error && (
					<div className="mb-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
						<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
						<span>{error}</span>
					</div>
				)}

				<div className="space-y-3">
					{isTop10 && evaluation && (
						<div className="flex items-center justify-between rounded-md bg-warning/10 p-3">
							<div className="flex items-center gap-2">
								<Star className="h-4 w-4 fill-warning text-warning" />
								<span className="text-sm font-medium text-foreground">
									10選 {evaluation.top10Rank}位
								</span>
							</div>
							<button
								type="button"
								onClick={() => setShowTop10Modal(true)}
								disabled={isLoading}
								className="text-sm text-info hover:text-info/90 disabled:opacity-50"
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
								"w-full rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground",
								"hover:bg-muted focus:outline-none focus:ring-2 focus:ring-info focus:ring-offset-2",
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
				workId={workId}
			/>
		</div>
	);
}
