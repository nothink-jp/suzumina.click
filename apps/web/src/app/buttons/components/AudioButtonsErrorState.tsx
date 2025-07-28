"use client";

import { Sparkles } from "lucide-react";

interface AudioButtonsErrorStateProps {
	error: string;
}

export function AudioButtonsErrorState({ error }: AudioButtonsErrorStateProps) {
	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-rose-100 p-12">
			<div className="text-center">
				<Sparkles className="mx-auto h-16 w-16 text-rose-400 mb-4" />
				<h3 className="text-xl font-semibold text-foreground mb-2">エラーが発生しました</h3>
				<p className="text-muted-foreground">{error}</p>
			</div>
		</div>
	);
}
