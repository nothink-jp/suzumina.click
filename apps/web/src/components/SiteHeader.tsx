"use client";

import { Button } from "@suzumina.click/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@suzumina.click/ui/components/sheet";
import { Menu } from "lucide-react";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <>
      {/* スキップリンク */}
      <a href="#main-content" className="skip-link">
        メインコンテンツにスキップ
      </a>

      <header className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-2xl font-bold text-foreground hover:text-foreground/80 transition-colors"
                aria-label="すずみなくりっく！ ホームページへ"
              >
                すずみなくりっく！
              </Link>
            </div>

            {/* デスクトップナビゲーション */}
            <nav
              className="hidden md:flex items-center space-x-2"
              aria-label="メインナビゲーション"
            >
              <Link
                href="/videos"
                className="text-foreground hover:text-foreground/80 block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent focus:bg-accent font-medium"
              >
                動画一覧
              </Link>
              <Link
                href="/buttons"
                className="text-foreground hover:text-foreground/80 block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent focus:bg-accent font-medium"
              >
                ボタン検索
              </Link>
              <Link
                href="/works"
                className="text-foreground hover:text-foreground/80 block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent focus:bg-accent font-medium"
              >
                作品一覧
              </Link>
            </nav>

            <div className="flex items-center space-x-4">
              <Button variant="outline" className="hidden md:flex" asChild>
                <Link href="/users/me">マイページ</Link>
              </Button>
              <Button className="hidden md:flex" asChild>
                <Link href="/login">ログイン</Link>
              </Button>

              {/* モバイルメニュー */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    aria-label="メニューを開く"
                  >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[300px] sm:w-[400px]"
                  aria-label="モバイルナビゲーション"
                >
                  <nav
                    className="flex flex-col space-y-4 mt-8"
                    aria-label="モバイルメニュー"
                  >
                    <Link
                      href="/videos"
                      className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
                    >
                      動画一覧
                    </Link>
                    <Link
                      href="/buttons"
                      className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
                    >
                      ボタン検索
                    </Link>
                    <Link
                      href="/works"
                      className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
                    >
                      作品一覧
                    </Link>
                    <Link
                      href="/users/me"
                      className="text-lg font-medium text-foreground hover:text-foreground/80 p-2 rounded transition-colors"
                    >
                      マイページ
                    </Link>
                    <Button className="mt-4" asChild>
                      <Link href="/login">ログイン</Link>
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
