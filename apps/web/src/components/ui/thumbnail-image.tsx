"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { isOptimizableImageSrc, normalizeImageUrl } from "@/lib/image-src";

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

// さくらモチーフのプレースホルダー（Claude Design 案の桜マークと同じパスデータ。#787参照）。
// blur-up 中の一瞬と「画像なし」時の両方で使われるため、ブランドと無関係な汎用アイコンより
// 統一感が出る。data URI のため Tailwind トークンは使えず、raw hex を直書きしている
// （suzuka-50 背景 + suzuka-200 の桜。dark: 非対応はヒーロー/フッターと同じ理由）。
const PLACEHOLDER_IMAGE =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiB2aWV3Qm94PSIwIDAgMTI4IDk2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRkRGMkY1Ii8+CjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDY0IDUwKSBzY2FsZSgwLjEzKSIgZmlsbD0iI0YxRDBEQiI+CjxwYXRoIGQ9Ik0wIC0yOEMtNzQgLTU0IC04OCAtMTQ4IC01MCAtMTk4TDAgLTE3Mkw1MCAtMTk4Qzg4IC0xNDggNzQgLTU0IDAgLTI4WiIvPgo8cGF0aCB0cmFuc2Zvcm09InJvdGF0ZSg3MikiIGQ9Ik0wIC0yOEMtNzQgLTU0IC04OCAtMTQ4IC01MCAtMTk4TDAgLTE3Mkw1MCAtMTk4Qzg4IC0xNDggNzQgLTU0IDAgLTI4WiIvPgo8cGF0aCB0cmFuc2Zvcm09InJvdGF0ZSgxNDQpIiBkPSJNMCAtMjhDLTc0IC01NCAtODggLTE0OCAtNTAgLTE5OEwwIC0xNzJMNTAgLTE5OEM4OCAtMTQ4IDc0IC01NCAwIC0yOFoiLz4KPHBhdGggdHJhbnNmb3JtPSJyb3RhdGUoMjE2KSIgZD0iTTAgLTI4Qy03NCAtNTQgLTg4IC0xNDggLTUwIC0xOThMMCAtMTcyTDUwIC0xOThDODggLTE0OCA3NCAtNTQgMCAtMjhaIi8+CjxwYXRoIHRyYW5zZm9ybT0icm90YXRlKDI4OCkiIGQ9Ik0wIC0yOEMtNzQgLTU0IC04OCAtMTQ4IC01MCAtMTk4TDAgLTE3Mkw1MCAtMTk4Qzg4IC0xNDggNzQgLTU0IDAgLTI4WiIvPgo8L2c+Cjwvc3ZnPgo=";

interface ImageState {
	/** 実際に next/image へ渡す src */
	src: string;
	/** 一次 src を使い切ったか（= fallbackSrc へ進んだ／進めなかった） */
	hasError: boolean;
	/** フォールバックまで使い切ったか（= プレースホルダーで確定） */
	hasFallbackError: boolean;
}

/**
 * src / fallbackSrc を正規化し、next/image に渡せる最初の URL を選ぶ。
 *
 * 許可ホスト外の URL（DLsite の「画像なし」プレースホルダ等）は描画前に捨てる。
 * next/image のホスト検証は開発時のみ throw するため、渡してしまうとローカルだけ
 * ページ全体が落ちる（本番は 400 → onError）。判定の詳細は lib/image-src を参照。
 */
function resolveImageState(src: string, fallbackSrc?: string): ImageState {
	const normalizedSrc = normalizeImageUrl(src);
	if (isOptimizableImageSrc(normalizedSrc)) {
		return { src: normalizedSrc, hasError: false, hasFallbackError: false };
	}

	const normalizedFallback = normalizeImageUrl(fallbackSrc ?? "");
	if (isOptimizableImageSrc(normalizedFallback)) {
		return { src: normalizedFallback, hasError: true, hasFallbackError: false };
	}

	return { src: PLACEHOLDER_IMAGE, hasError: true, hasFallbackError: true };
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
	const [imageState, setImageState] = useState<ImageState>(() =>
		resolveImageState(src, fallbackSrc),
	);
	const [isLoaded, setIsLoaded] = useState(false);

	// src / fallbackSrc プロップが変更された際に内部状態をリセット
	useEffect(() => {
		setImageState(resolveImageState(src, fallbackSrc));
		setIsLoaded(false);
	}, [src, fallbackSrc]);

	const handleError = () => {
		setImageState((prev) => {
			if (prev.hasFallbackError) {
				return prev;
			}
			if (!prev.hasError) {
				// 最初にフォールバック画像を試行（許可ホスト外なら飛ばす）
				const normalizedFallback = normalizeImageUrl(fallbackSrc ?? "");
				if (isOptimizableImageSrc(normalizedFallback)) {
					return { src: normalizedFallback, hasError: true, hasFallbackError: false };
				}
			}
			// フォールバック画像もエラーの場合、またはフォールバック画像がない場合
			return { src: PLACEHOLDER_IMAGE, hasError: true, hasFallbackError: true };
		});
		setIsLoaded(false);
	};

	const imageSrc = imageState.src;
	// プレースホルダー画像自体を表示している場合は、その下に同じ画像のぼかし背景を重ねない
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
			{/*
			 * next/image 標準の placeholder="blur" は feGaussianBlur の stdDeviation が
			 * 20 に固定されており props で調整できず、かつ fill + 動的 src では viewBox を
			 * 正しく計算できないため想定より強くぼける（Next.js 内部実装依存）。
			 * 自前の背景レイヤーで blur-sm（4px）に固定し、強さを直接制御する。
			 * 実画像の読み込み完了（onLoad）で外し、blur フィルタの合成コストを
			 * 常駐させない（一覧ページで多数並ぶ際のパフォーマンス対策）。
			 */}
			{!isPlaceholderImage && !isLoaded && (
				<div
					aria-hidden="true"
					className="absolute inset-0 scale-110 bg-cover bg-center blur-sm"
					style={{ backgroundImage: `url(${PLACEHOLDER_IMAGE})` }}
				/>
			)}
			<Image
				src={imageSrc}
				alt={alt}
				fill
				priority={priority}
				// Next.js 16 では `priority` は preload + eager の発行までで、
				// `fetchpriority="high"` 属性は自動付与しない。LCP 画像として
				// 明示的にブラウザへ優先度を伝えるため `fetchPriority` を渡す。
				fetchPriority={priority ? "high" : undefined}
				sizes={sizes}
				loading={priority ? "eager" : loading}
				quality={quality}
				onLoad={() => setIsLoaded(true)}
				onError={handleError}
				placeholder="empty"
				unoptimized={optimized ? undefined : true}
				style={{
					// CLS削減: object-fitでレイアウト安定化
					objectFit: "cover",
					objectPosition: "center",
				}}
			/>
			{isPlaceholderImage && (
				<div
					className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center"
					aria-hidden="true"
				>
					<span className="rounded bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground">
						画像なし
					</span>
				</div>
			)}
		</div>
	);
});

export default ThumbnailImage;
