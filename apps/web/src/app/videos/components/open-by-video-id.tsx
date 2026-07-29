"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseVideoIdInput } from "@/lib/youtube-video-id";

/**
 * URL・ID でマーキング対象を直接ひらく逃げ道（導線再設計 段3）。
 * 一覧の取り込みが追いつかない・配信判定が stale な場合の救済で、
 * 折りたたみにして「選ぶ」の主導線（タブ＋カード）を邪魔しない。
 * 旧 /watch 未選択状態の URL 入力の移設先。
 */
export function OpenByVideoId() {
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("");
	const [error, setError] = useState("");
	const router = useRouter();

	const submit = () => {
		const videoId = parseVideoIdInput(value);
		if (!videoId) {
			setError("動画の URL または ID（11文字）を入力してください");
			return;
		}
		setError("");
		router.push(`/watch?v=${videoId}`);
	};

	if (!open) {
		return (
			<button
				type="button"
				className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
				onClick={() => setOpen(true)}
			>
				動画の URL・ID を直接ひらく
			</button>
		);
	}

	return (
		<div className="space-y-1 max-w-md">
			<div className="flex gap-2">
				<Input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					placeholder="動画の URL または ID を直接指定"
					autoFocus
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							submit();
						}
					}}
				/>
				<Button onClick={submit} variant="outline">
					マークして見る
				</Button>
			</div>
			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
