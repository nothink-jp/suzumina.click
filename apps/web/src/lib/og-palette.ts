/**
 * OG 画像（ImageResponse / satori）向けの桜霞パレット定数。
 * 正本は packages/ui/src/styles/globals.css の :root。ImageResponse は CSS 変数を解決できないため
 * ライトモード値をここに一箇所だけ転記し、app/opengraph-image.tsx・buttons/[id]・works/[workId]・
 * videos/[videoId]・lib/og-text-card.tsx から共通利用する（SPR-268 全ルート完了時点でのレビュー指摘対応）。
 * globals.css の値を変更したら、ここだけ追従すればよい。
 */

export const OG_BACKGROUND = "hsl(340, 40%, 99%)"; // --background（パール白）

export const OG_SUZUKA_50 = "hsl(342, 70%, 97%)";
export const OG_SUZUKA_100 = "hsl(341, 62%, 94%)";
export const OG_SUZUKA_200 = "hsl(340, 54%, 88%)";
export const OG_SUZUKA_300 = "hsl(339, 50%, 79%)";
export const OG_SUZUKA_500 = "hsl(340, 58%, 46%)";
export const OG_SUZUKA_700 = "hsl(339, 55%, 33%)";

export const OG_MINASE_50 = "hsl(36, 50%, 97%)";
export const OG_MINASE_100 = "hsl(34, 44%, 93%)";
export const OG_MINASE_200 = "hsl(33, 40%, 86%)";
export const OG_MINASE_300 = "hsl(32, 38%, 79%)";
export const OG_MINASE_400 = "hsl(31, 38%, 73%)";
export const OG_MINASE_500 = "hsl(30, 38%, 66%)";
export const OG_MINASE_600 = "hsl(29, 36%, 56%)";
export const OG_MINASE_800 = "hsl(27, 32%, 37%)";
export const OG_MINASE_950 = "hsl(25, 28%, 18%)";

export const OG_MUTED_FOREGROUND = "hsl(324, 8%, 40%)";
