import { redirect } from "next/navigation";

// プロフィール設定は /settings のタブに統合されました
export default function ProfileSettingsPage() {
	redirect("/settings");
}
