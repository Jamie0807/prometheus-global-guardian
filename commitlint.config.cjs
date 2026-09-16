/**
 * 定义 Commitlint 与 cz-git 的提交信息规范。
 * @type {import('cz-git').UserConfig}
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  prompt: {
    messages: {
      type: "Select the type of change:",
      scope: "Select the scope of change (optional):",
      customScope: "Enter a custom scope:",
      subject: "Write a short imperative description:\n",
      body: 'Provide a longer description (optional). Use "|" for line breaks:\n',
      breaking: 'Describe breaking changes (optional). Use "|" for line breaks:\n',
      footerPrefixesSelect: "Select an issue prefix (optional):",
      customFooterPrefix: "Enter a custom issue prefix:",
      footer: "List issue references (optional), for example: #31:\n",
      confirmCommit: "Commit with this message?",
    },
    types: [
      { value: "feat", name: "feat:     A new feature" },
      { value: "fix", name: "fix:      A bug fix" },
      { value: "docs", name: "docs:     Documentation only changes" },
      { value: "style", name: "style:    Changes that do not affect code meaning" },
      { value: "refactor", name: "refactor: A code change that is not a fix or feature" },
      { value: "perf", name: "perf:     A performance improvement" },
      { value: "test", name: "test:     Add or correct tests" },
      { value: "build", name: "build:    Build system or dependency changes" },
      { value: "ci", name: "ci:       CI configuration changes" },
      { value: "chore", name: "chore:    Other maintenance changes" },
      { value: "revert", name: "revert:   Revert a previous commit" },
    ],
    useEmoji: false,
    allowCustomScopes: true,
    allowEmptyScopes: true,
  },
};
