import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@suzumina.click/ui/components/avatar";

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
  const fallbackInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center space-x-6">
      <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>{fallbackInitials}</AvatarFallback>
      </Avatar>
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
