"use client";

interface AudioButtonsStatsProps {
	effectiveCount: number;
	currentPage: number;
	itemsPerPage: number;
}

export function AudioButtonsStats({
	effectiveCount,
	currentPage,
	itemsPerPage,
}: AudioButtonsStatsProps) {
	const startIndex = (currentPage - 1) * itemsPerPage + 1;
	const endIndex = Math.min(currentPage * itemsPerPage, effectiveCount);

	return (
		<div className="text-center">
			<div className="inline-block bg-white/60 backdrop-blur-sm rounded-full px-6 py-2 text-sm text-muted-foreground border border-suzuka-100">
				{effectiveCount.toLocaleString()}件中 {startIndex.toLocaleString()}〜
				{endIndex.toLocaleString()}件を表示
			</div>
		</div>
	);
}
