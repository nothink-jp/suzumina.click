import { SettingsPageContent } from "./components/SettingsPageContent";

export const metadata = {
	title: "設定",
	description: "年齢制限、Cookie許諾、その他の設定を管理できます。",
	keywords: ["設定", "年齢制限", "Cookie", "プライバシー", "suzumina.click"],
	openGraph: {
		title: "設定 | すずみなくりっく！",
		description: "年齢制限、Cookie許諾、その他の設定を管理できます。",
		url: "https://suzumina.click/settings",
	},
	alternates: {
		canonical: "/settings",
	},
};

export default function SettingsPage() {
	return <SettingsPageContent />;
}
