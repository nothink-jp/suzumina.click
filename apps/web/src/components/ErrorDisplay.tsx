import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@suzumina.click/ui/components/alert";
// skipcq: JS-0257
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  title: string;
  description: string;
  details?: string[];
}

/**
 * 認証エラーのタイトル、説明、詳細を表示します。
 */
export function ErrorDisplay({
  title,
  description,
  details,
}: ErrorDisplayProps) {
  return (
    <Alert variant="destructive" className="text-left">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-bold">{title}</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {details && (
          <ul className="mt-2 list-disc list-inside space-y-1">
            {details.map((detail, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Static list
              <li key={`${detail}-${index}`}>{detail}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
