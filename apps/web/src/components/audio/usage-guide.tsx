"use client";

export function UsageGuide() {
	return (
		<div className="mt-4 p-3 bg-muted/50 rounded-lg">
			<ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
				<li className="flex items-start gap-2">
					<span className="text-primary">•</span>
					<span>動画を見ながら範囲を決めてください</span>
				</li>
				<li className="flex items-start gap-2">
					<span className="text-primary">•</span>
					<span>最大60秒まで切り抜き可能です</span>
				</li>
			</ul>
		</div>
	);
}
