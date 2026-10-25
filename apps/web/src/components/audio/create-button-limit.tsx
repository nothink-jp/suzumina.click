"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Progress } from "@suzumina.click/ui/components/ui/progress";
import { useEffect, useState } from "react";
import { getUserRateLimitInfo } from "@/actions/rate-limit-actions";
import type { RateLimitCheckResult } from "@/lib/button-rate-limit";
import { FAMILY_DAILY_BUTTON_LIMIT, formatTimeUntilReset } from "@/lib/rate-limit-utils";

/**
 * ログイン中ユーザー本人のボタン作成の残り回数を表示するコンポーネント
 */
export function CreateButtonLimit() {
	const [limit, setLimit] = useState<RateLimitCheckResult | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchLimit = async () => {
			try {
				setLimit(await getUserRateLimitInfo());
			} catch (_error) {
				// サーバ側の失敗は null で返る。ここに来るのは Action 呼び出し自体の失敗（通信断・デプロイ直後の ID 不一致）で、表示を出さないだけにする
			} finally {
				setLoading(false);
			}
		};

		void fetchLimit();
		// 1分ごとに更新
		const interval = setInterval(fetchLimit, 60000);
		return () => clearInterval(interval);
	}, []);

	if (loading || !limit) {
		return null;
	}

	const percentage = (limit.current / limit.limit) * 100;
	const isNearLimit = percentage > 80;
	const isAtLimit = limit.remaining === 0;

	return (
		<div className="rounded-lg border bg-card p-4">
			<div className="mb-2 flex items-center justify-between">
				<span className="text-sm font-medium">本日の作成数</span>
				{limit.isFamilyMember && (
					<Badge variant="secondary" className="text-xs">
						すずみなふぁみりー
					</Badge>
				)}
			</div>

			<div className="mb-2 flex justify-between text-sm">
				<span className={isAtLimit ? "font-bold text-destructive" : ""}>
					{limit.current} / {limit.limit}
				</span>
				{limit.remaining > 0 && (
					<span className="text-muted-foreground">残り{limit.remaining}個</span>
				)}
			</div>

			<Progress
				value={percentage}
				aria-label={`本日の音声ボタン作成数 ${limit.current}/${limit.limit}`}
				className={`h-2 ${isNearLimit ? "[&>div]:bg-warning" : ""} ${
					isAtLimit ? "[&>div]:bg-destructive" : ""
				}`}
			/>

			{isAtLimit && (
				<p className="mt-2 text-xs text-destructive">
					本日の上限に達しました。{formatTimeUntilReset()}にリセットされます。
				</p>
			)}

			{!limit.isFamilyMember && (
				<p className="mt-3 text-xs text-muted-foreground">
					💡 すずみなふぁみりーに参加すると1日{FAMILY_DAILY_BUTTON_LIMIT}個まで作成できます
				</p>
			)}
		</div>
	);
}
