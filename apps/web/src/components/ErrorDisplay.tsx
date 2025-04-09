import { Alert } from "@/components/ui"; // Updated import path
// skipcq: JS-0257
import { AlertTriangle } from "lucide-react";

interface ErrorDisplayProps {
  description: string;
  details?: string[];
}

/**
 * 認証エラーの説明と詳細を表示します。
 */
export function ErrorDisplay({ description, details }: ErrorDisplayProps) {
  return (
    <Alert status="destructive" className="text-left">
      <div className="flex">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">{description}</p>
          {details && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
              {details.map((detail) => (
                // Use the detail string itself as the key, assuming it's unique enough for this static list
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Alert>
  );
}
