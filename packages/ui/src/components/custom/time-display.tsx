import { cn } from "../../lib/utils";

export interface TimeDisplayProps {
	/**
	 * 表示する時間（秒）
	 */
	time: number;
	/**
	 * 時間フォーマット
	 * - 'mm:ss.s': 分:秒.小数 (例: 5:23.4)
	 * - 'h:mm:ss.s': 時:分:秒.小数 (例: 1:05:23.4)
	 * - 'auto': 1時間未満は mm:ss.s、1時間以上は h:mm:ss.s
	 */
	format?: "mm:ss.s" | "h:mm:ss.s" | "auto";
	/**
	 * カスタムクラス名
	 */
	className?: string;
	/**
	 * ラベルを表示するかどうか
	 */
	showLabel?: boolean;
	/**
	 * カスタムラベル（指定しない場合は自動生成）
	 */
	label?: string;
	/**
	 * ラベルのクラス名
	 */
	labelClassName?: string;
	/**
	 * 無効な時間の場合の表示テキスト
	 */
	invalidText?: string;
}

/**
 * 時間を指定されたフォーマットで表示するコンポーネント
 *
 * @example
 * ```tsx
 * <TimeDisplay time={63.4} format="mm:ss.s" />
 * // 表示: 1:03.4
 *
 * <TimeDisplay time={3723.8} format="h:mm:ss.s" />
 * // 表示: 1:02:03.8
 *
 * <TimeDisplay time={30.5} showLabel label="再生時間" />
 * // 表示: 再生時間: 0:30.5
 * ```
 */
export function TimeDisplay({
	time,
	format = "auto",
	className,
	showLabel = false,
	label,
	labelClassName,
	invalidText = "無効",
}: TimeDisplayProps) {
	// 無効な時間値のチェック
	if (typeof time !== "number" || Number.isNaN(time) || !Number.isFinite(time) || time < 0) {
		return (
			<span className={cn("text-destructive", className)}>
				{showLabel && (
					<span className={cn("text-muted-foreground mr-1", labelClassName)}>
						{label || "時間"}:
					</span>
				)}
				{invalidText}
			</span>
		);
	}

	// フォーマットの決定
	const actualFormat = format === "auto" ? (time >= 3600 ? "h:mm:ss.s" : "mm:ss.s") : format;

	// 時間の計算
	const hours = Math.floor(time / 3600);
	const minutes = Math.floor((time % 3600) / 60);
	const seconds = Math.floor(time % 60);
	const decimal = Math.floor((time % 1) * 10);

	// フォーマットに応じた文字列生成
	let timeString: string;
	switch (actualFormat) {
		case "h:mm:ss.s":
			timeString = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${decimal}`;
			break;
		default: {
			// 分に時間分も含める
			const totalMinutes = Math.floor(time / 60);
			timeString = `${totalMinutes}:${String(seconds).padStart(2, "0")}.${decimal}`;
			break;
		}
	}

	// ラベルの決定
	const displayLabel = showLabel ? label || "時間" : null;

	return (
		<span className={cn("font-mono", className)}>
			{displayLabel && (
				<span className={cn("text-muted-foreground mr-1", labelClassName)}>{displayLabel}:</span>
			)}
			<span className="font-semibold">{timeString}</span>
		</span>
	);
}
