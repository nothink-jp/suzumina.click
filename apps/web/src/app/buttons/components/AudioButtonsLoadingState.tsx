"use client";

export function AudioButtonsLoadingState() {
	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-12">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
				<p className="mt-2 text-muted-foreground">読み込み中...</p>
			</div>
		</div>
	);
}
