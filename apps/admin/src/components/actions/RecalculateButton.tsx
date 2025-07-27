"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { recalculateAudioButtonCounts } from "@/app/actions/button-actions";
import { toast } from "@/lib/toast";

export default function RecalculateButton() {
	const [isLoading, setIsLoading] = useState(false);

	const handleRecalculate = async () => {
		if (
			!confirm("全動画の音声ボタン数を再計算しますか？この処理には時間がかかる場合があります。")
		) {
			return;
		}

		setIsLoading(true);
		try {
			const result = await recalculateAudioButtonCounts();
			if (result.success) {
				toast.success("音声ボタン数の再計算が完了しました");
			} else {
				toast.error(result.error || "再計算に失敗しました");
			}
		} catch (error) {
			toast.error("エラーが発生しました");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleRecalculate}
			disabled={isLoading}
			className="gap-2"
		>
			<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
			{isLoading ? "再計算中..." : "音声ボタン数を再計算"}
		</Button>
	);
}
