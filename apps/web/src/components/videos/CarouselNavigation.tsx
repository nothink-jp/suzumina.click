"use client";

import { useCallback } from "react";

interface CarouselNavigationProps {
  /**
   * カルーセルのID
   */
  carouselId: string;
  /**
   * カルーセル内のアイテム数
   */
  itemCount: number;
}

/**
 * カルーセルのナビゲーションボタンを提供するクライアントコンポーネント
 */
export default function CarouselNavigation({
  carouselId,
  itemCount,
}: CarouselNavigationProps) {
  // 現在表示中のアイテムから指定した方向へスクロールする関数
  const scroll = useCallback(
    (direction: "prev" | "next") => {
      // カルーセル要素を取得
      const carousel = document.getElementById(carouselId);
      if (!carousel) return;

      // アイテム1つの要素を取得してその幅を計算する
      const firstItem = document.getElementById(`${carouselId}-item-0`);
      if (!firstItem) return;

      // サムネイル1件分の実際の幅を取得（マージンを含む）
      const itemWidth = firstItem.offsetWidth + 16; // space-x-4 は16pxのマージンを追加するため

      // カルーセル全体の幅と表示領域を取得
      const scrollableWidth = carousel.scrollWidth;
      const viewportWidth = carousel.clientWidth;

      // 現在の表示位置を取得
      const scrollLeft = carousel.scrollLeft;

      // 次または前のスクロール位置を計算
      let newScrollPosition: number;

      if (direction === "next") {
        // 次の位置を計算
        newScrollPosition = scrollLeft + itemWidth;

        // 最後までスクロールした場合、先頭に戻る
        // 現在位置+表示領域幅が全体の幅を超える場合に先頭に戻る判定を行う
        if (scrollLeft + viewportWidth >= scrollableWidth - 20) {
          // 20pxのバッファを追加
          newScrollPosition = 0;
        }
      } else {
        // 前の位置を計算
        newScrollPosition = scrollLeft - itemWidth;

        // 先頭より前にスクロールしようとした場合、最後に移動
        if (newScrollPosition < 0) {
          // 最後の位置は、全体の幅から表示領域の幅を引いた値
          newScrollPosition = Math.max(0, scrollableWidth - viewportWidth);
        }
      }

      // スムーズにスクロールする
      carousel.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    },
    [carouselId],
  );

  return (
    <>
      {/* 左スクロールボタン */}
      <div className="absolute left-0 top-0 h-full flex items-center z-10">
        <button
          type="button"
          className="btn btn-circle btn-ghost bg-base-200 bg-opacity-70 text-3xl"
          onClick={() => scroll("prev")}
          aria-label="前の動画へ"
        >
          ❮
        </button>
      </div>

      {/* 右スクロールボタン */}
      <div className="absolute right-0 top-0 h-full flex items-center z-10">
        <button
          type="button"
          className="btn btn-circle btn-ghost bg-base-200 bg-opacity-70 text-3xl"
          onClick={() => scroll("next")}
          aria-label="次の動画へ"
        >
          ❯
        </button>
      </div>
    </>
  );
}
