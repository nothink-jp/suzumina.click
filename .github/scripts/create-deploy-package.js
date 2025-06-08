#!/usr/bin/env node

/**
 * monorepo対応 Cloud Functions デプロイパッケージ作成スクリプト
 *
 * このスクリプトは以下の処理を行います：
 * 1. pnpm deployを使用したプロダクション用パッケージの作成
 * 2. workspace依存関係の自動解決
 * 3. Cloud Functions Gen2向けの最適化
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// 設定
const CONFIG = {
  functionsDir: "./apps/functions",
  deployDir: "./tmp/functions",
  workspaceRoot: ".",
  sharedTypesPackage: "@suzumina.click/shared-types",
};

/**
 * ディレクトリが存在することを確認し、なければ作成
 */
function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 ディレクトリを作成しました: ${dir}`);
  }
}

/**
 * ファイルをコピー（ディレクトリの場合は再帰的にコピー）
 */
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    ensureDirectory(dest);
    const items = fs.readdirSync(src);

    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      copyRecursive(srcPath, destPath);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * workspace内のパッケージの実際のバージョンを取得
 */
function getWorkspacePackageVersion(packageName) {
  try {
    const packagePath =
      packageName === "@suzumina.click/shared-types"
        ? "./packages/shared-types/package.json"
        : null;

    if (!packagePath || !fs.existsSync(packagePath)) {
      return null;
    }

    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    return packageJson.version;
  } catch (error) {
    console.warn(`⚠️  パッケージバージョンの取得に失敗: ${packageName}`);
    return null;
  }
}

/**
 * workspace依存関係を実際のバージョンに変換
 */
function resolveWorkspaceDependencies(dependencies) {
  const resolved = { ...dependencies };

  for (const [name, version] of Object.entries(dependencies)) {
    if (version.startsWith("workspace:") || version.startsWith("file:")) {
      const actualVersion = getWorkspacePackageVersion(name);
      if (actualVersion) {
        resolved[name] = actualVersion;
        console.log(
          `🔗 依存関係を解決: ${name}@${actualVersion} (${version} → ${actualVersion})`,
        );
      } else {
        console.warn(`⚠️  依存関係の解決に失敗: ${name} (${version})`);
      }
    }
  }

  return resolved;
}

/**
 * Cloud Functions向けのpackage.jsonを生成
 */
function generateDeployPackageJson() {
  console.log("📦 デプロイ用package.jsonを生成中...");

  const srcPackageJson = JSON.parse(
    fs.readFileSync(path.join(CONFIG.functionsDir, "package.json"), "utf8"),
  );

  // workspace依存関係を解決
  const resolvedDependencies = resolveWorkspaceDependencies(
    srcPackageJson.dependencies || {},
  );

  // shared-typesの特別処理: workspace依存関係またはfile:参照を実際のバージョンに変換
  if (resolvedDependencies[CONFIG.sharedTypesPackage]) {
    const sharedTypesVersion = getWorkspacePackageVersion(
      CONFIG.sharedTypesPackage,
    );
    if (sharedTypesVersion) {
      resolvedDependencies[CONFIG.sharedTypesPackage] = sharedTypesVersion;
      console.log(
        `🔗 shared-types依存関係を解決: ${CONFIG.sharedTypesPackage}@${sharedTypesVersion}`,
      );
    }
  }

  // Cloud Functions向けの最適化されたpackage.json
  const deployPackageJson = {
    name: srcPackageJson.name,
    version: srcPackageJson.version,
    description:
      srcPackageJson.description || "Cloud Functions for suzumina.click",
    private: true,
    main: "lib/index.js",
    engines: {
      node: "20",
    },
    dependencies: resolvedDependencies,
  };

  const packageJsonPath = path.join(CONFIG.deployDir, "package.json");
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(deployPackageJson, null, 2),
    "utf8",
  );

  console.log("✅ package.json生成完了");
  return deployPackageJson;
}

/**
 * .gcloudignoreファイルを生成
 */
function generateGcloudIgnore() {
  console.log("📝 .gcloudignoreを生成中...");

  const gcloudignore = `# TypeScript関連ファイルの除外
tsconfig.json
*.ts
src/

# テストファイルの除外
*.test.js
*.test.ts
test/
__tests__/

# 開発用ファイルの除外
.eslintrc*
.prettierrc*
.vscode/
.idea/

# ビルド・開発用ファイル
.env*
.env.local
.env.development
.env.test

# ログファイル関連の除外
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
.npm
.eslintcache

# OS関連ファイル
.DS_Store
Thumbs.db

