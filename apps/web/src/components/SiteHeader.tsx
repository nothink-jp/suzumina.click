"use client";

import { Button } from "@suzumina.click/ui/components/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* スキップリンク */}
      <a
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-suzuka-600 text-white px-4 py-2 z-50"
      >
        メインコンテンツにスキップ
      </a>

      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* ロゴ */}
            <div className="flex items-center">
              <Link
                href="/"
                className="text-2xl font-bold text-suzuka-600 hover:text-suzuka-500 transition-colors"
                aria-label="suzumina.click ホームページへ"
                onClick={closeMenu}
              >
                suzumina.click
              </Link>
            </div>

            {/* デスクトップナビゲーション */}
            <nav
              className="hidden md:flex items-center space-x-8"
              aria-label="メインナビゲーション"
            >
              <Link
                href="/videos"
                className="text-gray-700 hover:text-suzuka-600 font-medium transition-colors px-3 py-2 rounded-md hover:bg-suzuka-50"
              >
                動画一覧
              </Link>
              <Link
                href="/works"
                className="text-gray-700 hover:text-suzuka-600 font-medium transition-colors px-3 py-2 rounded-md hover:bg-suzuka-50"
              >
                作品一覧
              </Link>
              <Link
                href="/buttons"
                className="text-gray-700 hover:text-suzuka-600 font-medium transition-colors px-3 py-2 rounded-md hover:bg-suzuka-50"
              >
                音声ボタン
              </Link>
            </nav>

            {/* 右側のボタン */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex text-sm text-gray-500">
                マイページ・ログイン（準備中）
              </div>

              {/* モバイルメニューボタン */}
              <button
                type="button"
                onClick={toggleMenu}
                className="md:hidden p-2 rounded-md text-gray-700 hover:text-suzuka-600 hover:bg-suzuka-50 transition-colors"
                aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* モバイルメニュー */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
              <nav
                className="flex flex-col space-y-2 pt-4"
                aria-label="モバイルメニュー"
              >
                <Link
                  href="/videos"
                  className="text-gray-700 hover:text-suzuka-600 font-medium px-3 py-2 rounded-md hover:bg-suzuka-50 transition-colors"
                  onClick={closeMenu}
                >
                  動画一覧
                </Link>
                <Link
                  href="/works"
                  className="text-gray-700 hover:text-suzuka-600 font-medium px-3 py-2 rounded-md hover:bg-suzuka-50 transition-colors"
                  onClick={closeMenu}
                >
                  作品一覧
                </Link>
                <Link
                  href="/buttons"
                  className="text-gray-700 hover:text-suzuka-600 font-medium px-3 py-2 rounded-md hover:bg-suzuka-50 transition-colors"
                  onClick={closeMenu}
                >
                  音声ボタン
                </Link>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-sm text-gray-500 px-3 py-2">
                    マイページ・ログイン（準備中）
                  </div>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
