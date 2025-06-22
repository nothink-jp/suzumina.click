import { 
  type FrontendUserData,
  getUserRoleLabel 
} from "@suzumina.click/shared-types";
import UserAvatar from "./UserAvatar";

interface UserProfileProps {
  user: FrontendUserData;
  showDetailedStats?: boolean;
}

export default function UserProfile({ user, showDetailedStats = false }: UserProfileProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        {/* アバター */}
        <UserAvatar
          discordId={user.discordId}
          avatar={user.avatar}
          displayName={user.displayName}
          size={80}
          className="w-20 h-20 flex-shrink-0"
        />
        
        {/* ユーザー情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-semibold text-gray-900 truncate">
              {user.displayName}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.role === "admin" 
                ? "bg-red-100 text-red-800"
                : user.role === "moderator"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-blue-100 text-blue-800"
            }`}>
              {getUserRoleLabel(user.role)}
            </span>
          </div>
          
          {/* Discord情報 */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">Discord:</span> @{user.username}
              {user.globalName && user.globalName !== user.username && (
                <span className="ml-1">({user.globalName})</span>
              )}
            </p>
            <p>
              <span className="font-medium">メンバー期間:</span> {user.memberSince}
            </p>
            <p>
              <span className="font-medium">最終活動:</span> {user.lastActiveText}
            </p>
          </div>
          
          {/* 統計情報 */}
          {user.showStatistics && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-indigo-600">
                  {user.audioReferencesCount}
                </div>
                <div className="text-sm text-gray-600">
                  音声ボタン作成数
                </div>
              </div>
              
              {showDetailedStats && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {user.totalPlayCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    総再生回数
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!user.showStatistics && (
            <div className="mt-4 text-sm text-gray-500 italic">
              統計情報は非公開に設定されています
            </div>
          )}
        </div>
      </div>
    </div>
  );
}