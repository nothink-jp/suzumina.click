"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export function AudioButtonsEmptyState() {
	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-12">
			<div className="text-center">
				<Sparkles className="mx-auto h-16 w-16 text-suzuka-400 mb-4" />
				<h3 className="text-xl font-semibold text-foreground mb-2">
					音声ボタンが見つかりませんでした
				</h3>
				<p className="text-muted-foreground mb-6">
					検索条件を変更するか、新しい音声ボタンを作成してみましょう
				</p>
				<Button asChild className="bg-suzuka-500 hover:bg-suzuka-600 text-white">
					<Link href="/buttons/create">
						<Plus className="h-4 w-4 mr-2" />
						音声ボタンを作成
					</Link>
				</Button>
			</div>
		</div>
	);
}
