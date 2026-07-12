import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

export default async function MyProfilePage() {
	const user = await getCurrentUser();

	if (!user) {
		// 未認証の場合はサインインページへ（signin 後に /users/me へ戻れば自分のプロフィールへ再リダイレクトされる）
		redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/users/me")}`);
	}

	// 認証済みの場合は自分のプロフィールページへリダイレクト
	redirect(`/users/${user.discordId}`);
}
