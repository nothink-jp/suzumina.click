import { Button } from "@suzumina.click/ui/components/button";
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
      <Button asChild className="w-full">
        <Link href={signInHref}>ログインを再試行</Link>
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href={homeHref}>トップページへ戻る</Link>
      </Button>
    </div>
  );
}
