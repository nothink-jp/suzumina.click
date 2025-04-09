import { Button } from "@/components/ui"; // Updated import path
import Link from "next/link";

interface ErrorActionsProps {
  signInHref?: string;
  homeHref?: string;
}

/**
 * 認証エラーページのアクションボタン（再試行、トップへ戻る）を表示します。
 */
export function ErrorActions({
  signInHref = "/auth/signin",
  homeHref = "/",
}: ErrorActionsProps) {
  return (
    <div className="mt-8 space-y-4">
      {/* Use as={Link} and href for HeroUI Button */}
      <Button as={Link} href={signInHref} className="w-full">
        ログインを再試行
      </Button>
      {/* Use variant="bordered" for outline style */}
      <Button as={Link} href={homeHref} variant="bordered" className="w-full">
        トップページへ戻る
      </Button>
    </div>
  );
}
