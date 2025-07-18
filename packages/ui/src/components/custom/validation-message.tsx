import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ValidationMessageProps {
	/**
	 * バリデーションメッセージの種類
	 * - 'error': エラーメッセージ（赤色）
	 * - 'warning': 警告メッセージ（オレンジ色）
	 * - 'info': 情報メッセージ（青色）
	 */
	variant: "error" | "warning" | "info";
	/**
	 * 表示するメッセージ
	 */
	message: string;
	/**
	 * メッセージを表示するかどうか
	 */
	isVisible: boolean;
	/**
	 * アイコンを表示するかどうか
	 */
	showIcon?: boolean;
	/**
	 * カスタムクラス名
	 */
	className?: string;
	/**
	 * アニメーション効果を有効にするかどうか
	 */
	animated?: boolean;
	/**
	 * コンパクトサイズで表示するかどうか
	 */
	compact?: boolean;
}

/**
 * バリデーションメッセージを表示するコンポーネント
 * フォームの入力検証やエラー表示に使用
 *
 * @example
 * ```tsx
 * <ValidationMessage
 *   variant="error"
 *   message="入力値が無効です"
 *   isVisible={hasError}
 * />
 *
 * <ValidationMessage
 *   variant="warning"
 *   message="推奨範囲外です"
 *   isVisible={showWarning}
 *   showIcon
 * />
 * ```
 */
export function ValidationMessage({
	variant,
	message,
	isVisible,
	showIcon = true,
	className,
	animated = true,
	compact = false,
}: ValidationMessageProps) {
	if (!isVisible) {
		return null;
	}

	// バリアント別のスタイルとアイコン
	const variantStyles = {
		error: {
			container: "text-destructive",
			icon: AlertCircle,
		},
		warning: {
			container: "text-orange-600 dark:text-orange-400",
			icon: AlertTriangle,
		},
		info: {
			container: "text-blue-600 dark:text-blue-400",
			icon: Info,
		},
	};

	const currentVariant = variantStyles[variant];
	const IconComponent = currentVariant.icon;

	return (
		<div
			className={cn(
				"flex items-start gap-1.5",
				currentVariant.container,
				compact ? "text-xs" : "text-xs sm:text-sm",
				animated && "animate-in fade-in-0 slide-in-from-top-1 duration-200",
				className,
			)}
			role="alert"
			aria-live="polite"
		>
			{showIcon && (
				<IconComponent className={cn("flex-shrink-0 mt-0.5", compact ? "h-3 w-3" : "h-4 w-4")} />
			)}
			<span className={cn("leading-tight", compact ? "mt-0" : "mt-0.5")}>{message}</span>
		</div>
	);
}

/**
 * 事前定義されたメッセージを持つバリデーションメッセージコンポーネント
 */
export const ValidationMessages = {
	/**
	 * 時間範囲の検証メッセージ
	 */
	TimeRange: ({ isVisible, ...props }: Omit<ValidationMessageProps, "variant" | "message">) => (
		<ValidationMessage
			variant="error"
			message="開始時間は終了時間より前にしてください"
			isVisible={isVisible}
			{...props}
		/>
	),

	/**
	 * 最大時間制限の検証メッセージ
	 */
	MaxDuration: ({
		maxSeconds = 60,
		isVisible,
		...props
	}: Omit<ValidationMessageProps, "variant" | "message"> & {
		maxSeconds?: number;
	}) => (
		<ValidationMessage
			variant="error"
			message={`${maxSeconds}秒以下にしてください`}
			isVisible={isVisible}
			{...props}
		/>
	),

	/**
	 * 最小時間制限の検証メッセージ
	 */
	MinDuration: ({
		minSeconds = 1,
		isVisible,
		...props
	}: Omit<ValidationMessageProps, "variant" | "message"> & {
		minSeconds?: number;
	}) => (
		<ValidationMessage
			variant="error"
			message={`${minSeconds}秒以上にしてください`}
			isVisible={isVisible}
			{...props}
		/>
	),

	/**
	 * 必須フィールドの検証メッセージ
	 */
	Required: ({
		fieldName = "この項目",
		isVisible,
		...props
	}: Omit<ValidationMessageProps, "variant" | "message"> & {
		fieldName?: string;
	}) => (
		<ValidationMessage
			variant="error"
			message={`${fieldName}は必須です`}
			isVisible={isVisible}
			{...props}
		/>
	),

	/**
	 * 文字数制限の検証メッセージ
	 */
	MaxLength: ({
		maxLength,
		isVisible,
		...props
	}: Omit<ValidationMessageProps, "variant" | "message"> & {
		maxLength: number;
	}) => (
		<ValidationMessage
			variant="error"
			message={`${maxLength}文字以下で入力してください`}
			isVisible={isVisible}
			{...props}
		/>
	),

	/**
	 * 形式エラーの検証メッセージ
	 */
	InvalidFormat: ({
		format = "正しい形式",
		isVisible,
		...props
	}: Omit<ValidationMessageProps, "variant" | "message"> & {
		format?: string;
	}) => (
		<ValidationMessage
			variant="error"
			message={`${format}で入力してください`}
			isVisible={isVisible}
			{...props}
		/>
	),
};
