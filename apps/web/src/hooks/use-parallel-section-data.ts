"use client";

import type { FrontendVideoData, WorkPlainObject } from "@suzumina.click/shared-types";
import { useCallback, useEffect, useState } from "react";
import { getLatestVideos, getLatestWorks } from "@/app/actions";

interface SectionDataState {
	videos: FrontendVideoData[];
	works: WorkPlainObject[];
	allAgesWorks: WorkPlainObject[];
	loadingVideos: boolean;
	loadingWorks: boolean;
	errorVideos: string | null;
	errorWorks: string | null;
}

const initialState: SectionDataState = {
	videos: [],
	works: [],
	allAgesWorks: [],
	loadingVideos: true,
	loadingWorks: true,
	errorVideos: null,
	errorWorks: null,
};

/**
 * 動画と作品データを並列フェッチするカスタムフック
 * リソース競合を避けながら真の並列実行を実現
 */
export function useParallelSectionData() {
	const [state, setState] = useState<SectionDataState>(initialState);

	const loadVideos = useCallback(async () => {
		try {
			const data = await getLatestVideos(10);
			setState((prev) => ({
				...prev,
				videos: data,
				loadingVideos: false,
				errorVideos: null,
			}));
		} catch (error) {
			setState((prev) => ({
				...prev,
				loadingVideos: false,
				errorVideos: error instanceof Error ? error.message : "動画の読み込みに失敗しました",
			}));
		}
	}, []);

	const loadWorks = useCallback(async () => {
		try {
			const [regularWorks, ageRestrictedWorks] = await Promise.all([
				getLatestWorks(10, false), // 通常版（R18含む）
				getLatestWorks(10, true), // 全年齢版（R18除外）
			]);
			setState((prev) => ({
				...prev,
				works: regularWorks,
				allAgesWorks: ageRestrictedWorks,
				loadingWorks: false,
				errorWorks: null,
			}));
		} catch (error) {
			setState((prev) => ({
				...prev,
				loadingWorks: false,
				errorWorks: error instanceof Error ? error.message : "作品の読み込みに失敗しました",
			}));
		}
	}, []);

	useEffect(() => {
		// 真の並列実行：両方のAPIを同時に開始
		const videosPromise = loadVideos();
		const worksPromise = loadWorks();

		// エラーハンドリングのため、両方の完了を待つ（ただし、UIは個別に更新される）
		Promise.allSettled([videosPromise, worksPromise]).then(() => {
			// すべての処理が完了した後の追加処理があればここに記述
		});
	}, [loadVideos, loadWorks]);

	return state;
}
