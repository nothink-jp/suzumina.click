"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import { ChevronLeft, ChevronRight, Heart, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FavoriteData {
	id: string;
	userId: string;
	userName: string;
	audioButtonId: string;
	audioButtonTitle: string;
	addedAt: string;
}

interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	totalCount: number;
	limit: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export default function FavoritesList() {
	const [favorites, setFavorites] = useState<FavoriteData[]>([]);
	const [pagination, setPagination] = useState<PaginationInfo>({
		currentPage: 1,
		totalPages: 1,
		totalCount: 0,
		limit: 100,
		hasNext: false,
		hasPrev: false,
	});
	const [isLoading, setIsLoading] = useState(true);

	const fetchFavorites = async (page = 1) => {
		try {
			setIsLoading(true);
			const response = await fetch(`/api/admin/favorites?page=${page}&limit=100`);
			if (!response.ok) {
				throw new Error("お気に入りの取得に失敗しました");
			}
			const data = await response.json();
			setFavorites(data.favorites || []);
			setPagination(
				data.pagination || {
					currentPage: 1,
					totalPages: 1,
					totalCount: 0,
					limit: 100,
					hasNext: false,
					hasPrev: false,
				},
			);
		} catch (_error) {
			toast.error("お気に入りの読み込みに失敗しました");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchFavorites(1);
	}, []);

	const handleDeleteFavorite = async (userId: string, audioButtonId: string) => {
		if (!confirm("このお気に入りを削除しますか？")) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/favorites/${userId}/${audioButtonId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error("削除に失敗しました");
			}

			toast.success("お気に入りを削除しました");
			await fetchFavorites(pagination.currentPage);
		} catch (_error) {
			toast.error("削除に失敗しました");
		}
	};

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString("ja-JP");
		} catch {
			return dateString;
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="text-lg text-gray-600">読み込み中...</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Heart className="h-5 w-5 text-red-500" />
					<span className="text-lg font-semibold">全お気に入り ({pagination.totalCount}件)</span>
				</div>
				<Button onClick={() => fetchFavorites(pagination.currentPage)} variant="outline">
					更新
				</Button>
			</div>

			{favorites.length === 0 ? (
				<div className="text-center py-12">
					<Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
					<p className="text-gray-500">お気に入りはありません</p>
				</div>
			) : (
				<div className="border rounded-lg">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>ユーザー</TableHead>
								<TableHead>音声ボタン</TableHead>
								<TableHead>追加日</TableHead>
								<TableHead className="text-right">操作</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{favorites.map((favorite) => (
								<TableRow key={`${favorite.userId}-${favorite.audioButtonId}`}>
									<TableCell>
										<div className="flex items-center gap-2">
											<User className="h-4 w-4 text-gray-400" />
											<span className="font-medium">{favorite.userName}</span>
											<span className="text-xs text-gray-500">({favorite.userId})</span>
										</div>
									</TableCell>
									<TableCell>
										<div>
											<div className="font-medium">{favorite.audioButtonTitle}</div>
											<div className="text-xs text-gray-500">{favorite.audioButtonId}</div>
										</div>
									</TableCell>
									<TableCell>{formatDate(favorite.addedAt)}</TableCell>
									<TableCell className="text-right">
										<Button
											size="sm"
											variant="destructive"
											onClick={() => handleDeleteFavorite(favorite.userId, favorite.audioButtonId)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{/* ページネーション */}
					{pagination.totalPages > 1 && (
						<div className="flex items-center justify-between px-4 py-3 border-t">
							<div className="flex items-center gap-2">
								<p className="text-sm text-gray-600">
									ページ {pagination.currentPage} / {pagination.totalPages} （総件数:{" "}
									{pagination.totalCount}件）
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={!pagination.hasPrev}
									onClick={() => fetchFavorites(pagination.currentPage - 1)}
									className="gap-1"
								>
									<ChevronLeft className="h-4 w-4" />
									前のページ
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={!pagination.hasNext}
									onClick={() => fetchFavorites(pagination.currentPage + 1)}
									className="gap-1"
								>
									次のページ
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
