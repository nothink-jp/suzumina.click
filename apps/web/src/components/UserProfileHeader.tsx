import { Avatar } from "@/components/ui"; // Updated import path

interface UserProfileHeaderProps {
  avatarUrl: string;
  displayName: string;
  role: string;
  isCurrentUser: boolean;
}

/**
 * ユーザープロフィールのヘッダー部分を表示します。
 */
export function UserProfileHeader({
  avatarUrl,
  displayName,
  role,
  isCurrentUser,
}: UserProfileHeaderProps) {
  // Fallback logic is now handled by HeroUI Avatar via the 'name' prop

  return (
    <div className="flex items-center space-x-6">
      {/* Use HeroUI Avatar with src and name props */}
      <Avatar
        src={avatarUrl}
        name={displayName} // Used for fallback initials
        className="h-24 w-24 border-4 border-white shadow-lg"
        // You might need to adjust size prop if available or rely on className
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
        <p className="mt-1 text-sm text-gray-500">{role}</p>
        {isCurrentUser && (
          <p className="mt-1 text-sm text-gray-500">
            あなたのプロフィールページです
          </p>
        )}
      </div>
    </div>
  );
}
