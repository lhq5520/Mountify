import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 测试完整的用户流程
 */

export default defineConfig({
  testDir: './tests',
  
  // 测试超时时间
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  
  // 全局设置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],
  
  // 测试选项
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    
    // 浏览器配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 导航等待
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  // 不同浏览器配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // 平板测试
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],

  // 本地开发服务器配置（可选）
  webServer: process.env.CI ? undefined : {
    command: 'npm run test',
    url: process.env.TEST_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
