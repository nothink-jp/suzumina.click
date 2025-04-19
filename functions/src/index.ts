// functions/src/index.ts
/**
 * Firebase Functionsのエントリーポイントファイル
 * 
 * このファイルは各モジュールからCloud Functionsをインポートして
 * まとめてエクスポートする役割を持ちます。
 * 
 * Firebase Deploymentsはここからエクスポートされた関数を
 * Firebase Project上にデプロイします。
 */

// 各モジュールから関数をインポートして再エクスポート
export { discordAuthCallback } from "./discordAuth";
export { fetchYouTubeVideos } from "./youtube";

// 将来的に必要となる追加の関数や設定はここに追加してください
