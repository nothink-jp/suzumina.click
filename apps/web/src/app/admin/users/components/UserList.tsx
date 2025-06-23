"use client";

import type {
  FrontendUserData,
  UserListResult,
} from "@suzumina.click/shared-types";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toggleUserActive, updateUserRole } from "../actions";

interface UserListProps {
  data: UserListResult;
  currentPage: number;
}

interface UserItemProps {
  user: FrontendUserData;
  onUserUpdate: (updatedUser: FrontendUserData) => void;
}

function UserItem({ user, onUserUpdate }: UserItemProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<
    "member" | "moderator" | "admin"
  >(user.role);
  const [imageError, setImageError] = useState(false);

  const handleRoleChange = () => {
    if (selectedRole === user.role) return;

    startTransition(async () => {
      const result = await updateUserRole(user.discordId, selectedRole);
      if (result.success && result.data) {
        onUserUpdate(result.data);
      } else {
        alert(result.error || "ロール更新に失敗しました");
        setSelectedRole(user.role); // Reset selection
      }
    });
  };

  const handleToggleActive = () => {
    startTransition(async () => {
      const result = await toggleUserActive(user.discordId);
      if (result.success && result.data) {
        onUserUpdate(result.data);
      } else {
        alert(result.error || "状態変更に失敗しました");
      }
    });
  };

  return (
    <tr className={`hover:bg-gray-50 ${!user.isActive ? "bg-red-50" : ""}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {user.avatarUrl && !imageError ? (
            <Image
              className="h-10 w-10 rounded-full mr-4"
              src={user.avatarUrl}
              alt={`${user.displayName}のアバター`}
              width={40}
              height={40}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="h-10 w-10 rounded-full mr-4 bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 text-sm font-medium">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {user.displayName}
            </div>
            <div className="text-sm text-gray-500">
              @{user.username}
              {user.globalName && user.globalName !== user.username && (
                <span className="ml-2">({user.globalName})</span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={selectedRole}
          onChange={(e) =>
            setSelectedRole(e.target.value as "member" | "moderator" | "admin")
          }
          onBlur={handleRoleChange}
          disabled={isPending}
          className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="member">メンバー</option>
          <option value="moderator">モデレーター</option>
          <option value="admin">管理者</option>
        </select>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              !user.isActive
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {!user.isActive ? "無効" : "有効"}
          </span>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              !user.isPublicProfile
                ? "bg-gray-100 text-gray-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {!user.isPublicProfile ? "プライベート" : "公開"}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.showStatistics && (
          <div>
            <div>{user.audioReferencesCount} 音声ボタン</div>
            <div>{user.totalPlayCount} 再生</div>
          </div>
        )}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div>{user.memberSince}</div>
        <div>最終: {user.lastActiveText}</div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isPending}
          className={`px-3 py-1 rounded text-xs font-medium ${
            !user.isActive
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-red-100 text-red-700 hover:bg-red-200"
          } disabled:opacity-50`}
        >
          {!user.isActive ? "有効化" : "無効化"}
        </button>
      </td>
    </tr>
  );
}

export default function UserList({ data, currentPage }: UserListProps) {
  const [users, setUsers] = useState(data.users);

  const handleUserUpdate = (updatedUser: FrontendUserData) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.discordId === updatedUser.discordId ? updatedUser : user,
      ),
    );
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">ユーザーが見つかりませんでした。</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ロール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                統計
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録情報
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <UserItem
                key={user.discordId}
                user={user}
                onUserUpdate={handleUserUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>

      {data.hasMore && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <a
              href={`/admin/users?page=${Math.max(1, currentPage - 1)}`}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              前へ
            </a>
            <a
              href={`/admin/users?page=${currentPage + 1}`}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              次へ
            </a>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                ページ <span className="font-medium">{currentPage}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                {currentPage > 1 && (
                  <a
                    href={`/admin/users?page=${currentPage - 1}`}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    前へ
                  </a>
                )}
                <a
                  href={`/admin/users?page=${currentPage + 1}`}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  次へ
                </a>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
