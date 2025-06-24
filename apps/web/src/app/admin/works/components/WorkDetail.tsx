import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import ThumbnailImage from "@/components/ThumbnailImage";

interface WorkDetailProps {
	work: FrontendDLsiteWorkData;
}

export default function WorkDetail({ work }: WorkDetailProps) {
	// カテゴリ表示名の変換
	const getCategoryDisplayName = (category: string) => {
		const categoryMap: { [key: string]: string } = {
			SOU: "ボイス・ASMR",
			ADV: "アドベンチャー",
			RPG: "ロールプレイング",
			MOV: "動画",
			MNG: "マンガ",
			GAM: "ゲーム",
			CG: "CG・イラスト",
			TOL: "ツール・アクセサリ",
			ET3: "その他・3D",
			SLN: "シミュレーション",
			ACN: "アクション",
			PZL: "パズル",
			QIZ: "クイズ",
			TBL: "テーブル",
			DGT: "デジタルノベル",
			etc: "その他",
		};
		return categoryMap[category] || category;
	};

	// 年齢制限の表示
	const getAgeRatingInfo = (ageRating?: string) => {
		if (!ageRating) {
			return { text: "不明", className: "bg-gray-100 text-gray-800" };
		}

		const isR18 = ageRating.includes("18") || ageRating.toLowerCase().includes("r-18");
		const isR15 = ageRating.includes("15") || ageRating.toLowerCase().includes("r-15");

		if (isR18) {
			return { text: "R-18", className: "bg-red-100 text-red-800" };
		}

		if (isR15) {
			return { text: "R-15", className: "bg-orange-100 text-orange-800" };
		}

		return { text: "全年齢", className: "bg-green-100 text-green-800" };
	};

	const ageRatingInfo = getAgeRatingInfo(work.ageRating);

	return (
		<div className="max-w-6xl mx-auto">
			{/* メイン情報カード */}
			<div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
				<div className="p-8">
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* サムネイル画像 */}
						<div className="lg:col-span-1">
							<div className="sticky top-8">
								<ThumbnailImage
									src={work.thumbnailUrl}
									alt={work.title}
									className="w-full aspect-[4/3] object-cover rounded-lg shadow-md"
								/>

								{/* アクションボタン */}
								<div className="mt-6 space-y-3">
									<Button asChild size="lg" className="w-full">
										<a href={work.workUrl} target="_blank" rel="noopener noreferrer">
											DLsiteで見る
											<svg
												className="ml-2 -mr-1 w-5 h-5"
												fill="currentColor"
												viewBox="0 0 20 20"
												role="img"
												aria-label="External link"
											>
												<path
													fillRule="evenodd"
													d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
													clipRule="evenodd"
												/>
											</svg>
										</a>
									</Button>
								</div>
							</div>
						</div>

						{/* 作品情報 */}
						<div className="lg:col-span-2">
							{/* タイトルとバッジ */}
							<div className="mb-6">
								<div className="flex flex-wrap gap-2 mb-4">
									<Badge className={ageRatingInfo.className}>{ageRatingInfo.text}</Badge>
									{work.isExclusive && (
										<Badge className="bg-purple-100 text-purple-800">独占配信</Badge>
									)}
									{work.discountText && (
										<Badge className="bg-red-100 text-red-800">{work.discountText}</Badge>
									)}
								</div>

								<h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
									{work.title}
								</h1>

								<p className="text-lg text-gray-600">{work.productId}</p>
							</div>

							{/* 基本情報 */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
								<div>
									<h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
										サークル情報
									</h3>
									<p className="text-lg text-gray-900">{work.circle}</p>

									{work.author && work.author.length > 0 && (
										<div className="mt-3">
											<h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
												声優
											</h3>
											<div className="flex flex-wrap gap-2">
												{work.author.map((author, _index) => (
													<span
														key={`author-${author}`}
														className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-800"
													>
														{author}
													</span>
												))}
											</div>
										</div>
									)}
								</div>

								<div>
									<h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
										カテゴリ
									</h3>
									<p className="text-lg text-gray-900">{getCategoryDisplayName(work.category)}</p>

									<div className="mt-3">
										<h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
											価格
										</h3>
										<p className="text-2xl font-bold text-gray-900">{work.displayPrice}</p>
									</div>
								</div>
							</div>

							{/* 評価・統計情報 */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
								{work.ratingText && (
									<div className="text-center">
										<div className="text-2xl font-bold text-gray-900">{work.ratingText}</div>
										<div className="text-sm text-gray-500">評価</div>
									</div>
								)}

								{work.downloadText && (
									<div className="text-center">
										<div className="text-2xl font-bold text-gray-900">{work.downloadText}</div>
										<div className="text-sm text-gray-500">ダウンロード数</div>
									</div>
								)}

								{work.wishlistText && (
									<div className="text-center">
										<div className="text-2xl font-bold text-gray-900">{work.wishlistText}</div>
										<div className="text-sm text-gray-500">ウィッシュリスト</div>
									</div>
								)}
							</div>

							{/* 説明文 */}
							{work.description && (
								<div className="mb-8">
									<h3 className="text-lg font-medium text-gray-900 mb-4">作品説明</h3>
									<div className="prose max-w-none">
										<p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
											{work.description}
										</p>
									</div>
								</div>
							)}

							{/* タグ */}
							{work.tags && work.tags.length > 0 && (
								<div className="mb-8">
									<h3 className="text-lg font-medium text-gray-900 mb-4">タグ</h3>
									<div className="flex flex-wrap gap-2">
										{work.tags.map((tag, _index) => (
											<span
												key={`tag-${tag}`}
												className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
											>
												#{tag}
											</span>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* 詳細情報セクション */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* 技術情報 */}
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">技術情報</h2>

					<dl className="space-y-4">
						<div>
							<dt className="text-sm font-medium text-gray-500">作品ID</dt>
							<dd className="mt-1 text-sm text-gray-900 font-mono">{work.productId}</dd>
						</div>

						<div>
							<dt className="text-sm font-medium text-gray-500">Firestore ID</dt>
							<dd className="mt-1 text-sm text-gray-900 font-mono">{work.id}</dd>
						</div>

						<div>
							<dt className="text-sm font-medium text-gray-500">作品URL</dt>
							<dd className="mt-1">
								<a
									href={work.workUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 hover:text-blue-800 break-all"
								>
									{work.workUrl}
								</a>
							</dd>
						</div>

						<div>
							<dt className="text-sm font-medium text-gray-500">サムネイルURL</dt>
							<dd className="mt-1">
								<a
									href={work.thumbnailUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm text-blue-600 hover:text-blue-800 break-all"
								>
									{work.thumbnailUrl}
								</a>
							</dd>
						</div>
					</dl>
				</div>

				{/* メタデータ */}
				<div className="bg-white rounded-lg shadow-sm border p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">メタデータ</h2>

					<dl className="space-y-4">
						<div>
							<dt className="text-sm font-medium text-gray-500">作成日時</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{new Date(work.createdAtISO).toLocaleString("ja-JP")}
							</dd>
						</div>

						<div>
							<dt className="text-sm font-medium text-gray-500">更新日時</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{new Date(work.updatedAtISO).toLocaleString("ja-JP")}
							</dd>
						</div>

						<div>
							<dt className="text-sm font-medium text-gray-500">最終取得日時</dt>
							<dd className="mt-1 text-sm text-gray-900">
								{new Date(work.lastFetchedAtISO).toLocaleString("ja-JP")}
							</dd>
						</div>

						{work.salesCount && (
							<div>
								<dt className="text-sm font-medium text-gray-500">販売数</dt>
								<dd className="mt-1 text-sm text-gray-900">{work.salesCount.toLocaleString()}件</dd>
							</div>
						)}
					</dl>
				</div>
			</div>
		</div>
	);
}
