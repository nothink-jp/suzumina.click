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
}

const PLACEHOLDER_IMAGE =
	"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiB2aWV3Qm94PSIwIDAgMTI4IDk2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02NCAzMkM1Ni4yNjggMzIgNTAgMzguMjY4IDUwIDQ2VjUwQzUwIDU3LjczMiA1Ni4yNjggNjQgNjQgNjRINjhDNzUuNzMyIDY0IDgyIDU3LjczMiA4MiA1MFY0NkM4MiAzOC4yNjggNzUuNzMyIDMyIDY4IDMySDY0WiIgZmlsbD0iIzkxQTNCMyIvPgo8L3N2Zz4K";

// パフォーマンス向上: 画像コンポーネントをメモ化してプロップの変更時のみ再レンダリング
const ThumbnailImage = memo(function ThumbnailImage({
	src,
	alt,
	className,
	priority = false,
	width = 320,
	height = 240,
	sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: ThumbnailImageProps) {
	const [imageSrc, setImageSrc] = useState(src);
	const [hasError, setHasError] = useState(false);

	// srcプロップが変更された際に内部状態をリセット
	useEffect(() => {
		setImageSrc(src);
		setHasError(false);
	}, [src]);

	const handleError = () => {
		if (!hasError) {
			setImageSrc(PLACEHOLDER_IMAGE);
			setHasError(true);
		}
	};

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
				onError={handleError}
				placeholder="blur"
				blurDataURL={PLACEHOLDER_IMAGE}
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
