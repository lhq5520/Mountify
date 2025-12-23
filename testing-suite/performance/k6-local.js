/**
 * K6 压力测试脚本 - 本地开发版
 * 适合 npm run dev 环境使用
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');
const searchDuration = new Trend('search_duration');
const productViewCount = new Counter('product_views');

// 配置 - 本地开发服务器默认端口
const BASE_URL = __ENV.TEST_URL || 'http://localhost:3000';

// 负载配置 - 本地开发版（轻量级）
export const options = {
  stages: [
    // 1. 预热（30秒，升到5用户）
    { duration: '30s', target: 5 },
    
    // 2. 正常负载（1分钟，保持5用户）
    { duration: '1m', target: 5 },
    
    // 3. 小幅增压（30秒，升到10用户）
    { duration: '30s', target: 10 },
    
    // 4. 轻度压力（1分钟，保持10用户）
    { duration: '1m', target: 10 },
    
    // 5. 峰值测试（30秒，升到15用户）
    { duration: '30s', target: 15 },
    
    // 6. 峰值保持（30秒）
    { duration: '30s', target: 15 },
    
    // 7. 降温（30秒，降到0）
    { duration: '30s', target: 0 },
  ],
  
  // 性能阈值 - 本地开发版（更宽松）
  thresholds: {
    // HTTP 错误率 < 5%（本地开发允许更多错误）
    'http_req_failed': ['rate<0.05'],
    
    // 95% 请求在 5 秒内完成（本地机器性能有限）
    'http_req_duration': ['p(95)<5000'],
    
    // 平均响应时间 < 2 秒
    'http_req_duration': ['avg<2000'],
    
    // 自定义指标阈值（更宽松）
    'errors': ['rate<0.10'],  // 业务错误率 < 10%
    'checkout_duration': ['p(95)<5000'],  // 结账流程 < 5 秒
    'search_duration': ['p(95)<2000'],  // 搜索 < 2 秒
  },
  
  // 其他配置
  noConnectionReuse: false,
  userAgent: 'K6LoadTest-Local/1.0',
  batch: 5,  // 减少批量请求数
  batchPerHost: 3,
};

// ============================================
// 工具函数
// ============================================

function randomEmail() {
  return `loadtest-${Date.now()}-${Math.random()}@test.com`;
}

// ============================================
// 主测试场景
// ============================================

export default function(data) {
  const productIds = data.productIds || [];
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    browserScenario(productIds);
  } else if (scenario < 0.85) {
    shopperScenario(productIds);
  } else if (scenario < 0.95) {
    searchScenario(productIds);
  } else {
    filterScenario(productIds);
  }
}

// ============================================
// 场景 1: 浏览型用户
// ============================================

function browserScenario(productIds) {
  group('Browser Scenario', function() {
    // 1. 访问产品列表
    let res = http.get(`${BASE_URL}/api/products`);
    
    check(res, {
      'products loaded': (r) => r.status === 200,
      'has products': (r) => {
        try {
          const data = r.json();
          return data.products && data.products.length > 0;
        } catch {
          return false;
        }
      },
    }) || errorRate.add(1);
    
    sleep(Math.random() * 1 + 0.5);  // 0.5-1.5 秒
    
    // 2. 查看产品详情（使用真实 ID）
    if (productIds.length > 0) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      res = http.get(`${BASE_URL}/api/products/${productId}`);
      
      check(res, {
        'product detail loaded': (r) => r.status === 200,
      }) || errorRate.add(1);
      
      productViewCount.add(1);
    }
    
    sleep(Math.random() * 1 + 1);  // 1-2 秒
    
    // 3. 查看更多产品
    res = http.get(`${BASE_URL}/api/products?page=2`);
    
    check(res, {
      'page 2 loaded': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
    
    sleep(Math.random() * 0.5 + 0.5);
  });
}

// ============================================
// 场景 2: 购物用户
// ============================================

function shopperScenario(productIds) {
  group('Shopper Scenario', function() {
    // 1. 浏览产品
    let res = http.get(`${BASE_URL}/api/products`);
    
    check(res, {
      'products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    let products = [];
    try {
      products = res.json('products') || [];
    } catch {
      errorRate.add(1);
      return;
    }
    
    if (products.length === 0) {
      return;
    }
    
    sleep(1);
    
    // 2. 查看产品详情
    const product1 = products[0];
    res = http.get(`${BASE_URL}/api/products/${product1.id}`);
    
    check(res, {
      'product 1 loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(1.5);
    
    // 3. 结账
    const checkoutStart = Date.now();
    
    res = http.post(
      `${BASE_URL}/api/checkout`,
      JSON.stringify({
        email: randomEmail(),
        items: [
          { productId: product1.id, quantity: 1 }
        ]
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    const checkoutEnd = Date.now();
    checkoutDuration.add(checkoutEnd - checkoutStart);
    
    check(res, {
      'checkout created': (r) => r.status === 200 || r.status === 201,
    }) || errorRate.add(1);
    
    sleep(0.5);
  });
}

// ============================================
// 场景 3: 搜索用户
// ============================================

function searchScenario(productIds) {
  group('Search Scenario', function() {
    const searchTerms = ['protein', 'whey', 'supplement', 'creatine', 'bcaa'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // 1. 执行搜索
    const searchStart = Date.now();
    
    let res = http.get(`${BASE_URL}/api/products/search?q=${term}`);
    
    const searchEnd = Date.now();
    searchDuration.add(searchEnd - searchStart);
    
    check(res, {
      'search successful': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
    
    sleep(1);
    
    // 2. 查看产品（使用真实 ID）
    if (productIds.length > 0) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      res = http.get(`${BASE_URL}/api/products/${productId}`);
      
      check(res, {
        'product loaded': (r) => r.status === 200,
      }) || errorRate.add(1);
    }
    
    sleep(1.5);
  });
}

// ============================================
// 场景 4: 分类筛选用户
// ============================================

function filterScenario(productIds) {
  group('Filter Scenario', function() {
    // 1. 获取分类列表
    let res = http.get(`${BASE_URL}/api/categories`);
    
    check(res, {
      'categories loaded': (r) => r.status === 200 || r.status === 404,
    }) || errorRate.add(1);
    
    let categories = [];
    try {
      categories = res.json('categories') || [];
    } catch {
      return;
    }
    
    if (categories.length === 0) {
      return;
    }
    
    sleep(0.5);
    
    // 2. 按分类筛选
    const category = categories[0];
    res = http.get(`${BASE_URL}/api/products?category=${category.id}`);
    
    check(res, {
      'filtered products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(1);
    
    // 3. 测试排序
    res = http.get(`${BASE_URL}/api/products?category=${category.id}&sort=price_asc`);
    
    check(res, {
      'sorted products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(0.5);
  });
}

// ============================================
// 快速冒烟测试（单独导出）
// ============================================

export function smokeTest() {
  // 快速检查所有端点是否正常
  const endpoints = [
    '/api/products',
    '/api/products/1',
    '/api/categories',
    '/api/products/search?q=test',
  ];
  
  endpoints.forEach(endpoint => {
    const res = http.get(`${BASE_URL}${endpoint}`);
    check(res, {
      [`${endpoint} available`]: (r) => r.status === 200 || r.status === 404,
    });
  });
}

// ============================================
// 测试生命周期钩子
// ============================================

export function setup() {
  console.log('🚀 开始本地 K6 压力测试');
  console.log(`目标: ${BASE_URL}`);
  console.log(`预计运行时间: ~5 分钟`);
  console.log(`最大并发: 15 用户`);
  console.log('');
  
  // 检查服务器是否可用并获取真实产品列表
  const res = http.get(`${BASE_URL}/api/products`);
  if (res.status !== 200) {
    console.log(`⚠️ 警告: 服务器返回状态码 ${res.status}`);
    console.log('请确保已运行 npm run dev');
    return { startTime: Date.now(), productIds: [] };
  }
  
  // 提取真实的产品 ID
  let productIds = [];
  try {
    const data = res.json();
    const products = data.products || data || [];
    productIds = products.map(p => p.id).filter(id => id);
    console.log(`📦 发现 ${productIds.length} 个产品`);
  } catch (e) {
    console.log('⚠️ 无法解析产品列表');
  }
  
  return { startTime: Date.now(), productIds };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('');
  console.log(`✅ 测试完成，运行时间: ${duration.toFixed(1)} 秒`);
}

// ============================================
// 生成报告
// ============================================

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportDir = __ENV.REPORT_DIR || './performance/reports';
  
  return {
    // HTML 报告
    [`${reportDir}/k6-report-${timestamp}.html`]: htmlReport(data),
    // JSON 报告（方便程序处理）
    [`${reportDir}/k6-report-${timestamp}.json`]: JSON.stringify(data, null, 2),
    // 终端输出
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // 简单的文本摘要
  const metrics = data.metrics;
  const checks = data.root_group?.checks || [];
  
  let output = '\n📊 K6 测试报告摘要\n';
  output += '═'.repeat(50) + '\n\n';
  
  // HTTP 请求统计
  if (metrics.http_reqs) {
    output += `📨 总请求数: ${metrics.http_reqs.values.count}\n`;
  }
  if (metrics.http_req_duration) {
    const dur = metrics.http_req_duration.values;
    output += `⏱️  响应时间: avg=${dur.avg.toFixed(0)}ms, p95=${dur['p(95)'].toFixed(0)}ms, max=${dur.max.toFixed(0)}ms\n`;
  }
  if (metrics.http_req_failed) {
    const rate = (metrics.http_req_failed.values.rate * 100).toFixed(2);
    output += `${rate > 5 ? '❌' : '✅'} 错误率: ${rate}%\n`;
  }
  
  output += '\n';
  return output;
}

function htmlReport(data) {
  const metrics = data.metrics;
  const timestamp = new Date().toLocaleString('zh-CN');
  
  // 提取关键指标
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const avgDuration = metrics.http_req_duration?.values?.avg?.toFixed(2) || 0;
  const p95Duration = metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0;
  const p99Duration = metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0;
  const maxDuration = metrics.http_req_duration?.values?.max?.toFixed(2) || 0;
  const minDuration = metrics.http_req_duration?.values?.min?.toFixed(2) || 0;
  const errorRate = ((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  const reqPerSec = metrics.http_reqs?.values?.rate?.toFixed(2) || 0;
  
  // 自定义指标
  const checkoutP95 = metrics.checkout_duration?.values?.['p(95)']?.toFixed(2) || 'N/A';
  const searchP95 = metrics.search_duration?.values?.['p(95)']?.toFixed(2) || 'N/A';
  const productViews = metrics.product_views?.values?.count || 0;
  const businessErrorRate = ((metrics.errors?.values?.rate || 0) * 100).toFixed(2);
  
  // 阈值检查
  const thresholds = data.thresholds || {};
  const passedThresholds = Object.values(thresholds).filter(t => t.ok).length;
  const totalThresholds = Object.keys(thresholds).length;
  const allPassed = passedThresholds === totalThresholds;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K6 性能测试报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; 
      color: #e2e8f0; 
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { 
      font-size: 1.875rem; 
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .timestamp { color: #94a3b8; margin-bottom: 2rem; }
    .status { 
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-left: 1rem;
    }
    .status.pass { background: #065f46; color: #6ee7b7; }
    .status.fail { background: #7f1d1d; color: #fca5a5; }
    .grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
      gap: 1rem; 
      margin-bottom: 2rem;
    }
    .card { 
      background: #1e293b; 
      border-radius: 0.75rem; 
      padding: 1.5rem;
      border: 1px solid #334155;
    }
    .card h3 { 
      color: #94a3b8; 
      font-size: 0.875rem; 
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    .card .value { 
      font-size: 2rem; 
      font-weight: 700;
      color: #f1f5f9;
    }
    .card .unit { 
      font-size: 1rem; 
      color: #64748b;
      margin-left: 0.25rem;
    }
    .card.error .value { color: ${errorRate > 5 ? '#f87171' : '#4ade80'}; }
    table { 
      width: 100%; 
      border-collapse: collapse;
      background: #1e293b;
      border-radius: 0.75rem;
      overflow: hidden;
    }
    th, td { 
      padding: 1rem; 
      text-align: left; 
      border-bottom: 1px solid #334155;
    }
    th { 
      background: #0f172a; 
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .pass-badge { color: #4ade80; }
    .fail-badge { color: #f87171; }
    .section { margin-bottom: 2rem; }
    .section h2 { 
      font-size: 1.25rem; 
      margin-bottom: 1rem;
      color: #f1f5f9;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>
        K6 性能测试报告
        <span class="status ${allPassed ? 'pass' : 'fail'}">${allPassed ? '✓ 通过' : '✗ 未通过'}</span>
      </h1>
      <p class="timestamp">生成时间: ${timestamp} | 目标: ${__ENV.TEST_URL || 'http://localhost:3000'}</p>
    </header>

    <div class="grid">
      <div class="card">
        <h3>总请求数</h3>
        <div class="value">${totalRequests.toLocaleString()}</div>
      </div>
      <div class="card">
        <h3>请求速率</h3>
        <div class="value">${reqPerSec}<span class="unit">req/s</span></div>
      </div>
      <div class="card error">
        <h3>错误率</h3>
        <div class="value">${errorRate}<span class="unit">%</span></div>
      </div>
      <div class="card">
        <h3>产品浏览量</h3>
        <div class="value">${productViews.toLocaleString()}</div>
      </div>
    </div>

    <div class="section">
      <h2>响应时间</h2>
      <div class="grid">
        <div class="card">
          <h3>平均</h3>
          <div class="value">${avgDuration}<span class="unit">ms</span></div>
        </div>
        <div class="card">
          <h3>P95</h3>
          <div class="value">${p95Duration}<span class="unit">ms</span></div>
        </div>
        <div class="card">
          <h3>P99</h3>
          <div class="value">${p99Duration}<span class="unit">ms</span></div>
        </div>
        <div class="card">
          <h3>最大</h3>
          <div class="value">${maxDuration}<span class="unit">ms</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>业务指标</h2>
      <div class="grid">
        <div class="card">
          <h3>结账耗时 (P95)</h3>
          <div class="value">${checkoutP95}<span class="unit">ms</span></div>
        </div>
        <div class="card">
          <h3>搜索耗时 (P95)</h3>
          <div class="value">${searchP95}<span class="unit">ms</span></div>
        </div>
        <div class="card error">
          <h3>业务错误率</h3>
          <div class="value">${businessErrorRate}<span class="unit">%</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>阈值检查 (${passedThresholds}/${totalThresholds})</h2>
      <table>
        <thead>
          <tr>
            <th>指标</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(thresholds).map(([name, result]) => `
            <tr>
              <td>${name}</td>
              <td class="${result.ok ? 'pass-badge' : 'fail-badge'}">${result.ok ? '✓ 通过' : '✗ 失败'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

// ============================================
// 执行命令
// ============================================
// 
// 完整测试 (~5分钟):
//   k6 run k6-load-test-local.js
// 
// 指定报告目录:
//   k6 run -e REPORT_DIR=./performance/reports k6-load-test-local.js
// 
// 快速冒烟测试:
//   k6 run --iterations 1 k6-load-test-local.js
// 
// 自定义端口:
//   k6 run -e TEST_URL=http://localhost:5173 k6-load-test-local.js
// 
// 只跑1分钟:
//   k6 run --duration 1m --vus 5 k6-load-test-local.js