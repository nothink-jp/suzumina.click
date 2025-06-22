import { Button } from "@suzumina.click/ui/components/button";
import Link from "next/link";
import { auth } from "@/auth";
import AuthButton from "./AuthButton";
import MobileMenu from "./MobileMenu";

export default async function SiteHeader() {
  const session = await auth();
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
              {/* マイページリンク（ログイン時のみ表示） */}
              {session?.user && (
                <Button variant="outline" className="hidden md:flex" asChild>
                  <Link href="/users/me">マイページ</Link>
                </Button>
              )}
              
              {/* 認証ボタン */}
              <div className="hidden md:flex">
                <AuthButton user={session?.user} />
              </div>

              {/* モバイルメニュー */}
              <MobileMenu user={session?.user} />
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
