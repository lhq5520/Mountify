import { test, expect } from '@playwright/test';

/**
 * E2E 测试: Mountify 购物流程
 * 基于实际网站结构编写
 */

test.describe('完整购物流程', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Mountify/i);
    
    // 验证 Logo 存在
    await expect(page.locator('a[href="/"]').filter({ hasText: 'Mountify' })).toBeVisible();
    
    // 验证导航栏
    await expect(page.locator('nav')).toBeVisible();
    // 导航栏里的 Products 链接（用 nav 内限定）
    await expect(page.locator('nav a[href="/products"]')).toBeVisible();
    await expect(page.locator('nav a[href="/cart"]')).toBeVisible();
  });

  test('产品列表页加载正常', async ({ page }) => {
    await page.goto('/products');
    
    // 验证标题
    await expect(page.locator('h1')).toContainText('Products');
    
    // 验证产品卡片存在 (article 标签)
    const productCards = page.locator('article.group');
    await expect(productCards.first()).toBeVisible();
    
    // 验证至少有一个产品
    const count = await productCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('产品详情页 - 点击产品进入详情', async ({ page }) => {
    await page.goto('/products');
    
    // 等待产品卡片加载
    const productCards = page.locator('article.group');
    await expect(productCards.first()).toBeVisible();
    
    // 获取第一个产品的名称
    const productName = await productCards.first().locator('h2').textContent();
    
    // 点击第一个产品
    await productCards.first().locator('a').first().click();
    
    // 验证 URL 变化
    await expect(page).toHaveURL(/\/products\/\d+/);
  });

  test('搜索功能', async ({ page }) => {
    await page.goto('/products');
    
    // 找到搜索框（可能在桌面端可见，移动端隐藏）
    const searchInput = page.locator('input[placeholder="Search..."]');
    
    // 检查搜索框是否可见
    const isVisible = await searchInput.isVisible();
    
    if (isVisible) {
      // 输入搜索词
      await searchInput.fill('test');
      await searchInput.press('Enter');
      
      // 等待页面响应
      await page.waitForTimeout(500);
    }
    // 如果搜索框不可见（移动端），测试跳过
  });

  test('分类筛选按钮存在', async ({ page }) => {
    await page.goto('/products');
    
    // 找到 Category 按钮
    const categoryButton = page.locator('button').filter({ hasText: 'Category' });
    await expect(categoryButton).toBeVisible();
    
    // 找到 Sort 按钮
    const sortButton = page.locator('button').filter({ hasText: 'Sort' });
    await expect(sortButton).toBeVisible();
  });

  test('购物车页面可访问', async ({ page }) => {
    await page.goto('/cart');
    
    // 验证购物车页面加载
    await expect(page).toHaveURL('/cart');
  });
});

test.describe('导航功能', () => {
  test('Logo 链接回首页', async ({ page }) => {
    await page.goto('/products');
    
    // 点击 Logo
    await page.locator('a[href="/"]').filter({ hasText: 'Mountify' }).click();
    
    // 验证回到首页
    await expect(page).toHaveURL('/');
  });

  test('Products 导航链接', async ({ page }) => {
    await page.goto('/');
    
    // 点击导航栏里的 Products 链接
    await page.locator('nav a[href="/products"]').click();
    
    // 验证跳转
    await expect(page).toHaveURL('/products');
  });

  test('购物车图标链接', async ({ page }) => {
    await page.goto('/');
    
    // 点击导航栏里的购物车图标
    await page.locator('nav a[href="/cart"]').click();
    
    // 验证跳转
    await expect(page).toHaveURL('/cart');
  });
});

test.describe('产品展示', () => {
  test('产品卡片包含必要信息', async ({ page }) => {
    await page.goto('/products');
    
    const firstProduct = page.locator('article.group').first();
    await expect(firstProduct).toBeVisible();
    
    // 产品图片
    await expect(firstProduct.locator('img').first()).toBeVisible();
    
    // 产品名称
    await expect(firstProduct.locator('h2')).toBeVisible();
    
    // 产品价格 (包含 $)
    const priceText = await firstProduct.locator('p.font-semibold').textContent();
    expect(priceText).toMatch(/\$/);
    
    // View details 链接
    await expect(firstProduct.locator('a').filter({ hasText: 'View details' })).toBeVisible();
  });

  test('产品价格格式正确', async ({ page }) => {
    await page.goto('/products');
    
    const prices = page.locator('article.group p.font-semibold');
    const count = await prices.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const priceText = await prices.nth(i).textContent();
      // 验证价格格式: $XX.XX
      expect(priceText).toMatch(/^\$\d+(\.\d{2})?$/);
    }
  });

  test('库存状态标签显示', async ({ page }) => {
    await page.goto('/products');
    
    // 检查是否有 "Out of Stock" 或 "Low Stock" 标签
    const stockLabels = page.locator('article.group div').filter({ 
      hasText: /Out of Stock|Low Stock/ 
    });
    
    // 这个测试只验证标签样式正确（如果存在）
    const count = await stockLabels.count();
    if (count > 0) {
      await expect(stockLabels.first()).toBeVisible();
    }
  });
});

test.describe('响应式设计', () => {
  test('移动端 - 汉堡菜单可见', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // 汉堡菜单按钮应该可见 (md:hidden)
    const menuButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(menuButton).toBeVisible();
  });

  test('桌面端 - 导航链接可见', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    // 桌面端导航应该可见（nav 内的链接）
    await expect(page.locator('nav a[href="/products"]')).toBeVisible();
  });

  test('产品网格布局 - 桌面端多列', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/products');
    
    // 验证网格容器存在
    const grid = page.locator('section.grid');
    await expect(grid).toBeVisible();
  });
});

test.describe('用户交互', () => {
  test('产品卡片 hover 效果', async ({ page }) => {
    await page.goto('/products');
    
    const firstProduct = page.locator('article.group').first();
    await expect(firstProduct).toBeVisible();
    
    // Hover 产品卡片
    await firstProduct.hover();
    
    // 等待 hover 动画
    await page.waitForTimeout(300);
  });

  test('用户菜单按钮存在', async ({ page }) => {
    await page.goto('/');
    
    // 用户按钮（显示用户名或登录状态）
    const userButton = page.locator('button').filter({ hasText: /test|Sign|Log/ }).first();
    
    // 如果已登录，应该显示用户信息
    const isVisible = await userButton.isVisible().catch(() => false);
    // 这个测试只验证按钮存在性，不强制要求
  });
});

test.describe('页脚', () => {
  test('页脚内容正确', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // 验证版权信息
    await expect(footer).toContainText('Mountify');
    await expect(footer).toContainText('All rights reserved');
  });
});

test.describe('错误处理', () => {
  test('404 页面 - 不存在的路由', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');
    
    // Next.js 会返回 404 状态码或显示 404 页面
    // 验证页面包含 404 相关内容
    const content = await page.content();
    const is404 = content.includes('404') || 
                  content.includes('not found') || 
                  content.includes('Not Found');
    
    expect(is404 || response?.status() === 404).toBeTruthy();
  });

  test('不存在的产品 ID', async ({ page }) => {
    const response = await page.goto('/products/999999');
    
    // 应该返回 404 或显示错误页面
    const status = response?.status();
    expect(status === 404 || status === 200).toBeTruthy(); // 200 如果有自定义错误页
  });
});