/**
 * ユーザー関連の型定義
 * 
 * ユーザーのプロフィール情報や設定に関する型を定義します。
 */

/**
 * Firestore保存用のユーザープロフィール情報
 */
export interface UserProfileData {
  /** ユーザーID（Firebase Auth UIDと同一） */
  uid: string;
  
  /** サイト内表示名（Discordの表示名とは異なる場合がある） */
  siteDisplayName?: string;
  
  /** 自己紹介文 */
  bio?: string;
  
  /** プロフィール最終更新日時 */
  updatedAt: Date;
  
  /** プロフィール作成日時 */
  createdAt: Date;
  
  /** プロフィールページの公開設定 */
  isPublic: boolean;
}

/**
 * Firestoreから取得したUserProfileDataに、Auth情報を組み合わせた型
 */
export interface UserProfile extends UserProfileData {
  /** Discord由来の表示名（Firebase Auth由来） */
  displayName: string | null;
  
  /** Discord由来のプロフィール画像URL（Firebase Auth由来） */
  photoURL: string | null;
  
  /** 優先表示名（siteDisplayNameがあれば優先、なければdisplayNameを使用） */
  preferredName: string;
}

/**
 * ユーザープロフィール編集フォーム用の型
 */
export interface UserProfileFormData {
  siteDisplayName: string;
  bio: string;
  isPublic: boolean;
}