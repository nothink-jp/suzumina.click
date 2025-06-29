"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface RefreshButtonProps {
	type?: "videos" | "works";
}

export function RefreshButton({ type }: RefreshButtonProps = {}) {
	const [isLoading, setIsLoading] = useState(false);
	const pathname = usePathname();
	const router = useRouter();

	// パスからタイプを自動判定
	const refreshType = type || (pathname.includes("/videos") ? "videos" : "works");

	const handleRefresh = async () => {
		setIsLoading(true);
		try {
			const endpoint =
				refreshType === "videos" ? "/api/admin/videos/refresh" : "/api/admin/works/refresh";

			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			const result = await response.json();

			if (result.success) {
				// 成功メッセージを表示（簡単な実装）
				alert(result.message);
				// ページをリロードして最新データを表示
				router.refresh();
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (_error) {
			alert("更新に失敗しました");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isLoading}>
			<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
			{isLoading ? "更新中..." : "手動更新"}
		</Button>
	);
}
