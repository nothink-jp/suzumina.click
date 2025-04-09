"use client";

import type { Timestamp } from "@google-cloud/firestore";
import { Card, CardBody } from "@heroui/react";
import { UserInfoSection } from "./UserInfoSection";
import { UserProfileHeader } from "./UserProfileHeader";

interface UserData {
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UserProfileCardProps {
  userData: UserData;
  isCurrentUser: boolean;
}

/**
 * ユーザープロフィール情報を表示するカードコンポーネント (クライアントコンポーネント)。
 * Card, CardBody, UserProfileHeader, UserInfoSection を使用します。
 * @param props - コンポーネントのプロパティ。
 * @param props.userData - 表示するユーザーデータ。
 * @param props.isCurrentUser - 表示しているプロファイルが現在のユーザーのものかどうか。
 * @returns ユーザープロフィールカードの React 要素。
 */
export function UserProfileCard({
  userData,
  isCurrentUser,
}: UserProfileCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg">
      <CardBody className="p-8">
        <UserProfileHeader
          avatarUrl={userData.avatarUrl}
          displayName={userData.displayName}
          role={userData.role}
          isCurrentUser={isCurrentUser}
        />
        <UserInfoSection
          createdAt={userData.createdAt}
          updatedAt={userData.updatedAt}
        />
      </CardBody>
    </Card>
  );
}
