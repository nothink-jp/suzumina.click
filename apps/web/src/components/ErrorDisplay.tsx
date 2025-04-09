// Alert のインポートを削除
// import { Alert } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  description: string;
  details?: string[];
}

/**
 * 認証エラーの説明と詳細を表示します。
 * 標準の div タグと Tailwind CSS を使用します。
 */
export function ErrorDisplay({ description, details }: ErrorDisplayProps) {
  return (
    // Alert を div に置き換え、Tailwind でスタイルを適用 (danger color)
    <div className="rounded-md bg-red-50 p-4 text-left">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-red-800">{description}</p>
          {details && (
            <div className="mt-2 text-sm text-red-700">
              {/* ul から role="list" を削除 */}
              <ul className="list-disc space-y-1 pl-5">
                {details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
