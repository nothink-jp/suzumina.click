import { Alert } from "@suzumina.click/ui";
// skipcq: JS-0257
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  // title prop removed
  description: string;
  details?: string[];
}

/**
 * 認証エラーの説明と詳細を表示します。
 */
export function ErrorDisplay({
  // title argument removed
  description,
  details,
}: ErrorDisplayProps) {
  return (
    <Alert status="destructive" className="text-left">
      <div className="flex">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">{description}</p>
          {details && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              {details.map((detail, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Static list
                <li key={`${detail}-${index}`}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Alert>
  );
}
