/**
 * K6 压力测试脚本
 * 测试系统在高负载下的表现
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');
const searchDuration = new Trend('search_duration');
const productViewCount = new Counter('product_views');

// 配置
const BASE_URL = __ENV.TEST_URL || 'http://localhost:3000';

// 负载配置
export const options = {
  stages: [
    // 1. 预热阶段（2分钟，逐步升到50用户）
    { duration: '2m', target: 50 },
    
    // 2. 正常负载（5分钟，保持50用户）
    { duration: '5m', target: 50 },
    
    // 3. 增压（2分钟，升到100用户）
    { duration: '2m', target: 100 },
    
    // 4. 高负载（5分钟，保持100用户）
    { duration: '5m', target: 100 },
    
    // 5. 压力测试（3分钟，冲到200用户）
    { duration: '3m', target: 200 },
    
    // 6. 峰值（2分钟，保持200用户）
    { duration: '2m', target: 200 },
    
    // 7. 恢复测试（2分钟，降回50用户）
    { duration: '2m', target: 50 },
    
    // 8. 降温（1分钟，降到0）
    { duration: '1m', target: 0 },
  ],
  
  // 性能阈值（如果不满足，测试失败）
  thresholds: {
    // HTTP 错误率必须 < 1%
    'http_req_failed': ['rate<0.01'],
    
    // 95% 的请求必须在 2 秒内完成
    'http_req_duration': ['p(95)<2000'],
    
    // 99% 的请求必须在 5 秒内完成
    'http_req_duration': ['p(99)<5000'],
    
    // 平均响应时间 < 1 秒
    'http_req_duration': ['avg<1000'],
    
    // 自定义指标阈值
    'errors': ['rate<0.05'],  // 业务错误率 < 5%
    'checkout_duration': ['p(95)<3000'],  // 结账流程 < 3 秒
    'search_duration': ['p(95)<1000'],  // 搜索 < 1 秒
  },
  
  // 其他配置
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
  batch: 10,  // 批量请求数
  batchPerHost: 5,
};

// ============================================
// 工具函数
// ============================================

function randomProduct() {
  return Math.floor(Math.random() * 20) + 1;
}

function randomEmail() {
  return `loadtest-${Date.now()}-${Math.random()}@test.com`;
}

// ============================================
// 主测试场景
// ============================================

export default function() {
  // 随机选择一个场景
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    // 60% - 浏览型用户
    browserScenario();
  } else if (scenario < 0.85) {
    // 25% - 购物用户
    shopperScenario();
  } else if (scenario < 0.95) {
    // 10% - 搜索用户
    searchScenario();
  } else {
    // 5% - 分类筛选用户
    filterScenario();
  }
}

// ============================================
// 场景 1: 浏览型用户
// ============================================

function browserScenario() {
  group('Browser Scenario', function() {
    // 1. 访问产品列表
    let res = http.get(`${BASE_URL}/api/products`);
    
    check(res, {
      'products loaded': (r) => r.status === 200,
      'has products': (r) => r.json('products') && r.json('products').length > 0,
    }) || errorRate.add(1);
    
    sleep(Math.random() * 2 + 1);  // 1-3 秒
    
    // 2. 查看产品详情
    const productId = randomProduct();
    res = http.get(`${BASE_URL}/api/products/${productId}`);
    
    check(res, {
      'product detail loaded': (r) => r.status === 200,
      'has product data': (r) => r.json('product') !== null,
    }) || errorRate.add(1);
    
    productViewCount.add(1);
    
    sleep(Math.random() * 3 + 2);  // 2-5 秒
    
    // 3. 查看更多产品
    res = http.get(`${BASE_URL}/api/products?page=2`);
    
    check(res, {
      'page 2 loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(Math.random() * 2 + 1);
  });
}

// ============================================
// 场景 2: 购物用户
// ============================================

function shopperScenario() {
  group('Shopper Scenario', function() {
    // 1. 浏览产品
    let res = http.get(`${BASE_URL}/api/products`);
    
    check(res, {
      'products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    const products = res.json('products');
    if (!products || products.length === 0) {
      errorRate.add(1);
      return;
    }
    
    sleep(2);
    
    // 2. 查看产品详情
    const product1 = products[0];
    res = http.get(`${BASE_URL}/api/products/${product1.id}`);
    
    check(res, {
      'product 1 loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(3);
    
    // 3. 查看另一个产品
    const product2 = products[1] || products[0];
    res = http.get(`${BASE_URL}/api/products/${product2.id}`);
    
    sleep(2);
    
    // 4. 结账（创建 Stripe session）
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
      'checkout created': (r) => r.status === 200,
      'has stripe url': (r) => r.json('url') !== undefined,
    }) || errorRate.add(1);
    
    sleep(1);
  });
}

// ============================================
// 场景 3: 搜索用户
// ============================================

function searchScenario() {
  group('Search Scenario', function() {
    const searchTerms = ['protein', 'whey', 'supplement', 'creatine', 'bcaa'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // 1. 执行搜索
    const searchStart = Date.now();
    
    let res = http.get(`${BASE_URL}/api/products/search?q=${term}`);
    
    const searchEnd = Date.now();
    searchDuration.add(searchEnd - searchStart);
    
    check(res, {
      'search successful': (r) => r.status === 200,
      'has results': (r) => {
        const results = r.json('results');
        return results !== undefined;
      },
    }) || errorRate.add(1);
    
    sleep(2);
    
    // 2. 查看搜索结果中的产品
    const productId = randomProduct();
    res = http.get(`${BASE_URL}/api/products/${productId}`);
    
    check(res, {
      'product from search loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(3);
  });
}

// ============================================
// 场景 4: 分类筛选用户
// ============================================

function filterScenario() {
  group('Filter Scenario', function() {
    // 1. 获取分类列表
    let res = http.get(`${BASE_URL}/api/categories`);
    
    check(res, {
      'categories loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    const categories = res.json('categories');
    if (!categories || categories.length === 0) {
      return;
    }
    
    sleep(1);
    
    // 2. 按分类筛选
    const category = categories[0];
    res = http.get(`${BASE_URL}/api/products?category=${category.id}`);
    
    check(res, {
      'filtered products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(2);
    
    // 3. 测试排序
    res = http.get(`${BASE_URL}/api/products?category=${category.id}&sort=price_asc`);
    
    check(res, {
      'sorted products loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(1);
    
    // 4. 测试分页
    res = http.get(`${BASE_URL}/api/products?category=${category.id}&page=2`);
    
    check(res, {
      'page 2 loaded': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    sleep(2);
  });
}

// ============================================
// 压力测试（独立运行）
// ============================================

export function stressTest() {
  // 并发批量请求
  const requests = [];
  
  for (let i = 0; i < 10; i++) {
    requests.push(['GET', `${BASE_URL}/api/products`, null, { tags: { name: 'batch' } }]);
  }
  
  const responses = http.batch(requests);
  
  responses.forEach(res => {
    check(res, {
      'batch request successful': (r) => r.status === 200,
    }) || errorRate.add(1);
  });
}

// ============================================
// 测试生命周期钩子
// ============================================

export function setup() {
  console.log('🚀 开始 K6 压力测试');
  console.log(`目标: ${BASE_URL}`);
  console.log(`预计运行时间: 24 分钟`);
  
  // 检查服务器是否可用
  const res = http.get(`${BASE_URL}/api/products`);
  if (res.status !== 200) {
    throw new Error('服务器不可用');
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`✅ 测试完成，运行时间: ${duration.toFixed(1)} 分钟`);
}

// ============================================
// 执行命令
// ============================================
// 基础测试: k6 run k6-load-test.js
// 压力测试: k6 run --stage "1m:500" k6-load-test.js
// 输出到文件: k6 run --out json=results.json k6-load-test.js
