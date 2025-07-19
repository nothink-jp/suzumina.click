"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";

export interface R18FilterState {
	showR18: boolean;
	isAdult: boolean;
	isLoading: boolean;
}

export interface R18FilterActions {
	setShowR18: (value: boolean) => void;
	handleR18Toggle: (checked: boolean) => void;
	resetR18Filter: () => void;
}

export function useR18Filter(): R18FilterState & R18FilterActions {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { isAdult, isLoading: ageVerificationLoading } = useAgeVerification();

	// R18フィルターの状態（成人向けサイトのため、デフォルトでR18表示）
	const [showR18, setShowR18] = useState(() => {
		const excludeR18Param = searchParams.get("excludeR18");
		// URLパラメータがある場合はそれに従う
		if (excludeR18Param !== null) {
			return excludeR18Param === "false";
		}
		// URLパラメータがない場合は成人向けサイトとしてR18を表示（excludeR18=false）
		return true;
	});

	// URLパラメータが変更された時にSwitchの状態を同期
	useEffect(() => {
		// 年齢確認ローディング中は何もしない
		if (ageVerificationLoading) {
			return;
		}

		const excludeR18Param = searchParams.get("excludeR18");
		// URLパラメータがない場合は成人向けサイトとしてR18表示（excludeR18=false）
		const newShowR18 = excludeR18Param !== null ? excludeR18Param === "false" : true;

		// 状態が変更される場合のみ更新
		if (newShowR18 !== showR18) {
			setShowR18(newShowR18);
		}
	}, [searchParams, ageVerificationLoading, showR18]);

	const handleR18Toggle = (checked: boolean) => {
		// まず状態を更新
		setShowR18(checked);

		// URLパラメータを更新（デフォルトはR18表示、除外は明示的に設定）
		const params = new URLSearchParams(searchParams.toString());

		if (isAdult) {
			// 成人ユーザー：デフォルトはR18表示、除外がオプション
			if (checked) {
				// R18表示時はパラメータを削除（デフォルト=excludeR18=false）
				params.delete("excludeR18");
			} else {
				// R18除外時はパラメータ設定（除外=excludeR18=true）
				params.set("excludeR18", "true");
			}
		} else {
			// 未成年ユーザー：常にR18除外
			params.set("excludeR18", "true");
		}

		params.delete("page"); // ページ番号をリセット

		// 即座にナビゲート
		startTransition(() => {
			router.push(`/works?${params.toString()}`);
		});
	};

	const resetR18Filter = () => {
		setShowR18(true); // デフォルトはR18表示（成人向けサイト）
	};

	return {
		// State
		showR18,
		isAdult,
		isLoading: ageVerificationLoading,
		// Actions
		setShowR18,
		handleR18Toggle,
		resetR18Filter,
	};
}
