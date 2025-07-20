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
import { Image, ZoomIn } from "lucide-react";
import { useState } from "react";

interface SampleImageGalleryProps {
	sampleImages: SampleImage[];
	workTitle: string;
}

// DLsite画像URLをプロキシ経由のURLに変換
function getDLsiteProxyUrl(url: string): string {
	if (typeof url === "string" && url.trim() !== "" && url.includes("img.dlsite.jp")) {
		return `/api/image-proxy?url=${encodeURIComponent(url)}`;
	}
	return url;
}

// サムネイル専用の画像コンポーネント（fillモードを使わない）
function SampleThumbnail({
	src,
	alt,
	className,
}: {
	src: string;
	alt: string;
	className?: string;
}) {
	return (
		<img
			src={getDLsiteProxyUrl(src)}
			alt={alt}
			className={className}
			loading="lazy"
			style={{
				objectFit: "cover",
				objectPosition: "center",
			}}
			onError={(e) => {
				const target = e.target as HTMLImageElement;
				target.style.backgroundColor = "#f3f4f6";
				target.style.display = "flex";
				target.style.alignItems = "center";
				target.style.justifyContent = "center";
				target.style.color = "#9ca3af";
				target.style.fontSize = "12px";
				target.alt = "読み込み失敗";
			}}
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
						<Image className="h-5 w-5" />
						サンプル画像
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8 text-gray-500">
						<Image className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
					<Image className="h-5 w-5" />
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
									<img
										src={getDLsiteProxyUrl(image.thumb)}
										alt={`${workTitle} サンプル画像 ${index + 1}`}
										className="block"
										style={{
											width: image.width ? `${image.width}px` : "auto",
											height: image.height ? `${image.height}px` : "auto",
											maxWidth: "95vw",
											maxHeight: "calc(95vh - 40px)", // 情報バーの高さを考慮
											objectFit: "contain",
										}}
										onError={(e) => {
											const target = e.target as HTMLImageElement;
											target.style.backgroundColor = "#f3f4f6";
											target.style.width = "400px";
											target.style.height = "300px";
											target.alt = "画像を読み込めませんでした";
										}}
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
