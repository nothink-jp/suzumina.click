"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { refreshVideoData } from "@/app/actions/video-actions";
import { refreshAllWorksData } from "@/app/actions/work-actions";

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
			const result =
				refreshType === "videos" ? await refreshVideoData() : await refreshAllWorksData();

			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.message);
			}
		} catch (_error) {
			toast.error("更新に失敗しました");
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
