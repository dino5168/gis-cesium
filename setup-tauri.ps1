<#
.SYNOPSIS
  一鍵建置 Tauri v2 + React 19 + TypeScript strict + Tailwind CSS v4 + shadcn/ui (radix-nova) 專案。

.DESCRIPTION
  非互動式批次腳本，對齊 D:\repo-tauri\tauri-notebook 樣板。
  詳細規劃見 imp-setup-tauri.md。

.EXAMPLE
  .\setup-tauri.ps1 -ProjectName my-app

.EXAMPLE
  .\setup-tauri.ps1 -ProjectName my-app -TargetDir D:\code -Identifier com.acme.myapp -InstallSampleComponents

.EXAMPLE
  .\setup-tauri.ps1 -ProjectName my-app -DryRun

.NOTES
  PowerShell 5.1 相容。執行前若遇執行政策阻擋：
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9][a-z0-9._-]*$')]
  [string] $ProjectName,

  [Parameter()]
  [string] $TargetDir = (Get-Location).Path,

  [Parameter()]
  [string] $Identifier,

  [Parameter()]
  [string] $WindowTitle,

  [Parameter()]
  [ValidateSet('pnpm', 'npm')]
  [string] $PackageManager = 'pnpm',

  [Parameter()]
  [ValidateSet('radix-nova', 'new-york', 'default')]
  [string] $ShadcnStyle = 'radix-nova',

  [Parameter()]
  [switch] $SkipShadcn,

  [Parameter()]
  [switch] $InstallSampleComponents,

  [Parameter()]
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
# Defaults derived from $ProjectName
# -----------------------------------------------------------------------------
if (-not $Identifier)  { $Identifier  = "com.example.$ProjectName" }
if (-not $WindowTitle) { $WindowTitle = $ProjectName }

$ProjectPath = Join-Path -Path $TargetDir -ChildPath $ProjectName
$pm          = $PackageManager
$pmExec      = if ($pm -eq 'pnpm') { 'pnpm dlx' } else { 'npx' }

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
function Write-Step  ([string]$Msg) { Write-Host "==> $Msg" -ForegroundColor Cyan }
function Write-Info  ([string]$Msg) { Write-Host "    $Msg" -ForegroundColor DarkGray }
function Write-Warn2 ([string]$Msg) { Write-Host "[!] $Msg" -ForegroundColor Yellow }
function Write-Ok    ([string]$Msg) { Write-Host "[OK] $Msg" -ForegroundColor Green }

function Invoke-Native {
  param(
    [Parameter(Mandatory)] [string] $Exe,
    [Parameter(ValueFromRemainingArguments = $true)] [string[]] $ArgList
  )
  $display = "$Exe $($ArgList -join ' ')"
  if ($DryRun) {
    Write-Info "[DryRun] $display"
    return
  }
  Write-Info $display
  & $Exe @ArgList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (exit $LASTEXITCODE): $display"
  }
}

