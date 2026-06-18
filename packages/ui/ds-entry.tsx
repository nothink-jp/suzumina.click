// design-sync bundle entry（claude.ai/design 連携・能動ファイルではない）
// このパッケージは dist を持たず TSX ソースを直接配布するため、全コンポーネントを
// 1 つの barrel に集約して esbuild が window.<globalName> へ載せられるようにする。
// 公開 exports マップ（consumer 向け）には影響しない。/design-sync の --entry 専用。

// Custom components (curated barrel — values + utils)
export * from "./src/components/custom/index";
// UI components (shadcn/ui ベース)
export * from "./src/components/ui/alert";
export * from "./src/components/ui/alert-dialog";
export * from "./src/components/ui/badge";
export * from "./src/components/ui/button";
export * from "./src/components/ui/card";
export * from "./src/components/ui/carousel";
export * from "./src/components/ui/checkbox";
export * from "./src/components/ui/collapsible";
export * from "./src/components/ui/dialog";
export * from "./src/components/ui/dropdown-menu";
export * from "./src/components/ui/input";
export * from "./src/components/ui/label";
export * from "./src/components/ui/navigation-menu";
export * from "./src/components/ui/pagination";
export * from "./src/components/ui/popover";
export * from "./src/components/ui/progress";
export * from "./src/components/ui/radio-group";
export * from "./src/components/ui/select";
export * from "./src/components/ui/separator";
export * from "./src/components/ui/sheet";
export * from "./src/components/ui/skeleton";
export * from "./src/components/ui/slider";
export * from "./src/components/ui/sonner";
export * from "./src/components/ui/switch";
export * from "./src/components/ui/table";
export * from "./src/components/ui/tabs";
export * from "./src/components/ui/textarea";
export * from "./src/components/ui/toggle";
export * from "./src/components/ui/toggle-group";
