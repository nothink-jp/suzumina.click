"use client";

import type { SampleImage } from "@suzumina.click/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Image as ImageIcon, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface SampleImageGalleryProps {
	sampleImages: SampleImage[];
	workTitle: string;
}

// DLsite画像URLを正規化
function normalizeDLsiteUrl(url: string): string {
	if (typeof url !== "string" || url.trim() === "") {
		return "";
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

// サムネイル専用の画像コンポーネント
function SampleThumbnail({
	src,
	alt,
	className,
}: {
	src: string;
	alt: string;
	className?: string;
}) {
	const [hasError, setHasError] = useState(false);
	const normalizedSrc = normalizeDLsiteUrl(src);

	if (hasError) {
		return (
			<div
				className={`${className} bg-gray-100 flex items-center justify-center`}
				style={{ aspectRatio: "1/1" }}
			>
				<span className="text-gray-400 text-xs">読み込み失敗</span>
			</div>
		);
	}

	return (
		<Image
			src={normalizedSrc}
			alt={alt}
			width={300}
			height={300}
			className={className}
			loading="lazy"
			style={{
				objectFit: "cover",
				objectPosition: "center",
			}}
			onError={() => setHasError(true)}
		/>
	);
}

// 拡大表示用の画像コンポーネント
function ExpandedImage({
	src,
	alt,
	width,
	height,
}: {
	src: string;
	alt: string;
	width: number;
	height: number;
}) {
	const [hasError, setHasError] = useState(false);
	const normalizedSrc = normalizeDLsiteUrl(src);

	if (hasError) {
		return (
			<div
				className="bg-gray-100 flex items-center justify-center"
				style={{ width: "400px", height: "300px" }}
			>
				<span className="text-gray-400">画像を読み込めませんでした</span>
			</div>
		);
	}

	// 表示サイズの計算（最大95vw x 95vh - 40px）
	const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.95 : 1200;
	const maxHeight = typeof window !== "undefined" ? window.innerHeight * 0.95 - 40 : 800;

	let displayWidth = width;
	let displayHeight = height;

	if (width > maxWidth) {
		const ratio = maxWidth / width;
		displayWidth = maxWidth;
		displayHeight = height * ratio;
	}

	if (displayHeight > maxHeight) {
		const ratio = maxHeight / displayHeight;
		displayHeight = maxHeight;
		displayWidth = displayWidth * ratio;
	}

	return (
		<Image
			src={normalizedSrc}
			alt={alt}
			width={displayWidth}
			height={displayHeight}
			className="block"
			style={{
				maxWidth: "95vw",
				maxHeight: "calc(95vh - 40px)",
				objectFit: "contain",
			}}
			onError={() => setHasError(true)}
		/>
	);
}

export default function SampleImageGallery({ sampleImages, workTitle }: SampleImageGalleryProps) {
	const [_selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

	if (!sampleImages || sampleImages.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ImageIcon className="h-5 w-5" />
						サンプル画像
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8 text-gray-500">
						<ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
						<p>サンプル画像はありません</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ImageIcon className="h-5 w-5" />
					サンプル画像 ({sampleImages.length}枚)
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{sampleImages.map((image, index) => (
						<Dialog key={`sample-${index}-${image.thumb.slice(-10)}`}>
							<DialogTrigger asChild>
								<button
									type="button"
									className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500"
									onClick={() => setSelectedImageIndex(index)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setSelectedImageIndex(index);
										}
									}}
									aria-label={`${workTitle} サンプル画像 ${index + 1}を拡大表示`}
								>
									<SampleThumbnail
										src={image.thumb}
										alt={`${workTitle} サンプル画像 ${index + 1}`}
										className="w-full h-full"
									/>
									{image.width && image.height && (
										<div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded pointer-events-none">
											{image.width}×{image.height}
										</div>
									)}
								</button>
							</DialogTrigger>
							<DialogContent
								className="max-w-none w-auto h-auto p-0 bg-transparent border-none shadow-none"
								style={{
									maxWidth: "95vw",
									maxHeight: "95vh",
								}}
							>
								<DialogTitle className="sr-only">
									{workTitle} サンプル画像 {index + 1}
								</DialogTitle>
								<DialogDescription className="sr-only">
									{workTitle}の{index + 1}番目のサンプル画像を拡大表示しています
								</DialogDescription>
								<div className="flex flex-col">
									<ExpandedImage
										src={image.thumb}
										alt={`${workTitle} サンプル画像 ${index + 1}`}
										width={image.width || 800}
										height={image.height || 600}
									/>
									<div className="bg-black bg-opacity-60 text-white text-sm p-2 text-center">
										{index + 1} / {sampleImages.length}
										{image.width && image.height && (
											<span className="ml-2">
												({image.width}×{image.height})
											</span>
										)}
									</div>
								</div>
							</DialogContent>
						</Dialog>
					))}
				</div>

				{/* ギャラリービューの説明 */}
				<div className="mt-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
					<p className="flex items-center gap-2">
						<ZoomIn className="h-4 w-4" />
						画像をクリックすると拡大表示されます
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