# 一時ファイル
*.tmp
*.temp
`;

  fs.writeFileSync(
    path.join(CONFIG.deployDir, ".gcloudignore"),
    gcloudignore,
    "utf8",
  );
  console.log("✅ .gcloudignore生成完了");
}

/**
 * shared-typesパッケージを直接バンドル
 */
function bundleSharedTypes() {
  console.log("🔗 shared-typesパッケージをバンドル中...");

  const sharedTypesSource = "./packages/shared-types/dist";
  const sharedTypesTarget = path.join(
    CONFIG.deployDir,
    "node_modules/@suzumina.click/shared-types",
  );

  // shared-typesがビルド済みかチェック
  if (!fs.existsSync(sharedTypesSource)) {
    throw new Error(
      "shared-typesがビルドされていません。先に 'pnpm --filter @suzumina.click/shared-types build' を実行してください。",
    );
  }

  // shared-typesの内容をコピー
  ensureDirectory(path.dirname(sharedTypesTarget));
  copyRecursive(sharedTypesSource, path.join(sharedTypesTarget, "dist"));

  // package.jsonもコピー
  const sharedTypesPackageJson = path.join(
    "./packages/shared-types/package.json",
  );
  const targetPackageJson = path.join(sharedTypesTarget, "package.json");
  fs.copyFileSync(sharedTypesPackageJson, targetPackageJson);

  console.log("✅ shared-typesバンドル完了");
}

/**
 * プロダクション依存関係をインストール
 */
function installDependencies() {
  console.log("📥 プロダクション依存関係をインストール中...");

  try {
    execSync("npm install --omit=dev --ignore-scripts --no-audit --no-fund", {
      cwd: CONFIG.deployDir,
      stdio: "inherit",
    });

    console.log("✅ 依存関係インストール完了");
  } catch (error) {
    console.error("❌ 依存関係のインストールに失敗:", error.message);
    throw error;
  }
}

/**
 * デプロイパッケージの検証
 */
function validateDeployPackage() {
  console.log("🔍 デプロイパッケージを検証中...");

  const requiredFiles = ["lib/index.js", "package.json", ".gcloudignore"];

  const requiredNodeModules = [
    "node_modules/@suzumina.click/shared-types/dist/index.js",
    "node_modules/@google-cloud/functions-framework",
  ];

  // 必須ファイルの確認
  for (const file of requiredFiles) {
    const filePath = path.join(CONFIG.deployDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`必須ファイルが見つかりません: ${file}`);
    }
  }

  // 必須node_modulesの確認
  for (const module of requiredNodeModules) {
    const modulePath = path.join(CONFIG.deployDir, module);
    if (!fs.existsSync(modulePath)) {
      throw new Error(`必須モジュールが見つかりません: ${module}`);
    }
  }

  console.log("✅ デプロイパッケージ検証完了");
}

/**
 * デプロイパッケージのサマリーを表示
 */
function displaySummary() {
  console.log("\n📊 デプロイパッケージサマリー:");

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(CONFIG.deployDir, "package.json"), "utf8"),
    );

    console.log(`   名前: ${packageJson.name}`);
    console.log(`   バージョン: ${packageJson.version}`);
    console.log(
      `   依存関係数: ${Object.keys(packageJson.dependencies || {}).length}`,
    );

    // ファイルサイズの表示
    const stats = fs.statSync(CONFIG.deployDir);
    console.log(`   作成日時: ${stats.mtime.toLocaleString("ja-JP")}`);

    // 主要なファイルの存在確認
    const libFiles = fs.readdirSync(path.join(CONFIG.deployDir, "lib"));
    console.log(`   ビルド済みファイル: ${libFiles.length}個`);
  } catch (error) {
    console.warn("⚠️  サマリー表示でエラーが発生しました:", error.message);
  }
}

/**
 * メイン処理
 */
function main() {
  try {
    console.log("🚀 monorepo対応Cloud Functionsデプロイパッケージ作成開始\n");

    // 1. デプロイディレクトリの準備
    ensureDirectory(CONFIG.deployDir);

    // 2. ビルド済みファイルのコピー
    console.log("📂 ビルド済みファイルをコピー中...");
    const libSource = path.join(CONFIG.functionsDir, "lib");
    const libTarget = path.join(CONFIG.deployDir, "lib");

    if (!fs.existsSync(libSource)) {
      throw new Error(
        "ビルド済みファイルが見つかりません。先にビルドを実行してください。",
      );
    }

    copyRecursive(libSource, libTarget);
    console.log("✅ ファイルコピー完了");

    // 3. package.json生成
    generateDeployPackageJson();

    // 4. .gcloudignore生成
    generateGcloudIgnore();

    // 5. shared-typesバンドル
    bundleSharedTypes();

    // 6. 依存関係インストール
    installDependencies();

    // 7. パッケージ検証
    validateDeployPackage();

    // 8. サマリー表示
    displaySummary();

    console.log("\n🎉 デプロイパッケージの作成が完了しました！");
  } catch (error) {
    console.error(
      "\n❌ デプロイパッケージ作成でエラーが発生しました:",
      error.message,
    );
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (require.main === module) {
  main();
}

module.exports = {
  main,
  generateDeployPackageJson,
  bundleSharedTypes,
  validateDeployPackage,
};
