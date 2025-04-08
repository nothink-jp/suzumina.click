interface ErrorTrackingInfoProps {
  errorType: string;
  trackingId: string | null;
}

/**
 * エラーコードとトラッキングID、サポート連絡情報を表示します。
 */
export function ErrorTrackingInfo({
  errorType,
  trackingId,
}: ErrorTrackingInfoProps) {
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1 text-left">
      <p>
        エラーコード:{" "}
        <code className="font-mono bg-gray-100 p-1 rounded">{errorType}</code>
      </p>
      {trackingId && (
        <p>
          トラッキングID:{" "}
          <code className="font-mono bg-gray-100 p-1 rounded">
            {trackingId}
          </code>
        </p>
      )}
      <p className="pt-2">
        問題が解決しない場合は、Discordサーバーのサポートチャンネルにて、上記のエラーコードとトラッキングIDを添えてお問い合わせください。
      </p>
    </div>
  );
}
