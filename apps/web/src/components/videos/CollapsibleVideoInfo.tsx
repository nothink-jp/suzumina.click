"use client";

import type { Video } from "@/lib/videos/types";
import { formatDate } from "@/utils/date-format";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";

interface CollapsibleVideoInfoProps {
  video: Video;
}

/**
 * 折りたたみ可能な動画情報表示コンポーネント
 * 動画のタイトル、公開日、チャンネル名は常に表示し、
 * 説明文は折りたたみ可能なドロワー内に表示する
 */
export default function CollapsibleVideoInfo({
  video,
}: CollapsibleVideoInfoProps) {
  return (
    <div className="card bg-base-100 shadow-sm overflow-hidden w-full">
      {/* ヘッダー部分（常に表示） */}
      <div className="card-body pt-6 pb-2 px-6">
        <h1 className="card-title text-xl">{video.title}</h1>

        <div className="flex items-center text-sm opacity-70 mt-1">
          <span>{formatDate(video.publishedAt)}</span>
          <span className="mx-2">•</span>
          <span>{video.channelTitle}</span>
        </div>
      </div>

      {/* 説明を表示/非表示するボタン */}
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton className="w-full p-3 bg-base-200 flex justify-between items-center text-left border-t border-base-300">
              <h3 className="text-sm font-medium">動画の説明</h3>
              <span className="text-base-content opacity-70">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <title>{open ? "説明を閉じる" : "説明を開く"}</title>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </DisclosureButton>

            {/* 説明部分（展開時のみ表示） */}
            <DisclosurePanel className="p-4 bg-base-100 border-t border-base-300">
              <p className="whitespace-pre-line text-sm">{video.description}</p>
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
