"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";

interface ThumbnailImageProps {
	src: string;
	alt: string;
	className?: string;
	priority?: boolean;
	width?: number;
	height?: number;
	sizes?: string;
	fallbackSrc?: string; // フォールバック画像URL
	loading?: "lazy" | "eager"; // 遅延読み込み制御
	quality?: number; // 画像品質（1-100）
	optimized?: boolean; // Next.js画像最適化の有効/無効
}

// lucide-react の Image アイコンを使用したプレースホルダー
const PLACEHOLDER_IMAGE =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiB2aWV3Qm94PSIwIDAgMTI4IDk2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQwLCAyNCkiPgo8cmVjdCB4PSIzIiB5PSI0IiB3aWR0aD0iNDIiIGhlaWdodD0iNDAiIHJ4PSIyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIxNS41IiBjeT0iMTUuNSIgcj0iMy41IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8cGF0aCBkPSJtOSAzNiA5LTkgNSA1IDEyLTEyIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjwvZz4KPC9zdmc+Cg==";

/**
 * DLsite画像URLを正規化
 * プロトコル相対URLやHTTPをHTTPSに変換
 */
function normalizeDLsiteUrl(url: string): string {
	if (typeof url !== "string" || url.trim() === "") {
		return PLACEHOLDER_IMAGE;
	}

	// プロトコル相対URL（//img.dlsite.jp/...）をHTTPS URLに変換
	if (url.startsWith("//")) {
		return `https:${url}`;
	}
	// HTTPプロトコルをHTTPSに変換
	if (url.startsWith("http://")) {
		return url.replace("http://", "https://");
	}

	return url;
}

// パフォーマンス向上: 画像コンポーネントをメモ化してプロップの変更時のみ再レンダリング
const ThumbnailImage = memo(function ThumbnailImage({
	src,
	alt,
	className,
	priority = false,
	width = 320,
	height = 240,
	sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
	fallbackSrc,
	loading = "lazy",
	quality = 85,
	optimized = true,
}: ThumbnailImageProps) {
	const [imageSrc, setImageSrc] = useState(() => {
		const safeSrc = typeof src === "string" && src.trim() !== "" ? src : PLACEHOLDER_IMAGE;
		return normalizeDLsiteUrl(safeSrc);
	});
	const [hasError, setHasError] = useState(false);
	const [hasFallbackError, setHasFallbackError] = useState(false);

	// srcプロップが変更された際に内部状態をリセット
	useEffect(() => {
		// DLsite画像のURLを正規化
		const safeSrc = typeof src === "string" && src.trim() !== "" ? src : PLACEHOLDER_IMAGE;
		const normalizedSrc = normalizeDLsiteUrl(safeSrc);
		setImageSrc(normalizedSrc);
		setHasError(false);
		setHasFallbackError(false);
	}, [src]);

	const handleError = () => {
		if (
			!hasError &&
			typeof fallbackSrc === "string" &&
			fallbackSrc.trim() !== "" &&
			!hasFallbackError
		) {
			// 最初にフォールバック画像を試行
			const normalizedFallbackSrc = normalizeDLsiteUrl(fallbackSrc);
			setImageSrc(normalizedFallbackSrc);
			setHasError(true);
		} else if (!hasFallbackError) {
			// フォールバック画像もエラーの場合、またはフォールバック画像がない場合
			setImageSrc(PLACEHOLDER_IMAGE);
			setHasFallbackError(true);
		}
	};

	// プレースホルダー画像の場合はblur効果を無効化
	const isPlaceholderImage = imageSrc === PLACEHOLDER_IMAGE;

	return (
		<div
			style={{
				// CLS削減: アスペクト比を明示的に保持
				aspectRatio: `${width} / ${height}`,
				position: "relative",
				overflow: "hidden",
			}}
			className={className}
		>
			<Image
				src={imageSrc}
				alt={alt}
				fill
				priority={priority}
				sizes={sizes}
				loading={priority ? "eager" : loading}
				quality={quality}
				onError={handleError}
				placeholder={isPlaceholderImage ? "empty" : "blur"}
				blurDataURL={isPlaceholderImage ? undefined : PLACEHOLDER_IMAGE}
				unoptimized={optimized ? undefined : true}
				style={{
					// CLS削減: object-fitでレイアウト安定化
					objectFit: "cover",
					objectPosition: "center",
				}}
			/>
		</div>
	);
});

export default ThumbnailImage;
