/**
 * サイト既定 OG 画像の再輸出（SPR-171）。
 * このセグメントの page.tsx は openGraph を上書き定義しており、Next.js の metadata 解決は
 * openGraph フィールド単位の置換のため root の file-convention 画像が落ちる。
 * 同一セグメントの file-convention は metadata より優先されるため、ここで再輸出して補う。
 */
export { alt, contentType, default, size } from "@/app/opengraph-image";
