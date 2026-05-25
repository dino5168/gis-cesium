# [Settings 與權限精通](Claude-Code-使用手冊/settings-and-permissions/README.md) <!-- slug: settings-and-permissions -->

## [settings.json 三層階層解析](settings-hierarchy.md) <!-- slug: settings-and-permissions-settings-hierarchy -->

## [permissions 精細控管設計](permissions-design.md) <!-- slug: settings-and-permissions-permissions-design -->

### allow/deny/ask 規則語法 <!-- slug: settings-and-permissions-permissions-design-rule-syntax -->

### 工具特定權限模式 <!-- slug: settings-and-permissions-permissions-design-tool-specific -->

## [環境變數與模型切換策略](env-and-model.md) <!-- slug: settings-and-permissions-env-and-model -->

## [statusLine 與終端體驗客製](statusline-customization.md) <!-- slug: settings-and-permissions-statusline-customization -->

# [Slash Commands 與 Skills 客製化](Claude-Code-使用手冊/slash-commands-and-skills/README.md) <!-- slug: slash-commands-and-skills -->

## [Slash Commands 撰寫格式](command-format.md) <!-- slug: slash-commands-and-skills-command-format -->

## [Skills 與 Commands 的本質差異](skill-vs-command.md) <!-- slug: slash-commands-and-skills-skill-vs-command -->

## [args 與 frontmatter 進階技巧](args-and-frontmatter.md) <!-- slug: slash-commands-and-skills-args-and-frontmatter -->

## [全域 / 專案 / plugin 三種作用域](scopes.md) <!-- slug: slash-commands-and-skills-scopes -->

# [Hooks 事件驅動自動化](Claude-Code-使用手冊/hooks-automation/README.md) <!-- slug: hooks-automation -->

## [Hook 生命週期事件總覽](lifecycle-events.md) <!-- slug: hooks-automation-lifecycle-events -->

## [PreToolUse / PostToolUse 攔截實戰](pre-post-tool-use.md) <!-- slug: hooks-automation-pre-post-tool-use -->

### 阻擋危險指令 <!-- slug: hooks-automation-pre-post-tool-use-block-dangerous -->

### 注入額外上下文 <!-- slug: hooks-automation-pre-post-tool-use-inject-context -->

## [UserPromptSubmit 與 SessionStart hook](prompt-and-session.md) <!-- slug: hooks-automation-prompt-and-session -->

## [Hook 偵錯、退出碼與安全紅線](debugging-and-safety.md) <!-- slug: hooks-automation-debugging-and-safety -->

# [Subagents 子代理協作](Claude-Code-使用手冊/subagents-collaboration/README.md) <!-- slug: subagents-collaboration -->

## [Subagent 設定檔結構](config-structure.md) <!-- slug: subagents-collaboration-config-structure -->

## [何時該開新 agent，何時不該](when-to-spawn.md) <!-- slug: subagents-collaboration-when-to-spawn -->

## [工具範圍與 isolation 模式](tools-and-isolation.md) <!-- slug: subagents-collaboration-tools-and-isolation -->

## [平行 vs 序列 spawn 策略](parallel-vs-sequential.md) <!-- slug: subagents-collaboration-parallel-vs-sequential -->

# [MCP 整合外部工具](Claude-Code-使用手冊/mcp-integration/README.md) <!-- slug: mcp-integration -->

## [MCP 架構與傳輸方式](architecture.md) <!-- slug: mcp-integration-architecture -->

### stdio 傳輸 <!-- slug: mcp-integration-architecture-stdio -->

### http / sse 傳輸 <!-- slug: mcp-integration-architecture-http-sse -->

## [設定與信任 MCP server](server-setup.md) <!-- slug: mcp-integration-server-setup -->

## [常用 MCP server 介紹](popular-servers.md) <!-- slug: mcp-integration-popular-servers -->

## [自製 MCP server 入門](build-your-own.md) <!-- slug: mcp-integration-build-your-own -->

# [工作流與團隊協作規模化](Claude-Code-使用手冊/workflows-and-team/README.md) <!-- slug: workflows-and-team -->

## [CLAUDE.md 設計：個人 vs 專案 vs 共享](claude-md-design.md) <!-- slug: workflows-and-team-claude-md-design -->

## [整合 git workflow 與 PR review](git-and-pr.md) <!-- slug: workflows-and-team-git-and-pr -->

## [headless mode 與 CI/CD 應用](headless-and-cicd.md) <!-- slug: workflows-and-team-headless-and-cicd -->

## [團隊規範、共享設定與量測 ROI](team-standards-and-roi.md) <!-- slug: workflows-and-team-team-standards-and-roi -->
