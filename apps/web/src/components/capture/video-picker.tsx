"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import Link from "next/link";
import { useState } from "react";

interface VideoPickerProps {
	/** ?v= で指定されたが videos に無かった動画ID（理由の提示にだけ使う） */
	notFoundVideoId?: string;
	onSubmit: (rawInput: string) => void;
}

/**
 * マーキング対象の動画を選ぶ。
 * 「配信が見つからないエラー」ではなく選択状態として扱う（動画視聴マーキングでは未選択が常態）。
 */
export function VideoPicker({ notFoundVideoId, onSubmit }: VideoPickerProps) {
	const [manualInput, setManualInput] = useState("");

	return (
		<div className="border rounded-lg p-6 space-y-4">
			<div className="text-center space-y-1">
				<p className="font-medium">マーキングする動画を選ぶ</p>
				<p className="text-sm text-muted-foreground">
					{notFoundVideoId
						? `指定された動画（${notFoundVideoId}）が見つかりません。まだ取り込まれていない可能性があります。`
						: "配信中・配信予定があれば自動で選ばれます。動画一覧から選ぶか、URL / ID を直接指定してください。"}
				</p>
			</div>
			<div className="flex gap-2 max-w-md mx-auto">
				<Input
					value={manualInput}
					onChange={(e) => setManualInput(e.target.value)}
					placeholder="動画の URL または ID を直接指定"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							onSubmit(manualInput);
						}
					}}
				/>
				<Button onClick={() => onSubmit(manualInput)} variant="outline">
					表示
				</Button>
			</div>
			<div className="text-center">
				<Button size="sm" variant="ghost" render={<Link href="/videos">動画一覧から選ぶ</Link>} />
			</div>
		</div>
	);
}