function Test-Command ([string] $Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-Utf8File {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [string] $Content
  )
  if ($DryRun) {
    Write-Info "[DryRun] write file: $Path ($($Content.Length) chars)"
    return
  }
  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  # UTF-8 without BOM (PS 5.1 Set-Content -Encoding utf8 emits BOM, so use .NET API)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# -----------------------------------------------------------------------------
# Step 0 — Environment check
# -----------------------------------------------------------------------------
Write-Step "[Step 0] 環境檢查"

if (-not (Test-Command 'node')) { throw "Node.js 未安裝，請先安裝 Node 20+ (https://nodejs.org)" }
$nodeVer = (& node -v).TrimStart('v')
$nodeMajor = [int]($nodeVer.Split('.')[0])
if ($nodeMajor -lt 20) { throw "Node.js 版本過舊 ($nodeVer)，需要 >= 20" }
Write-Info "Node.js v$nodeVer"

if ($pm -eq 'pnpm' -and -not (Test-Command 'pnpm')) {
  throw "pnpm 未安裝，請執行: npm i -g pnpm （或改用 -PackageManager npm）"
}
if ($pm -eq 'pnpm') { Write-Info "pnpm $(& pnpm -v)" }

if (-not (Test-Command 'rustc') -or -not (Test-Command 'cargo')) {
  throw "Rust toolchain 未安裝，請先安裝 rustup (https://rustup.rs)"
}
Write-Info "$(& rustc --version)"

# MSVC linker (Windows only, soft warning)
$vsBuildTools = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools'
$vsCommunity  = 'C:\Program Files\Microsoft Visual Studio\2022\Community'
if (-not (Test-Path $vsBuildTools) -and -not (Test-Path $vsCommunity) -and -not (Test-Command 'link.exe')) {
  Write-Warn2 "找不到 VS 2022 BuildTools / Community 或 link.exe；首次 'tauri dev' 編譯時會失敗。"
  Write-Warn2 "請安裝: https://visualstudio.microsoft.com/visual-cpp-build-tools/"
}

# WebView2 (soft warning)
$wv2Keys = @(
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
  'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
)
$hasWv2 = $false
foreach ($k in $wv2Keys) { if (Test-Path $k) { $hasWv2 = $true; break } }
if (-not $hasWv2) {
  Write-Warn2 "找不到 WebView2 Runtime；release 打包必要 (https://developer.microsoft.com/microsoft-edge/webview2/)"
}

if (Test-Path $ProjectPath) {
  throw "目標目錄已存在: $ProjectPath （腳本不覆寫既有專案）"
}

Write-Ok "環境檢查通過"

# -----------------------------------------------------------------------------
# Step 1 — Scaffold Tauri + React + TS
# -----------------------------------------------------------------------------
Write-Step "[Step 1] 鷹架 Tauri + React + TypeScript ($ProjectName)"

if (-not (Test-Path $TargetDir)) {
  if (-not $DryRun) { New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null }
}

Push-Location $TargetDir
try {
  if ($pm -eq 'pnpm') {
    Invoke-Native 'pnpm' 'create' 'tauri-app@latest' $ProjectName `
      '--template' 'react-ts' '--manager' 'pnpm' '--identifier' $Identifier '--yes'
  } else {
    Invoke-Native 'npm' 'create' 'tauri-app@latest' '--' $ProjectName `
      '--template' 'react-ts' '--manager' 'npm' '--identifier' $Identifier '--yes'
  }
} finally {
  Pop-Location
}

if (-not $DryRun) {
  $required = @('src/main.tsx', 'src-tauri/tauri.conf.json', 'vite.config.ts', 'tsconfig.json')
  foreach ($f in $required) {
    $p = Join-Path $ProjectPath $f
    if (-not (Test-Path $p)) { throw "鷹架輸出缺檔: $p" }
  }
}
Write-Ok "Tauri + React + TS 鷹架完成"

if (-not $DryRun) { Push-Location $ProjectPath }
try {

  # ---------------------------------------------------------------------------
  # Step 2 — Tailwind CSS v4
  # ---------------------------------------------------------------------------
  Write-Step "[Step 2] 安裝 Tailwind CSS v4 (@tailwindcss/vite)"

  Invoke-Native $pm 'add' '-D' 'tailwindcss' '@tailwindcss/vite' 'tw-animate-css'

  $viteConfig = @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
'@
  Write-Utf8File -Path (Join-Path $ProjectPath 'vite.config.ts') -Content $viteConfig

  $indexCssBase = @'
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@layer base {
  body {
    @apply bg-background text-foreground antialiased;
  }
}
'@
  Write-Utf8File -Path (Join-Path $ProjectPath 'src/index.css') -Content $indexCssBase

  Write-Ok "Tailwind CSS v4 設定完成"

  # ---------------------------------------------------------------------------
  # Step 3 — Path alias @/* -> src/*
  # ---------------------------------------------------------------------------
  Write-Step "[Step 3] 設定路徑別名 @/* -> src/*"

  Invoke-Native $pm 'add' '-D' '@types/node'

  $tsconfig = @'
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
'@
  Write-Utf8File -Path (Join-Path $ProjectPath 'tsconfig.json') -Content $tsconfig

  Write-Ok "路徑別名設定完成"

  # ---------------------------------------------------------------------------
  # Step 4 — shadcn/ui init
  # ---------------------------------------------------------------------------
  if (-not $SkipShadcn) {
    Write-Step "[Step 4] 安裝 shadcn/ui 套件與 CSS 主題 (style: $ShadcnStyle)"

    # Install packages directly — avoids all shadcn init interactive prompts
    Invoke-Native $pm 'add' 'shadcn' 'clsx' 'tailwind-merge' 'class-variance-authority' 'lucide-react'

    # Rewrite index.css with full shadcn neutral theme variables
    $indexCssFull = @'
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --color-sidebar: var(--sidebar);
    --color-sidebar-foreground: var(--sidebar-foreground);
    --color-sidebar-primary: var(--sidebar-primary);
    --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
    --color-sidebar-accent: var(--sidebar-accent);
    --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
    --color-sidebar-border: var(--sidebar-border);
    --color-sidebar-ring: var(--sidebar-ring);
    --radius-sm: calc(var(--radius) * 0.6);
    --radius-md: calc(var(--radius) * 0.8);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) * 1.4);
    --radius-2xl: calc(var(--radius) * 1.8);
    --radius-3xl: calc(var(--radius) * 2.2);
    --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --radius: 0.625rem;
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
}

.dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.87 0 0);
    --chart-2: oklch(0.556 0 0);
    --chart-3: oklch(0.439 0 0);
    --chart-4: oklch(0.371 0 0);
    --chart-5: oklch(0.269 0 0);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
'@
    Write-Utf8File -Path (Join-Path $ProjectPath 'src/index.css') -Content $indexCssFull

    # Write src/lib/utils.ts
    $utilsTs = @'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
