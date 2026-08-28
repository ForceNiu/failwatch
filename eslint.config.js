import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

// FailWatch monorepo 统一 lint 配置（ESLint 9 flat config）
// 风格归 Prettier，逻辑/类型归 ESLint；测试文件额外开放 vitest 全局。
export default tseslint.config(
  {
    // 构建产物、配置脚本、依赖不进审查
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/.next',
      '**/coverage',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/vite.config.ts',
      '**/vitest.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 必须放在最后：关掉所有与 Prettier 冲突的格式化规则
  prettier,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // CODE_REVIEW.md 2.3 🔴：堵 any / 暗箱，AI 生成代码高发
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // 测试文件：vitest 全局（describe/it/expect/vi）无需 import
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser, ...globals.vitest },
    },
  },
)
