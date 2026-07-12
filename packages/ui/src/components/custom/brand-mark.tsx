import type { SVGProps } from "react";

interface BrandMarkProps extends SVGProps<SVGSVGElement> {
	size?: string | number;
}

/**
 * suzumina.click ブランドマーク（さくら / うさぎ）。
 * パスデータはデザインハンドオフの最終形状（high-fidelity）— 形状・比率は変更しない。
 *
 * 色は `currentColor` 継承。既定色は `text-suzuka-500 dark:text-suzuka-600`
 * （または semantic な `text-primary`）を className で指定する。
 * heart（機能色）/ minase（面用）をマーク本体色に使わない。
 * 最小サイズ 16px。装飾利用は aria-hidden のまま、単体でリンク等になる場合は
 * role="img" + <title> を利用側で付与する。
 */
export function SakuraMark({ size = 24, className, ...props }: BrandMarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			fill="currentColor"
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
			{...props}
		>
			<g transform="translate(256 273)">
				<path d="M0 -28C-74 -54 -88 -148 -50 -198L0 -172L50 -198C88 -148 74 -54 0 -28Z" />
				<path
					transform="rotate(72)"
					d="M0 -28C-74 -54 -88 -148 -50 -198L0 -172L50 -198C88 -148 74 -54 0 -28Z"
				/>
				<path
					transform="rotate(144)"
					d="M0 -28C-74 -54 -88 -148 -50 -198L0 -172L50 -198C88 -148 74 -54 0 -28Z"
				/>
				<path
					transform="rotate(216)"
					d="M0 -28C-74 -54 -88 -148 -50 -198L0 -172L50 -198C88 -148 74 -54 0 -28Z"
				/>
				<path
					transform="rotate(288)"
					d="M0 -28C-74 -54 -88 -148 -50 -198L0 -172L50 -198C88 -148 74 -54 0 -28Z"
				/>
			</g>
		</svg>
	);
}

/**
 * うさぎマーク。図形は縦長（実寸 約304×380）のため、さくらと並べる場合は
 * うさぎ側を基準に高さを揃える（並び順は「うさぎ左・さくら右」が基本）。
 */
export function RabbitMark({ size = 24, className, ...props }: BrandMarkProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			fill="currentColor"
			width={size}
			height={size}
			className={className}
			aria-hidden="true"
			{...props}
		>
			<path
				transform="translate(0 -16)"
				d="M242 242C238 190 224 130 196 96C184 84 166 82 156 96C132 130 128 196 142 246C118 268 104 300 104 336C104 420 172 462 256 462C340 462 408 420 408 336C408 300 394 268 370 246C384 196 380 130 356 96C346 82 328 84 316 96C288 130 274 190 270 242C264 254 248 254 242 242Z"
			/>
		</svg>
	);
}