'@
    Write-Utf8File -Path (Join-Path $ProjectPath 'src/lib/utils.ts') -Content $utilsTs

    # Write components.json
    $componentsJson = @"
{
  "`$schema": "https://ui.shadcn.com/schema.json",
  "style": "$ShadcnStyle",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
"@
    Write-Utf8File -Path (Join-Path $ProjectPath 'components.json') -Content $componentsJson

    if ($InstallSampleComponents) {
      Write-Info "安裝範例元件: button, card, sonner"
      if ($pm -eq 'pnpm') {
        Invoke-Native 'pnpm' 'dlx' 'shadcn@4.4.0' 'add' 'button' 'card' 'sonner' '--yes'
      } else {
        Invoke-Native 'npx' '--yes' 'shadcn@4.4.0' 'add' 'button' 'card' 'sonner' '--yes'
      }
    }

    Write-Ok "shadcn/ui 初始化完成"
  } else {
    Write-Info "已指定 -SkipShadcn，略過 shadcn/ui 初始化"
  }

  # ---------------------------------------------------------------------------
  # Step 5 — Tauri config overrides
  # ---------------------------------------------------------------------------
  Write-Step "[Step 5] 套用 Tauri 設定"

  $confPath = Join-Path $ProjectPath 'src-tauri/tauri.conf.json'
  if ($DryRun) {
    Write-Info "[DryRun] patch $confPath (productName, identifier, window, build commands)"
  } else {
    $raw  = Get-Content $confPath -Raw -Encoding UTF8
    $conf = $raw | ConvertFrom-Json

    $conf.productName = $ProjectName
    $conf.identifier  = $Identifier

    if (-not $conf.build) { $conf | Add-Member -NotePropertyName 'build' -NotePropertyValue ([pscustomobject]@{}) -Force }
    $conf.build.beforeDevCommand   = "$pm run dev"
    $conf.build.beforeBuildCommand = "$pm run build"
    $conf.build.devUrl             = "http://localhost:1420"
    $conf.build.frontendDist       = "../dist"

    if (-not $conf.app) { $conf | Add-Member -NotePropertyName 'app' -NotePropertyValue ([pscustomobject]@{}) -Force }
    $win = [pscustomobject]@{
      title       = $WindowTitle
      width       = 800
      height      = 600
      maximized   = $true
      decorations = $false
    }
    $conf.app | Add-Member -NotePropertyName 'windows' -NotePropertyValue @($win) -Force

    $json = $conf | ConvertTo-Json -Depth 32
    Write-Utf8File -Path $confPath -Content $json
  }

  Write-Ok "Tauri 設定套用完成"

  # ---------------------------------------------------------------------------
  # Step 6 — Sample App.tsx
  # ---------------------------------------------------------------------------
  Write-Step "[Step 6] 寫入範本 App.tsx"

  if (-not $SkipShadcn -and $InstallSampleComponents) {
    $appTsx = @'
import { Button } from "@/components/ui/button";

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Tauri + React + shadcn/ui</h1>
      <p className="text-sm text-muted-foreground">
        Edit <code className="rounded bg-muted px-1.5 py-0.5">src/App.tsx</code> to get started.
      </p>
      <Button onClick={() => alert("Hello from shadcn/ui")}>Click me</Button>
    </main>
  );
}

export default App;
'@
  } else {
    $appTsx = @'
function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Tauri + React + Tailwind</h1>
      <p className="text-sm text-gray-500">
        Edit <code className="rounded bg-gray-100 px-1.5 py-0.5">src/App.tsx</code> to get started.
      </p>
    </main>
  );
}

export default App;
'@
  }
  Write-Utf8File -Path (Join-Path $ProjectPath 'src/App.tsx') -Content $appTsx

  # main.tsx 必須引入 index.css；create-tauri-app 預設已含，這裡保險寫入
  $mainTsx = @'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'@
  Write-Utf8File -Path (Join-Path $ProjectPath 'src/main.tsx') -Content $mainTsx

  # App.css 由樣板淘汰（風格走 Tailwind / index.css），若存在則清空
  $appCss = Join-Path $ProjectPath 'src/App.css'
  if ((Test-Path $appCss) -and -not $DryRun) {
    Write-Utf8File -Path $appCss -Content "/* intentionally empty - styling lives in index.css via Tailwind */`n"
  }

  Write-Ok "範本檔案寫入完成"

  # ---------------------------------------------------------------------------
  # Step 7 — Verify
  # ---------------------------------------------------------------------------
  Write-Step "[Step 7] 驗證 (install + build + tauri info)"

  Invoke-Native $pm 'install'
  Invoke-Native $pm 'run' 'build'

  try {
    if ($pm -eq 'pnpm') {
      Invoke-Native 'pnpm' 'exec' 'tauri' 'info'
    } else {
      Invoke-Native 'npx' 'tauri' 'info'
    }
  } catch {
    Write-Warn2 "'tauri info' 執行失敗（不影響鷹架），錯誤訊息: $($_.Exception.Message)"
  }

  Write-Ok "驗證通過"

} finally {
  if (-not $DryRun) { Pop-Location }
}

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " 專案已建立於: $ProjectPath" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host " 下一步:" -ForegroundColor White
Write-Host "   cd $ProjectName"
Write-Host "   $pm run tauri dev      # 首次編譯 Rust 約 1.5-2 分鐘"
Write-Host ""
