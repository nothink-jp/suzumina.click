/**
 * Firestore セキュリティルール定義
 * 
 * このファイルはFirestoreのセキュリティルールをTerraformで管理します。
 * 適切なアクセス制御を行い、データの整合性と安全性を確保します。
 */

resource "google_firestore_document" "firestore_rules" {
  project     = var.gcp_project_id
  collection  = "_firestore_rules"
  document_id = "firestore_rules"
  # fields は Firestore REST API の Value 表現（camelCase）で記述する。
  # snake_case（string_value）にすると live(stringValue) と恒久 diff になる（ADR-009 / SPR-98）。
  fields = jsonencode({
    rules = {
      stringValue = <<-EOT
        rules_version = '2';
        service cloud.firestore {
          // 基本設定 - デフォルトはすべての読み書きを拒否
          match /databases/{database}/documents {
            // ユーザー認証関数
            function isAuthenticated() {
              return request.auth != null;
            }
            
            // 動画コレクション
            match /videos/{videoId} {
              // 誰でも読み取り可能、書き込みは Cloud Functions（Admin SDK）のみ
              allow read;
              allow write: if false; // Admin SDK のみ書き込み可能
            }
            
            // DLsite作品コレクション
            match /works/{workId} {
              // 誰でも読み取り可能、書き込みは Cloud Functions（Admin SDK）のみ
              allow read;
              allow write: if false; // Admin SDK のみ書き込み可能
            }
            
            // 音声ボタンコレクション（統一システム）
            match /audioButtons/{buttonId} {
              // 公開音声ボタンは誰でも読み取り可能、非公開は作成者のみ読み取り可能
              allow read: if resource.data.isPublic == true || 
                           (isAuthenticated() && resource.data.createdBy == request.auth.uid);
              
              // 作成・更新・削除はServer Actionsのみで操作
              allow create, update, delete: if false; // Server Actionsのみで操作
            }
            
            // ユーザーコレクション（Discord ID ベース）
            match /users/{discordId} {
              // 公開プロフィールは誰でも読み取り可能、プライベートは所有者のみ
              allow read: if resource.data.isPublicProfile == true || 
                           (isAuthenticated() && request.auth.token.discord_id == discordId);
              
              // 作成・更新はServer Actionsのみ
              allow create, update: if false; // Server Actionsのみで操作
              
              // 削除は不可（Server Actions のみで操作）
              allow delete: if false;
            }
          }
        }
      EOT
    }
  })
}