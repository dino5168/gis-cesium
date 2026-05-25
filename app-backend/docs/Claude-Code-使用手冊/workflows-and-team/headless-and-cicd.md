# headless mode 與 CI/CD 應用

> Headless mode 把 Claude Code 變成 CI/CD 可呼叫的命令列代理。

## 內容

Claude Code 不只是互動 TUI——它有 headless mode（無 UI、單次執行、結果輸出 stdout），這代表它能變成 CI/CD pipeline 的一個 step、cron job、或 webhook 觸發器。這節談的是把 Claude Code 從「桌邊工具」變成「自動化代理」的關鍵手法。

### Headless mode 基本用法

```bash
claude --headless --prompt "Review the diff and exit 1 if any blocker found"
```

關鍵 flag：

- `--headless`：不進 TUI，跑完就退
- `--prompt`：一次性 prompt
- `--print` / `-p`：將最終回應印到 stdout
- `--allowedTools`：白名單工具（覆蓋 settings）
- `--max-turns`：限制 turn 數，避免無限對話

exit code：

- `0`：正常結束
- 非 0：LLM 主動退出或執行錯誤

### CI/CD 整合範例：自動 PR review

`.github/workflows/auto-review.yml`：

```yaml
name: Claude PR Review
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - name: Run Claude review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude --headless -p \
            --allowedTools "Read,Grep,Bash(git diff*)" \
            --prompt "Review the diff between origin/main and HEAD.
                      Report only correctness bugs, not style.
                      Format as GitHub markdown." \
            > review.md

      - name: Post review as PR comment
        run: gh pr comment ${{ github.event.pull_request.number }} -F review.md
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 設計 headless 任務的三條原則

1. **單一意圖**：每個 headless 呼叫只做一件事，否則錯誤難 debug
2. **明確 allowedTools**：CI 環境給最小工具集，避免 LLM 跑出 shell 副作用
3. **明確終止條件**：prompt 結尾寫「完成後不再追問，直接輸出最終結果」

### 常見 CI/CD 用例

| 任務 | 觸發 | 收益 |
|------|------|------|
| PR 自動 review | pull_request 開啟 | 第一輪人工 review 省 50% |
| commit message lint | pre-receive hook | 強制 conventional commit 格式 |
| 自動補測試 | push 到 feature branch | 補上明顯缺漏的 test case |
| 失敗 build 分析 | CI 失敗時觸發 | 自動產出「最可能原因」初判 |
| 安全掃描補充 | 排程每日 | 跑 `/security-review` 找新引入的問題 |

### 成本控管

每次 headless 呼叫都計費。建議：

- 用 haiku 跑高頻、簡單任務（commit lint、format check）
- 用 sonnet 跑日常 review
- opus 只給「真的需要深思」的任務（架構評審、難 bug 分析）
- 加 max-turns 上限防止無限對話爆預算
- 在 settings 設 token budget 警示

### 限制與安全

- **不要在 CI 給 Claude 寫入主分支的權限**：所有變更走 PR
- **secret 管理**：API key 用 secret store，不要 hardcode 進 workflow
- **失敗開放 vs 失敗關閉**：CI 失敗時要明確決定「Claude 沒回應算 pass 還是 fail」

---

← [整合 git workflow 與 PR review](git-and-pr.md) | → [團隊規範、共享設定與量測 ROI](team-standards-and-roi.md)
