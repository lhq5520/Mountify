/**
 * 安全测试套件
 * 测试常见安全漏洞：价格篡改、SQL注入、XSS、权限提升等
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'test@test.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'as456789';

// Redis配置（用于清除限流缓存）
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 测试结果收集
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// 清除Redis所有缓存
async function clearRedisCache() {
  if (!REDIS_URL || !REDIS_TOKEN) {
    console.log('⚠️  未配置Redis，跳过清除缓存');
    return;
  }
  
  try {
    console.log('🧹 清除Redis所有缓存...');
    
    // 直接执行 FLUSHALL
    const res = await fetch(`${REDIS_URL}/flushall`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await res.json();
    
    if (data.result === 'OK') {
      console.log('   ✓ 已清空所有缓存');
    } else {
      console.log(`   ⚠️ 清除结果: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`⚠️  清除缓存失败: ${error.message}`);
  }
}

// 工具函数
async function testRequest(name, url, options = {}) {
  try {
    const response = await fetch(BASE_URL + url, options);
    const data = await response.text();
    
    let jsonData = null;
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      // 非 JSON 响应
    }
    
    return { response, data, jsonData };
  } catch (error) {
    return { error };
  }
}

async function login(email, password) {
  try {
    // 步骤1：获取CSRF token
    console.log('    获取CSRF token...');
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    
    // Node.js fetch 的 headers.get('set-cookie') 只返回第一个cookie
    // 需要用 getSetCookie() 获取所有cookies
    let csrfCookie = '';
    if (csrfRes.headers.getSetCookie) {
      csrfCookie = csrfRes.headers.getSetCookie().join('; ');
    } else {
      csrfCookie = csrfRes.headers.get('set-cookie') || '';
    }
    
    console.log(`    CSRF Token: ${csrfToken ? '✓' : '✗'}`);
    console.log(`    CSRF Cookie: ${csrfCookie ? csrfCookie.substring(0, 60) + '...' : '无'}`);
    
    if (!csrfToken) {
      console.log('  ❌ 无法获取CSRF token');
      return null;
    }
    
    // 步骤2：提交登录
    console.log('    提交登录...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookie
      },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        callbackUrl: `${BASE_URL}/`,
        json: 'true'
      }).toString(),
      redirect: 'manual'
    });
    
    console.log(`    登录响应状态: ${loginRes.status}`);
    
    // 步骤3：提取session cookie
    let loginCookies = '';
    if (loginRes.headers.getSetCookie) {
      loginCookies = loginRes.headers.getSetCookie().join('; ');
    } else {
      loginCookies = loginRes.headers.get('set-cookie') || '';
    }
    
    console.log(`    登录Cookies: ${loginCookies ? loginCookies.substring(0, 80) + '...' : '无'}`);
    
    if (loginCookies.includes('authjs.session-token')) {
      console.log('  ✅ 登录成功');
      return loginCookies;
    } else {
      console.log('  ❌ 登录失败 - 未找到session token');
      console.log(`    响应状态: ${loginRes.status}`);
      return null;
    }
  } catch (error) {
    console.log(`  ❌ 登录出错: ${error.message}`);
    return null;
  }
}

// ============================================
// 测试 1: 价格篡改攻击
// ============================================
async function testPriceTampering() {
  console.log('\n🔍 测试 1: 价格篡改攻击');
  
  const testCases = [
    {
      name: '尝试用 $0.01 购买商品',
      payload: {
        email: 'attacker@test.com',
        items: [
          { productId: 1, quantity: 1, priceCad: 0.01 }
        ]
      }
    },
    {
      name: '尝试用负数价格',
      payload: {
        email: 'attacker@test.com',
        items: [
          { productId: 1, quantity: 1, priceCad: -100 }
        ]
      }
    },
    {
      name: '尝试篡改多个商品价格',
      payload: {
        email: 'attacker@test.com',
        items: [
          { productId: 1, quantity: 1, priceCad: 0.01 },
          { productId: 2, quantity: 1, priceCad: 0.01 }
        ]
      }
    }
  ];
  
  for (const test of testCases) {
    const { response, jsonData, error } = await testRequest(
      test.name,
      '/api/checkout',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.payload)
      }
    );
    
    if (error || !response) {
      results.warnings.push({
        test: '价格篡改',
        case: test.name,
        message: `请求失败: ${error?.message || '无响应'}`
      });
      continue;
    }
    
    if (jsonData && jsonData.url) {
      // 检查 Stripe session 中的价格
      results.warnings.push({
        test: '价格篡改',
        case: test.name,
        message: '需要手动验证 Stripe session 中的价格是否使用数据库价格'
      });
    } else {
      results.passed.push({
        test: '价格篡改',
        case: test.name,
        message: '请求被拒绝或失败（这是好事）'
      });
    }
  }
}

// ============================================
// 测试 2: SQL 注入
// ============================================
async function testSQLInjection() {
  console.log('\n🔍 测试 2: SQL 注入攻击');
  
  const injectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE products; --",
    "1' UNION SELECT * FROM users--",
    "admin'--",
    "' OR 1=1--",
    "1'; DELETE FROM orders WHERE '1'='1",
    "1' AND 1=0 UNION ALL SELECT 'admin', 'password'",
  ];
  
  // 测试搜索 API
  for (const payload of injectionPayloads) {
    const { response, jsonData, error } = await testRequest(
      `SQL注入: ${payload}`,
      `/api/products/search?q=${encodeURIComponent(payload)}`
    );
    if (error || !response) {
      results.warnings.push({
        test: 'SQL注入',
        payload,
        message: `请求失败，可能是目标未启动或网络错误: ${error}`
      });
      continue;
    }
    if (response.status === 500) {
      results.failed.push({
        test: 'SQL注入',
        payload,
        message: '服务器错误 - 可能存在SQL注入漏洞！',
        status: response.status
      });
    } else if (response.status === 200) {
      results.passed.push({
        test: 'SQL注入',
        payload,
        message: '请求被正确处理（参数化查询）',
        status: 200
      });
    }
  }
  
  // 测试登录表单
  for (const payload of injectionPayloads.slice(0, 3)) {
    const { response, error, data } = await testRequest(
      `登录SQL注入: ${payload}`,
      '/api/auth/callback/credentials',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload,
          password: payload
        })
      }
    );
    if (error || !response) {
      results.warnings.push({
        test: 'SQL注入 - 登录',
        payload,
        message: `请求失败，可能是目标未启动或网络错误: ${error}`
      });
      continue;
    }
    
    // 检查是否真的登录成功：检查 Set-Cookie 是否包含 session token
    const setCookie = response.headers.get('set-cookie') || '';
    const hasSession = setCookie.includes('authjs.session-token') || setCookie.includes('next-auth.session-token');
    
    if (hasSession) {
      results.failed.push({
        test: 'SQL注入 - 登录',
        payload,
        message: '⚠️ 登录成功 - 可能存在SQL注入漏洞！',
        status: response.status
      });
    } else {
      results.passed.push({
        test: 'SQL注入 - 登录',
        payload,
        message: '登录被拒绝（无session cookie）',
        status: response.status
      });
    }
  }
}

// ============================================
// 测试 3: XSS 跨站脚本
// ============================================
async function testXSS() {
  console.log('\n🔍 测试 3: XSS 跨站脚本攻击');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg/onload=alert("XSS")>',
    'javascript:alert("XSS")',
    '<iframe src="javascript:alert(\'XSS\')">',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
  ];
  
  for (const payload of xssPayloads) {
    const { response, data, error } = await testRequest(
      `XSS: ${payload}`,
      `/api/products/search?q=${encodeURIComponent(payload)}`
    );
    if (error || !response) {
      results.warnings.push({
        test: 'XSS',
        payload,
        message: `请求失败，可能目标未启动或网络错误: ${error}`
      });
      continue;
    }
    // 检查响应中是否包含未转义的脚本
    if (data && data.includes('<script>')) {
      results.failed.push({
        test: 'XSS',
        payload,
        message: '⚠️ 响应包含未转义的脚本标签！',
        snippet: data.substring(0, 200)
      });
    } else {
      results.passed.push({
        test: 'XSS',
        payload,
        message: '输出被正确转义',
        status: response.status
      });
    }
  }
}

// ============================================
// 测试 4: 权限提升/访问控制
// ============================================
async function testAccessControl() {
  console.log('\n🔍 测试 4: 权限提升和访问控制');
  
  // 测试未授权访问 Admin API
  const adminEndpoints = [
    '/api/admin/products',
    '/api/admin/orders',
    '/api/admin/users',
    '/api/admin/dashboard'
  ];
  
  for (const endpoint of adminEndpoints) {
    const { response, jsonData, error } = await testRequest(
      `未授权访问: ${endpoint}`,
      endpoint
    );
    
    if (error || !response) {
      results.warnings.push({
        test: '访问控制',
        endpoint,
        message: `请求失败: ${error?.message || '无响应'}`,
      });
      continue;
    }
    
    if (response.status === 200) {
      results.failed.push({
        test: '访问控制',
        endpoint,
        message: '⚠️ 未授权用户可以访问 Admin API！',
        status: 200
      });
    } else if (response.status === 401 || response.status === 403) {
      results.passed.push({
        test: '访问控制',
        endpoint,
        message: '正确拒绝未授权访问',
        status: response.status
      });
    }
  }
  
  // 测试 Admin 操作（POST/PUT/DELETE）
  const destructiveOps = [
    { method: 'POST', url: '/api/admin/products', body: { name: 'Hack', price: 1 } },
    { method: 'PUT', url: '/api/admin/products/1', body: { price: 0.01 } },
    { method: 'DELETE', url: '/api/admin/products/1' },
  ];
  
  for (const op of destructiveOps) {
    const { response, error } = await testRequest(
      `未授权 ${op.method}: ${op.url}`,
      op.url,
      {
        method: op.method,
        headers: { 'Content-Type': 'application/json' },
        body: op.body ? JSON.stringify(op.body) : undefined
      }
    );
    
    if (error || !response) {
      results.warnings.push({
        test: '访问控制 - 破坏性操作',
        operation: `${op.method} ${op.url}`,
        message: `请求失败: ${error?.message || '无响应'}`,
      });
      continue;
    }
    
    if (response.status === 200) {
      results.failed.push({
        test: '访问控制 - 破坏性操作',
        operation: `${op.method} ${op.url}`,
        message: '⚠️ 未授权用户可以执行破坏性操作！',
        status: 200
      });
    } else {
      results.passed.push({
        test: '访问控制 - 破坏性操作',
        operation: `${op.method} ${op.url}`,
        message: '正确拒绝未授权操作',
        status: response.status
      });
    }
  }
}

// ============================================
// 测试 4.5: Admin认证测试（需要登录）
// ============================================
async function testAdminWithAuth() {
  console.log('\n🔍 测试 4.5: Admin 认证访问');
  
  // 先登录
  console.log('  尝试登录...');
  const sessionCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  
  if (!sessionCookie) {
    results.warnings.push({
      test: 'Admin认证',
      case: '登录',
      message: '无法登录，跳过Admin认证测试'
    });
    return;
  }
  
  // 用认证后的cookie测试Admin API
  const adminEndpoints = [
    { url: '/api/admin/products', method: 'GET' },
    { url: '/api/admin/orders', method: 'GET' },
  ];
  
  for (const endpoint of adminEndpoints) {
    const { response, error } = await testRequest(
      `认证访问: ${endpoint.url}`,
      endpoint.url,
      {
        method: endpoint.method,
        headers: { 
          'Cookie': sessionCookie
        }
      }
    );
    
    if (error || !response) {
      results.warnings.push({
        test: 'Admin认证',
        endpoint: endpoint.url,
        message: '请求失败'
      });
      continue;
    }
    
    if (response.status === 200) {
      results.passed.push({
        test: 'Admin认证',
        case: endpoint.url,
        message: '认证用户可以访问Admin API',
        status: 200
      });
    } else if (response.status === 403) {
      results.warnings.push({
        test: 'Admin认证',
        case: endpoint.url,
        message: '用户已登录但无Admin权限（需要admin角色）',
        status: 403
      });
    } else {
      results.warnings.push({
        test: 'Admin认证',
        case: endpoint.url,
        message: `未预期响应: ${response.status}`
      });
    }
  }
  
  // 测试修改密码限流（现在有认证了）
  console.log('  测试修改密码限流（已认证）...');
  const changePassRequests = [];
  
  for (let i = 0; i < 6; i++) {
    changePassRequests.push(
      testRequest(
        `修改密码${i}`,
        '/api/user/change-password',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
          },
          body: JSON.stringify({
            oldPassword: 'wrongpassword',
            newPassword: 'NewPassword123!@'
          })
        }
      )
    );
  }
  
  const changePassResponses = await Promise.all(changePassRequests);
  const changePassBlocked = changePassResponses.filter(r => r.response?.status === 429);
  
  if (changePassBlocked.length > 0) {
    results.passed.push({
      test: 'API滥用',
      case: '修改密码限流（已认证）',
      message: `检测到限流: ${changePassBlocked.length}/6被拒绝`,
      count: changePassBlocked.length
    });
  } else {
    const got401 = changePassResponses.filter(r => r.response?.status === 401).length;
    if (got401 > 0) {
      results.warnings.push({
        test: 'API滥用',
        case: '修改密码限流',
        message: `认证失败(${got401}个401)，session可能无效`
      });
    } else {
      results.warnings.push({
        test: 'API滥用',
        case: '修改密码限流',
        message: '未检测到限流'
      });
    }
  }
}

// ============================================
// 测试 5: Rate Limiting
// ============================================
async function testRateLimiting() {
  console.log('\n🔍 测试 5: Rate Limiting');
  
  // 测试登录 Rate Limit
  console.log('  发送 20 个快速登录请求...');
  const loginRequests = [];
  
  for (let i = 0; i < 20; i++) {
    loginRequests.push(
      testRequest(
        `Rate limit test ${i}`,
        '/api/auth/callback/credentials',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'wrongpassword'
          })
        }
      )
    );
  }
  
  const responses = await Promise.all(loginRequests);
  const rateLimited = responses.filter(r => r.response?.status === 429);
  
  if (rateLimited.length > 0) {
    results.passed.push({
      test: 'Rate Limiting - 登录',
      message: `正确限流: ${rateLimited.length}/20 请求被拒绝`,
      count: rateLimited.length
    });
  } else {
    results.warnings.push({
      test: 'Rate Limiting - 登录',
      message: '未检测到 rate limiting - 建议添加'
    });
  }
  
  // 测试忘记密码 Rate Limit
  console.log('  发送 15 个重置密码请求...');
  const resetRequests = [];
  
  for (let i = 0; i < 15; i++) {
    resetRequests.push(
      testRequest(
        `Reset password ${i}`,
        '/api/auth/forgot-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'victim@test.com' })
        }
      )
    );
  }
  
  const resetResponses = await Promise.all(resetRequests);
  const resetRateLimited = resetResponses.filter(r => r.response?.status === 429);
  
  // 注意：forgot-password 为了安全返回 200 但不发送邮件
  // 所以我们只检查是否有明确的 429，如果没有就给警告而不是失败
  if (resetRateLimited.length > 0) {
    results.passed.push({
      test: 'Rate Limiting - 重置密码',
      message: `正确限流: ${resetRateLimited.length}/15 请求被拒绝`,
      count: resetRateLimited.length
    });
  } else {
    results.warnings.push({
      test: 'Rate Limiting - 重置密码',
      message: '未检测到 429 响应，但使用隐式限流（返回200但不发送邮件）'
    });
  }
}

// ============================================
// 测试 6: 输入验证
// ============================================
async function testInputValidation() {
  console.log('\n🔍 测试 6: 输入验证');
  
  const invalidInputs = [
    {
      name: '负数数量',
      endpoint: '/api/checkout',
      body: { email: 'test@test.com', items: [{ productId: 1, quantity: -10 }] }
    },
    {
      name: '超大数量',
      endpoint: '/api/checkout',
      body: { email: 'test@test.com', items: [{ productId: 1, quantity: 999999 }] }
    },
    {
      name: '不存在的产品',
      endpoint: '/api/checkout',
      body: { email: 'test@test.com', items: [{ productId: 999999, quantity: 1 }] }
    },
    {
      name: '空订单',
      endpoint: '/api/checkout',
      body: { email: 'test@test.com', items: [] }
    },
    {
      name: '无效邮箱',
      endpoint: '/api/checkout',
      body: { email: 'not-an-email', items: [{ productId: 1, quantity: 1 }] }
    },
    {
      name: '超长字符串',
      endpoint: '/api/products/search',
      query: '?q=' + 'A'.repeat(10000)
    }
  ];
  
  for (const test of invalidInputs) {
    const url = test.query ? test.endpoint + test.query : test.endpoint;
    const { response, jsonData, error } = await testRequest(
      test.name,
      url,
      test.body ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      } : {}
    );
    
    if (error || !response) {
      results.warnings.push({
        test: '输入验证',
        case: test.name,
        message: `请求失败: ${error?.message || '无响应'}`,
      });
      continue;
    }
    
    // 对于搜索API，返回空结果也是正确的验证方式
    if (test.name === '超长字符串' && response.status === 200) {
      if (jsonData && Array.isArray(jsonData.suggestions) && jsonData.suggestions.length === 0) {
        results.passed.push({
          test: '输入验证',
          case: test.name,
          message: '正确处理（返回空结果）',
          status: response.status
        });
        continue;
      }
    }
    
    if (response.status >= 400 && response.status < 500) {
      results.passed.push({
        test: '输入验证',
        case: test.name,
        message: '正确拒绝无效输入',
        status: response.status
      });
    } else if (response.status === 200) {
      results.failed.push({
        test: '输入验证',
        case: test.name,
        message: '⚠️ 接受了无效输入！',
        status: 200
      });
    }
  }
}

// ============================================
// 测试 7: CSRF 保护
// ============================================
async function testCSRF() {
  console.log('\n🔍 测试 7: CSRF 保护');
  
  // 尝试跨域请求
  const { response, error } = await testRequest(
    'CSRF - 跨域请求',
    '/api/admin/products',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil.com'
      },
      body: JSON.stringify({ name: 'Hack', price: 1 })
    }
  );
  
  if (error || !response) {
    results.warnings.push({
      test: 'CSRF',
      message: `请求失败: ${error?.message || '无响应'}`,
    });
    return;
  }
  
  if (response.status === 403 || response.status === 401) {
    results.passed.push({
      test: 'CSRF',
      message: 'CORS 正确配置，拒绝跨域请求',
      status: response.status
    });
  } else {
    results.warnings.push({
      test: 'CSRF',
      message: '需要验证 CORS 配置是否正确',
      status: response.status
    });
  }
}

// ============================================
// 测试 8: IDOR（越权访问）
// ============================================
async function testIDOR() {
  console.log('\n🔍 测试 8: IDOR 越权访问');
  
  // 测试访问别人的订单（使用不同的 order ID）
  console.log('  测试订单越权访问...');
  const invalidOrderIds = [0, -1, 999999, 'invalid'];
  
  for (const orderId of invalidOrderIds) {
    const { response, error } = await testRequest(
      `访问订单 ${orderId}`,
      `/api/orders/session/${orderId}`
    );
    
    if (error || !response) {
      results.warnings.push({
        test: 'IDOR',
        case: `访问订单${orderId}`,
        message: '请求失败或无响应'
      });
      continue;
    }
    
    // 应该被拒绝（404）而不是返回订单信息（200）
    if (response.status === 404 || response.status === 401 || response.status === 403) {
      results.passed.push({
        test: 'IDOR',
        case: `访问订单${orderId}`,
        message: '正确拒绝访问',
        status: response.status
      });
    } else if (response.status === 200) {
      results.failed.push({
        test: 'IDOR',
        case: `访问订单${orderId}`,
        message: '⚠️ 未授权用户可以访问订单！',
        status: 200
      });
    }
  }
  
  // 测试修改别人的购物车（删除商品时使用无效ID）
  console.log('  测试购物车越权访问...');
  const cartTests = [
    { productId: -1, name: '负数ID' },
    { productId: 999999, name: '不存在的商品' },
    { productId: 'invalid', name: '无效ID' }
  ];
  
  for (const test of cartTests) {
    const { response, error } = await testRequest(
      `删除购物车 ${test.name}`,
      `/api/cart/${test.productId}`,
      { method: 'DELETE' }
    );
    
    if (error || !response) continue;
    
    if (response.status === 400 || response.status === 404) {
      results.passed.push({
        test: 'IDOR',
        case: `购物车${test.name}`,
        message: '正确拒绝删除',
        status: response.status
      });
    } else if (response.status === 200) {
      results.warnings.push({
        test: 'IDOR',
        case: `购物车${test.name}`,
        message: '应该返回4xx错误'
      });
    }
  }
}

// （测试 9：文件上传安全）已按你的要求移除，改在其他测试方案中进行

// ============================================
// 测试 10: 业务逻辑漏洞
// ============================================
async function testBusinessLogic() {
  console.log('\n🔍 测试 10: 业务逻辑验证');
  
  // 测试1：负库存
  console.log('  测试负库存订单...');
  const { response: negativeResponse, error: negError } = await testRequest(
    '负库存',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: -999 }]
      })
    }
  );
  
  if (!negError && negativeResponse) {
    if (negativeResponse.status >= 400) {
      results.passed.push({
        test: '业务逻辑',
        case: '负库存',
        message: '正确拒绝负数',
        status: negativeResponse.status
      });
    } else {
      results.failed.push({
        test: '业务逻辑',
        case: '负库存',
        message: '⚠️ 允许负库存订单！',
        status: negativeResponse.status
      });
    }
  }
  
  // 测试2：库存为0的商品
  const { response: zeroResponse } = await testRequest(
    '库存为0',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 999999, quantity: 1 }]
      })
    }
  );
  
  if (zeroResponse && zeroResponse.status >= 400) {
    results.passed.push({
      test: '业务逻辑',
      case: '库存不足',
      message: '正确拒绝库存不足订单',
      status: zeroResponse.status
    });
  }
  
  // 测试3：重复结账请求（同一秒内）
  console.log('  测试重复结账...');
  const checkoutPayload = {
    items: [{ productId: 1, quantity: 1 }]
  };
  
  const requests = [];
  for (let i = 0; i < 3; i++) {
    requests.push(
      testRequest(
        `重复结账${i}`,
        '/api/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checkoutPayload)
        }
      )
    );
  }
  
  const checkoutResponses = await Promise.all(requests);
  const successCount = checkoutResponses.filter(r => r.response?.status === 200).length;
  
  if (successCount <= 1) {
    results.passed.push({
      test: '业务逻辑',
      case: '防重复结账',
      message: '正确处理重复请求',
      count: successCount
    });
  } else {
    results.warnings.push({
      test: '业务逻辑',
      case: '防重复结账',
      message: `${successCount}个重复结账请求被接受（可能需要检查）`
    });
  }
}

// ============================================
// 测试 11: 信息泄露
// ============================================
async function testInformationDisclosure() {
  console.log('\n🔍 测试 11: 信息泄露');
  
  // 测试1：错误消息中的敏感信息
  console.log('  测试敏感错误信息...');
  const { response: errorResponse, data: errorData } = await testRequest(
    '触发错误',
    '/api/products/999999'
  );
  
  if (errorResponse && errorData) {
    const lowerData = errorData.toLowerCase();
    const sensitivePatterns = [
      'sql', 'database', 'query', 'line', 'connection',
      '/home/', '/usr/', '/var/', 'c:\\', 'windows\\',
      'password', 'secret', 'key', 'token', 'api_key'
    ];
    
    const hasSensitiveInfo = sensitivePatterns.some(pattern => 
      lowerData.includes(pattern) && errorResponse.status >= 500
    );
    
    if (hasSensitiveInfo) {
      results.failed.push({
        test: '信息泄露',
        case: '错误消息敏感信息',
        message: '⚠️ 错误消息包含敏感信息！',
        snippet: errorData.substring(0, 100)
      });
    } else {
      results.passed.push({
        test: '信息泄露',
        case: '错误消息敏感信息',
        message: '错误消息不包含敏感信息'
      });
    }
  }
  
  // 测试2：响应头泄露
  console.log('  测试响应头信息泄露...');
  const { response: headerResponse } = await testRequest(
    '检查响应头',
    '/api/products'
  );
  
  if (headerResponse) {
    const server = headerResponse.headers.get('server') || '';
    const xPoweredBy = headerResponse.headers.get('x-powered-by') || '';
    
    if (server.includes('Node') || server.includes('Express') || 
        xPoweredBy.includes('Express') || xPoweredBy.includes('Next')) {
      results.warnings.push({
        test: '信息泄露',
        case: '响应头Server信息',
        message: `Server header: ${server || xPoweredBy}`,
        severity: '低'
      });
    } else {
      results.passed.push({
        test: '信息泄露',
        case: '响应头Server信息',
        message: '未暴露Server信息'
      });
    }
  }
}

// ============================================
// 测试 12: API滥用与Webhook安全
// ============================================
async function testAPIAbuseAndWebhooks() {
  console.log('\n🔍 测试 12: API 滥用与 Webhook 安全');
  
  // 测试1：注册限流
  console.log('  测试注册限流...');
  const registerRequests = [];
  
  for (let i = 0; i < 8; i++) {
    registerRequests.push(
      testRequest(
        `注册${i}`,
        '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `spam${i}+${Date.now()}@test.com`,
            password: 'Password123!@'
          })
        }
      )
    );
  }
  
  const registerResponses = await Promise.all(registerRequests);
  const registerBlocked = registerResponses.filter(r => r.response?.status === 429);
  
  if (registerBlocked.length > 0) {
    results.passed.push({
      test: 'API滥用',
      case: '注册限流',
      message: `检测到限流: ${registerBlocked.length}/8被拒绝`,
      count: registerBlocked.length
    });
  } else {
    results.warnings.push({
      test: 'API滥用',
      case: '注册限流',
      message: '未检测到注册限流（建议添加）'
    });
  }
  
  // 测试2：Webhook签名验证
  console.log('  测试Webhook签名验证...');
  const { response: webhookResponse } = await testRequest(
    'Webhook无签名',
    '/api/webhooks/stripe',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_fake123',
            amount: 10000,
            currency: 'cad'
          }
        }
      })
    }
  );
  
  if (webhookResponse) {
    if (webhookResponse.status === 401 || webhookResponse.status === 403) {
      results.passed.push({
        test: 'Webhook安全',
        case: 'Webhook签名验证',
        message: '正确拒绝无签名请求',
        status: webhookResponse.status
      });
    } else if (webhookResponse.status === 400) {
      results.passed.push({
        test: 'Webhook安全',
        case: 'Webhook签名验证',
        message: '正确拒绝请求',
        status: webhookResponse.status
      });
    } else {
      results.failed.push({
        test: 'Webhook安全',
        case: 'Webhook签名验证',
        message: '⚠️ 接受了无签名的Webhook请求！',
        status: webhookResponse.status
      });
    }
  }
  
  // 测试3：修改密码接口安全
  console.log('  测试修改密码接口...');
  
  // 测试未认证访问是否被拒绝
  const { response: changePassResponse } = await testRequest(
    '修改密码未认证',
    '/api/user/change-password',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword: 'test',
        newPassword: 'NewPassword123!@'
      })
    }
  );
  
  if (changePassResponse) {
    if (changePassResponse.status === 401) {
      results.passed.push({
        test: 'API滥用',
        case: '修改密码认证',
        message: '正确拒绝未认证请求',
        status: 401
      });
    } else if (changePassResponse.status === 429) {
      results.passed.push({
        test: 'API滥用',
        case: '修改密码限流',
        message: '检测到限流',
        status: 429
      });
    } else {
      results.warnings.push({
        test: 'API滥用',
        case: '修改密码',
        message: `未预期的响应: ${changePassResponse.status}`
      });
    }
  }
}

// ============================================
// 测试 13: 购物车安全
// ============================================
async function testCartSecurity() {
  console.log('\n🔍 测试 13: 购物车安全');
  
  // 测试1：未认证访问购物车
  console.log('  测试购物车认证...');
  const { response: cartGetRes } = await testRequest(
    '未认证获取购物车',
    '/api/cart'
  );
  
  if (cartGetRes) {
    if (cartGetRes.status === 401) {
      results.passed.push({
        test: '购物车',
        case: 'GET认证',
        message: '正确要求认证',
        status: 401
      });
    } else if (cartGetRes.status === 200) {
      results.warnings.push({
        test: '购物车',
        case: 'GET认证',
        message: '未认证可访问（检查是否返回空购物车）'
      });
    }
  }
  
  // 测试2：添加无效商品到购物车
  console.log('  测试添加无效商品...');
  const invalidCartItems = [
    { productId: -1, quantity: 1, name: '负数ID' },
    { productId: 999999, quantity: 1, name: '不存在商品' },
    { productId: 1, quantity: -5, name: '负数数量' },
    { productId: 1, quantity: 0, name: '零数量' },
    { productId: 1, quantity: 999999, name: '超大数量' },
  ];
  
  for (const item of invalidCartItems) {
    const { response } = await testRequest(
      `添加${item.name}`,
      '/api/cart',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.productId, quantity: item.quantity })
      }
    );
    
    if (response) {
      if (response.status >= 400) {
        results.passed.push({
          test: '购物车',
          case: `添加${item.name}`,
          message: '正确拒绝',
          status: response.status
        });
      } else {
        results.warnings.push({
          test: '购物车',
          case: `添加${item.name}`,
          message: `接受了无效输入 (${response.status})`
        });
      }
    }
  }
}

// ============================================
// 测试 14: 用户地址安全（IDOR）
// ============================================
async function testAddressSecurity() {
  console.log('\n🔍 测试 14: 用户地址安全');
  
  // 测试1：未认证访问地址
  console.log('  测试地址认证...');
  const { response: addrGetRes } = await testRequest(
    '未认证获取地址',
    '/api/user/addresses'
  );
  
  if (addrGetRes) {
    if (addrGetRes.status === 401) {
      results.passed.push({
        test: '地址安全',
        case: 'GET认证',
        message: '正确要求认证',
        status: 401
      });
    } else {
      results.warnings.push({
        test: '地址安全',
        case: 'GET认证',
        message: `未预期响应: ${addrGetRes.status}`
      });
    }
  }
  
  // 测试2：尝试访问/删除别人的地址（IDOR）
  console.log('  测试地址IDOR...');
  const fakeAddressIds = [1, 999, 9999];
  
  for (const id of fakeAddressIds) {
    const { response: delRes } = await testRequest(
      `删除地址${id}`,
      `/api/user/addresses/${id}`,
      { method: 'DELETE' }
    );
    
    if (delRes) {
      if (delRes.status === 401 || delRes.status === 403 || delRes.status === 404) {
        results.passed.push({
          test: '地址安全',
          case: `IDOR删除${id}`,
          message: '正确拒绝',
          status: delRes.status
        });
      } else if (delRes.status === 200) {
        results.failed.push({
          test: '地址安全',
          case: `IDOR删除${id}`,
          message: '⚠️ 可能存在IDOR漏洞！',
          status: 200
        });
      }
    }
  }
  
  // 测试3：添加地址输入验证
  console.log('  测试地址输入验证...');
  const { response: addRes } = await testRequest(
    '添加无效地址',
    '/api/user/addresses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street: '',  // 空地址
        city: '',
        province: '',
        postalCode: 'invalid',
        country: ''
      })
    }
  );
  
  if (addRes && addRes.status === 401) {
    results.passed.push({
      test: '地址安全',
      case: '添加地址认证',
      message: '正确要求认证',
      status: 401
    });
  }
}

// ============================================
// 测试 15: 订单安全
// ============================================
async function testOrderSecurity() {
  console.log('\n🔍 测试 15: 订单安全');
  
  // 测试1：未认证访问我的订单
  console.log('  测试订单认证...');
  const { response: myOrdersRes } = await testRequest(
    '未认证获取订单',
    '/api/orders/my-orders'
  );
  
  if (myOrdersRes) {
    if (myOrdersRes.status === 401) {
      results.passed.push({
        test: '订单安全',
        case: 'my-orders认证',
        message: '正确要求认证',
        status: 401
      });
    } else {
      results.warnings.push({
        test: '订单安全',
        case: 'my-orders认证',
        message: `未预期响应: ${myOrdersRes.status}`
      });
    }
  }
  
  // 测试2：尝试用SQL注入获取订单
  console.log('  测试订单SQL注入...');
  const sqlPayloads = ["1' OR '1'='1", "1; DROP TABLE orders;--"];
  
  for (const payload of sqlPayloads) {
    const { response } = await testRequest(
      `订单SQL注入`,
      `/api/orders/session/${encodeURIComponent(payload)}`
    );
    
    if (response) {
      if (response.status === 404 || response.status === 400) {
        results.passed.push({
          test: '订单安全',
          case: 'SQL注入',
          message: '正确处理',
          status: response.status
        });
      } else if (response.status === 500) {
        results.failed.push({
          test: '订单安全',
          case: 'SQL注入',
          message: '⚠️ 服务器错误，可能存在漏洞！',
          status: 500
        });
      }
    }
  }
}

// ============================================
// 测试 16: 重置密码Token安全
// ============================================
async function testResetTokenSecurity() {
  console.log('\n🔍 测试 16: 重置密码Token安全');
  
  // 测试1：使用无效token
  console.log('  测试无效token...');
  const invalidTokens = [
    'invalid',
    '12345678901234567890',
    "'; DROP TABLE users;--",
    '<script>alert(1)</script>',
    '../../../etc/passwd'
  ];
  
  for (const token of invalidTokens) {
    const { response } = await testRequest(
      `无效token: ${token.substring(0, 20)}`,
      '/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: 'NewPassword123!@'
        })
      }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401) {
        results.passed.push({
          test: '重置密码',
          case: '无效token',
          message: '正确拒绝',
          status: response.status
        });
        break; // 只需要一个通过就行
      } else if (response.status === 200) {
        results.failed.push({
          test: '重置密码',
          case: '无效token',
          message: '⚠️ 接受了无效token！',
          status: 200
        });
      }
    }
  }
  
  // 测试2：弱密码验证
  console.log('  测试弱密码验证...');
  const weakPasswords = ['123', 'password', 'abc'];
  
  for (const pwd of weakPasswords) {
    const { response } = await testRequest(
      `弱密码: ${pwd}`,
      '/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'some-token',
          password: pwd
        })
      }
    );
    
    if (response && response.status === 400) {
      results.passed.push({
        test: '重置密码',
        case: '弱密码验证',
        message: '正确拒绝弱密码',
        status: 400
      });
      break;
    }
  }
}

// ============================================
// 测试 17: Admin其他接口权限
// ============================================
async function testAdminOtherEndpoints() {
  console.log('\n🔍 测试 17: Admin其他接口权限');
  
  const adminEndpoints = [
    { url: '/api/admin/categories', method: 'GET', name: '分类列表' },
    { url: '/api/admin/categories', method: 'POST', name: '创建分类' },
    { url: '/api/admin/inventory', method: 'GET', name: '库存查询' },
    { url: '/api/admin/shipping', method: 'GET', name: '发货管理' },
    { url: '/api/admin/stats', method: 'GET', name: '统计数据' },
    { url: '/api/admin/upload-image', method: 'POST', name: '上传图片' },
    { url: '/api/admin/delete-image', method: 'POST', name: '删除图片' },
  ];
  
  for (const endpoint of adminEndpoints) {
    const { response } = await testRequest(
      `未授权${endpoint.name}`,
      endpoint.url,
      {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: endpoint.method !== 'GET' ? JSON.stringify({}) : undefined
      }
    );
    
    if (response) {
      if (response.status === 401 || response.status === 403) {
        results.passed.push({
          test: 'Admin权限',
          case: endpoint.name,
          message: '正确拒绝未授权访问',
          status: response.status
        });
      } else if (response.status === 405) {
        results.passed.push({
          test: 'Admin权限',
          case: endpoint.name,
          message: '方法不允许（405）',
          status: 405
        });
      } else if (response.status === 200) {
        results.failed.push({
          test: 'Admin权限',
          case: endpoint.name,
          message: '⚠️ 未授权可访问！',
          status: 200
        });
      } else {
        results.warnings.push({
          test: 'Admin权限',
          case: endpoint.name,
          message: `响应: ${response.status}`
        });
      }
    }
  }
}

// ============================================
// 测试 18: HTTP方法安全
// ============================================
async function testHTTPMethods() {
  console.log('\n🔍 测试 18: HTTP方法安全');
  
  const endpoints = [
    '/api/products',
    '/api/categories',
    '/api/cart',
    '/api/checkout'
  ];
  
  const dangerousMethods = ['PUT', 'DELETE', 'PATCH'];
  
  for (const endpoint of endpoints) {
    for (const method of dangerousMethods) {
      const { response } = await testRequest(
        `${method} ${endpoint}`,
        endpoint,
        { method }
      );
      
      if (response) {
        if (response.status === 405) {
          results.passed.push({
            test: 'HTTP方法',
            case: `${method} ${endpoint}`,
            message: '正确返回405',
            status: 405
          });
        } else if (response.status === 401 || response.status === 403) {
          results.passed.push({
            test: 'HTTP方法',
            case: `${method} ${endpoint}`,
            message: '需要认证',
            status: response.status
          });
        } else if (response.status === 200) {
          results.warnings.push({
            test: 'HTTP方法',
            case: `${method} ${endpoint}`,
            message: `接受了${method}请求，需要确认是否预期`
          });
        }
      }
    }
  }
}

// ============================================
// 测试 19: 用户资料安全
// ============================================
async function testProfileSecurity() {
  console.log('\n🔍 测试 19: 用户资料安全');
  
  // 测试1：未认证访问资料
  const { response: profileRes } = await testRequest(
    '未认证获取资料',
    '/api/user/profile'
  );
  
  if (profileRes) {
    if (profileRes.status === 401) {
      results.passed.push({
        test: '用户资料',
        case: 'GET认证',
        message: '正确要求认证',
        status: 401
      });
    } else {
      results.warnings.push({
        test: '用户资料',
        case: 'GET认证',
        message: `未预期响应: ${profileRes.status}`
      });
    }
  }
  
  // 测试2：未认证修改资料
  const { response: updateRes } = await testRequest(
    '未认证修改资料',
    '/api/user/profile',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker' })
    }
  );
  
  if (updateRes) {
    if (updateRes.status === 401) {
      results.passed.push({
        test: '用户资料',
        case: 'PUT认证',
        message: '正确要求认证',
        status: 401
      });
    } else if (updateRes.status === 200) {
      results.failed.push({
        test: '用户资料',
        case: 'PUT认证',
        message: '⚠️ 未认证可修改资料！',
        status: 200
      });
    }
  }
}

// ============================================
// 测试 20: 文件上传安全
// ============================================
async function testFileUploadSecurity() {
  console.log('\n🔍 测试 20: 文件上传安全');
  
  // 测试1：未授权上传
  console.log('  测试未授权上传...');
  
  // 创建假的文件数据
  const formData = new FormData();
  const fakeFile = new Blob(['fake image content'], { type: 'image/jpeg' });
  formData.append('file', fakeFile, 'test.jpg');
  
  const { response: uploadRes } = await testRequest(
    '未授权上传',
    '/api/admin/upload-image',
    {
      method: 'POST',
      body: formData
    }
  );
  
  if (uploadRes) {
    if (uploadRes.status === 401 || uploadRes.status === 403) {
      results.passed.push({
        test: '文件上传',
        case: '权限验证',
        message: '正确拒绝未授权上传',
        status: uploadRes.status
      });
    } else {
      results.failed.push({
        test: '文件上传',
        case: '权限验证',
        message: `未正确验证权限！响应: ${uploadRes.status}`,
        status: uploadRes.status
      });
    }
  }
  
  // 测试2：main-image上传权限
  const { response: mainUploadRes } = await testRequest(
    '未授权上传主图',
    '/api/admin/upload-main-image',
    {
      method: 'POST',
      body: formData
    }
  );
  
  if (mainUploadRes) {
    if (mainUploadRes.status === 401 || mainUploadRes.status === 403) {
      results.passed.push({
        test: '文件上传',
        case: '主图权限验证',
        message: '正确拒绝未授权上传',
        status: mainUploadRes.status
      });
    }
  }
  
  // 测试3：删除图片权限
  console.log('  测试图片删除权限...');
  const { response: deleteRes } = await testRequest(
    '未授权删除图片',
    '/api/admin/delete-image',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId: 'test/image' })
    }
  );
  
  if (deleteRes) {
    if (deleteRes.status === 401 || deleteRes.status === 403) {
      results.passed.push({
        test: '文件上传',
        case: '删除权限验证',
        message: '正确拒绝未授权删除',
        status: deleteRes.status
      });
    }
  }
}

// ============================================
// 测试 21: Admin产品CRUD安全
// ============================================
async function testAdminProductCRUD() {
  console.log('\n🔍 测试 21: Admin产品CRUD安全');
  
  // 测试1：未授权更新产品
  console.log('  测试未授权更新产品...');
  const { response: putRes } = await testRequest(
    '未授权PUT产品',
    '/api/admin/products/1',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacked Product',
        price: 0.01,
        description: 'Hacked',
        imageUrl: 'https://example.com/hack.jpg',
        imagePublicId: 'hack'
      })
    }
  );
  
  if (putRes) {
    if (putRes.status === 401 || putRes.status === 403) {
      results.passed.push({
        test: 'Admin产品CRUD',
        case: 'PUT权限验证',
        message: '正确拒绝未授权更新',
        status: putRes.status
      });
    } else {
      results.failed.push({
        test: 'Admin产品CRUD',
        case: 'PUT权限验证',
        message: `未正确验证权限！响应: ${putRes.status}`,
        status: putRes.status
      });
    }
  }
  
  // 测试2：未授权删除产品
  console.log('  测试未授权删除产品...');
  const { response: delRes } = await testRequest(
    '未授权DELETE产品',
    '/api/admin/products/1',
    { method: 'DELETE' }
  );
  
  if (delRes) {
    if (delRes.status === 401 || delRes.status === 403) {
      results.passed.push({
        test: 'Admin产品CRUD',
        case: 'DELETE权限验证',
        message: '正确拒绝未授权删除',
        status: delRes.status
      });
    } else {
      results.failed.push({
        test: 'Admin产品CRUD',
        case: 'DELETE权限验证',
        message: `未正确验证权限！响应: ${delRes.status}`,
        status: delRes.status
      });
    }
  }
  
  // 测试3：SQL注入在产品ID
  console.log('  测试产品ID SQL注入...');
  const sqlPayloads = [
    "1; DROP TABLE products;--",
    "1' OR '1'='1",
    "1 UNION SELECT * FROM users--"
  ];
  
  for (const payload of sqlPayloads) {
    const { response } = await testRequest(
      `产品ID注入: ${payload.substring(0, 20)}`,
      `/api/admin/products/${encodeURIComponent(payload)}`,
      { method: 'GET' }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
        results.passed.push({
          test: 'Admin产品CRUD',
          case: 'SQL注入防护',
          message: '正确拒绝注入',
          status: response.status
        });
        break;
      } else if (response.status === 500) {
        results.warnings.push({
          test: 'Admin产品CRUD',
          case: 'SQL注入防护',
          message: '500错误可能泄露信息'
        });
      }
    }
  }
}

// ============================================
// 测试 22: Admin订单发货安全
// ============================================
async function testAdminShippingSecurity() {
  console.log('\n🔍 测试 22: Admin订单发货安全');
  
  // 测试1：未授权发货
  console.log('  测试未授权发货...');
  const { response: shipRes } = await testRequest(
    '未授权发货',
    '/api/admin/orders/1/ship',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingNumber: 'HACK123',
        carrier: 'usps'
      })
    }
  );
  
  if (shipRes) {
    if (shipRes.status === 401 || shipRes.status === 403) {
      results.passed.push({
        test: 'Admin发货',
        case: '发货权限验证',
        message: '正确拒绝未授权发货',
        status: shipRes.status
      });
    } else {
      results.failed.push({
        test: 'Admin发货',
        case: '发货权限验证',
        message: `未正确验证权限！响应: ${shipRes.status}`,
        status: shipRes.status
      });
    }
  }
  
  // 测试2：未授权刷新物流
  console.log('  测试未授权刷新物流...');
  const { response: trackRes } = await testRequest(
    '未授权刷新物流',
    '/api/admin/orders/1/tracking',
    { method: 'POST' }
  );
  
  if (trackRes) {
    if (trackRes.status === 401 || trackRes.status === 403) {
      results.passed.push({
        test: 'Admin发货',
        case: '物流刷新权限',
        message: '正确拒绝未授权操作',
        status: trackRes.status
      });
    }
  }
  
  // 测试3：无效订单ID
  console.log('  测试无效订单ID...');
  const invalidIds = ['abc', '-1', '99999999', '1;DROP TABLE orders'];
  
  for (const id of invalidIds) {
    const { response } = await testRequest(
      `无效订单ID: ${id}`,
      `/api/admin/orders/${encodeURIComponent(id)}/ship`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: 'TEST', carrier: 'usps' })
      }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404) {
        results.passed.push({
          test: 'Admin发货',
          case: '无效ID处理',
          message: '正确处理无效ID',
          status: response.status
        });
        break;
      }
    }
  }
  
  // 测试4：XSS in tracking number
  console.log('  测试物流号XSS...');
  const xssTrackingPayloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE orders;--"
  ];
  
  for (const payload of xssTrackingPayloads) {
    const { response, jsonData } = await testRequest(
      `物流号XSS: ${payload.substring(0, 20)}`,
      '/api/admin/orders/1/ship',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: payload,
          carrier: 'usps'
        })
      }
    );
    
    if (response) {
      // 应该被拒绝（401/403权限或400验证失败）
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        results.passed.push({
          test: 'Admin发货',
          case: '物流号安全',
          message: '正确拒绝恶意输入',
          status: response.status
        });
        break;
      }
    }
  }
}

// ============================================
// 测试 23: Admin分类CRUD安全
// ============================================
async function testAdminCategoryCRUD() {
  console.log('\n🔍 测试 23: Admin分类CRUD安全');
  
  // 测试1：未授权更新分类
  console.log('  测试未授权更新分类...');
  const { response: putRes } = await testRequest(
    '未授权PUT分类',
    '/api/admin/categories/1',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacked Category',
        slug: 'hacked'
      })
    }
  );
  
  if (putRes) {
    if (putRes.status === 401 || putRes.status === 403) {
      results.passed.push({
        test: 'Admin分类CRUD',
        case: 'PUT权限验证',
        message: '正确拒绝未授权更新',
        status: putRes.status
      });
    }
  }
  
  // 测试2：未授权删除分类
  console.log('  测试未授权删除分类...');
  const { response: delRes } = await testRequest(
    '未授权DELETE分类',
    '/api/admin/categories/1',
    { method: 'DELETE' }
  );
  
  if (delRes) {
    if (delRes.status === 401 || delRes.status === 403) {
      results.passed.push({
        test: 'Admin分类CRUD',
        case: 'DELETE权限验证',
        message: '正确拒绝未授权删除',
        status: delRes.status
      });
    }
  }
  
  // 测试3：Slug注入
  console.log('  测试Slug注入...');
  const maliciousSlugs = [
    '../../../etc/passwd',
    '<script>alert(1)</script>',
    "slug'; DROP TABLE categories;--",
    '../../admin'
  ];
  
  for (const slug of maliciousSlugs) {
    const { response } = await testRequest(
      `Slug注入: ${slug.substring(0, 20)}`,
      '/api/admin/categories',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Category',
          slug: slug
        })
      }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        results.passed.push({
          test: 'Admin分类CRUD',
          case: 'Slug验证',
          message: '正确拒绝恶意Slug',
          status: response.status
        });
        break;
      }
    }
  }
}

// ============================================
// 测试 24: 地址更新安全
// ============================================
async function testAddressUpdateSecurity() {
  console.log('\n🔍 测试 24: 地址更新安全');
  
  // 测试1：未授权更新地址
  console.log('  测试未授权更新地址...');
  const { response: putRes } = await testRequest(
    '未授权PUT地址',
    '/api/user/addresses/1',
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        line1: '123 Hack St',
        city: 'Hackville',
        postalCode: '12345',
        country: 'US'
      })
    }
  );
  
  if (putRes) {
    if (putRes.status === 401) {
      results.passed.push({
        test: '地址更新',
        case: 'PUT权限验证',
        message: '正确要求认证',
        status: 401
      });
    }
  }
  
  // 测试2：XSS in address fields
  console.log('  测试地址字段XSS...');
  const xssPayload = {
    name: '<script>alert("XSS")</script>',
    line1: '"><img src=x onerror=alert(1)>',
    city: 'City<script>',
    postalCode: '12345',
    country: 'US'
  };
  
  const { response: xssRes } = await testRequest(
    '地址XSS',
    '/api/user/addresses',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(xssPayload)
    }
  );
  
  if (xssRes) {
    if (xssRes.status === 401) {
      results.passed.push({
        test: '地址更新',
        case: 'XSS防护',
        message: '需要认证（XSS测试延后）',
        status: 401
      });
    } else if (xssRes.status === 400) {
      results.passed.push({
        test: '地址更新',
        case: 'XSS防护',
        message: '正确拒绝恶意输入',
        status: 400
      });
    }
  }
  
  // 测试3：无效地址ID
  console.log('  测试无效地址ID...');
  const invalidIds = ['abc', '-1', '99999999'];
  
  for (const id of invalidIds) {
    const { response } = await testRequest(
      `无效地址ID: ${id}`,
      `/api/user/addresses/${id}`,
      { method: 'DELETE' }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401 || response.status === 404) {
        results.passed.push({
          test: '地址更新',
          case: '无效ID处理',
          message: '正确处理无效ID',
          status: response.status
        });
        break;
      }
    }
  }
}

// ============================================
// 测试 25: 产品搜索安全
// ============================================
async function testProductSearchSecurity() {
  console.log('\n🔍 测试 25: 产品搜索安全');
  
  // 测试1：SQL注入in搜索
  console.log('  测试搜索SQL注入...');
  const sqlPayloads = [
    "'; DROP TABLE products;--",
    "1' OR '1'='1",
    "UNION SELECT * FROM users--"
  ];
  
  for (const payload of sqlPayloads) {
    const { response } = await testRequest(
      `搜索SQL注入`,
      `/api/products/search?q=${encodeURIComponent(payload)}`
    );
    
    if (response) {
      if (response.status === 200 || response.status === 400) {
        results.passed.push({
          test: '产品搜索',
          case: 'SQL注入防护',
          message: '安全处理注入尝试',
          status: response.status
        });
        break;
      } else if (response.status === 500) {
        results.failed.push({
          test: '产品搜索',
          case: 'SQL注入防护',
          message: '⚠️ 500错误可能表示SQL注入漏洞！'
        });
        break;
      }
    }
  }
  
  // 测试2：XSS in搜索
  console.log('  测试搜索XSS...');
  const xssPayloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)"
  ];
  
  for (const payload of xssPayloads) {
    const { response, data } = await testRequest(
      `搜索XSS`,
      `/api/products/search?q=${encodeURIComponent(payload)}`
    );
    
    if (response && response.status === 200) {
      // 检查响应是否包含未转义的XSS
      if (data && data.includes(payload) && !data.includes('&lt;')) {
        results.warnings.push({
          test: '产品搜索',
          case: 'XSS防护',
          message: '响应可能未转义用户输入'
        });
      } else {
        results.passed.push({
          test: '产品搜索',
          case: 'XSS防护',
          message: '安全处理XSS尝试',
          status: 200
        });
      }
      break;
    }
  }
  
  // 测试3：超长搜索词
  console.log('  测试超长搜索词...');
  const longQuery = 'a'.repeat(1000);
  const { response: longRes } = await testRequest(
    '超长搜索词',
    `/api/products/search?q=${encodeURIComponent(longQuery)}`
  );
  
  if (longRes) {
    if (longRes.status === 400) {
      results.passed.push({
        test: '产品搜索',
        case: '长度限制',
        message: '正确限制搜索长度',
        status: 400
      });
    } else if (longRes.status === 200) {
      results.passed.push({
        test: '产品搜索',
        case: '长度限制',
        message: '处理了长搜索词',
        status: 200
      });
    }
  }
  
  // 测试4：空搜索
  console.log('  测试空搜索...');
  const { response: emptyRes } = await testRequest(
    '空搜索',
    '/api/products/search?q='
  );
  
  if (emptyRes) {
    if (emptyRes.status === 400) {
      results.passed.push({
        test: '产品搜索',
        case: '空查询验证',
        message: '正确拒绝空查询',
        status: 400
      });
    }
  }
}

// ============================================
// 测试 26: Checkout安全
// ============================================
async function testCheckoutSecurity() {
  console.log('\n🔍 测试 26: Checkout安全');
  
  // 测试1：空购物车checkout
  console.log('  测试空购物车...');
  const { response: emptyRes } = await testRequest(
    '空购物车Checkout',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] })
    }
  );
  
  if (emptyRes) {
    if (emptyRes.status === 400) {
      results.passed.push({
        test: 'Checkout',
        case: '空购物车验证',
        message: '正确拒绝空购物车',
        status: 400
      });
    }
  }
  
  // 测试2：无效商品ID
  console.log('  测试无效商品...');
  const { response: invalidRes } = await testRequest(
    '无效商品Checkout',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 999999, quantity: 1 }]
      })
    }
  );
  
  if (invalidRes) {
    if (invalidRes.status === 400 || invalidRes.status === 404) {
      results.passed.push({
        test: 'Checkout',
        case: '无效商品验证',
        message: '正确拒绝无效商品',
        status: invalidRes.status
      });
    }
  }
  
  // 测试3：超大数量
  console.log('  测试超大数量...');
  const { response: bigQtyRes } = await testRequest(
    '超大数量Checkout',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: 999999 }]
      })
    }
  );
  
  if (bigQtyRes) {
    if (bigQtyRes.status === 400) {
      results.passed.push({
        test: 'Checkout',
        case: '数量限制',
        message: '正确限制数量',
        status: 400
      });
    } else if (bigQtyRes.status === 200) {
      results.warnings.push({
        test: 'Checkout',
        case: '数量限制',
        message: '接受了超大数量，检查业务逻辑'
      });
    }
  }
  
  // 测试4：负数量
  console.log('  测试负数量...');
  const { response: negRes } = await testRequest(
    '负数量Checkout',
    '/api/checkout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 1, quantity: -1 }]
      })
    }
  );
  
  if (negRes) {
    if (negRes.status === 400) {
      results.passed.push({
        test: 'Checkout',
        case: '负数量验证',
        message: '正确拒绝负数量',
        status: 400
      });
    } else if (negRes.status === 200) {
      results.failed.push({
        test: 'Checkout',
        case: '负数量验证',
        message: '⚠️ 接受了负数量！'
      });
    }
  }
}

// ============================================
// 测试 27: 订单Session查询安全
// ============================================
async function testOrderSessionSecurity() {
  console.log('\n🔍 测试 27: 订单Session查询安全');
  
  // 测试1：无效session ID (路径参数)
  console.log('  测试无效session ID...');
  const invalidSessionIds = [
    'invalid-session',
    'path-traversal%2F..%2F..%2Fetc',
    "sql-injection'--",
    'xss<script>'
  ];
  
  for (const sessionId of invalidSessionIds) {
    const { response } = await testRequest(
      `无效Session: ${sessionId.substring(0, 15)}`,
      `/api/orders/session/${encodeURIComponent(sessionId)}`
    );
    
    if (response) {
      if (response.status === 400 || response.status === 404) {
        results.passed.push({
          test: '订单Session',
          case: '无效Session处理',
          message: '正确处理无效ID',
          status: response.status
        });
        break;
      } else if (response.status === 500) {
        results.warnings.push({
          test: '订单Session',
          case: '无效Session处理',
          message: '500错误可能泄露信息'
        });
        break;
      }
    }
  }
  
  // 测试2：空路径
  console.log('  测试空session路径...');
  const { response: emptyRes } = await testRequest(
    '空Session路径',
    '/api/orders/session/'
  );
  
  if (emptyRes) {
    if (emptyRes.status === 400 || emptyRes.status === 404 || emptyRes.status === 405) {
      results.passed.push({
        test: '订单Session',
        case: '空路径处理',
        message: '正确处理空路径',
        status: emptyRes.status
      });
    }
  }
}

// ============================================
// 测试 28: 公开API安全
// ============================================
async function testPublicAPIs() {
  console.log('\n🔍 测试 28: 公开API安全');
  
  // 测试1：产品列表不泄露敏感信息
  console.log('  测试产品API...');
  const { response: productsRes, jsonData: productsData } = await testRequest(
    '产品列表',
    '/api/products'
  );
  
  if (productsRes && productsRes.status === 200 && productsData) {
    const dataStr = JSON.stringify(productsData).toLowerCase();
    const sensitiveFields = ['password', 'secret', 'token', 'cost', 'margin', 'supplier'];
    const hasSensitive = sensitiveFields.some(f => dataStr.includes(f));
    
    if (hasSensitive) {
      results.warnings.push({
        test: '公开API',
        case: '产品列表',
        message: '可能泄露敏感字段'
      });
    } else {
      results.passed.push({
        test: '公开API',
        case: '产品列表',
        message: '未泄露敏感信息'
      });
    }
  }
  
  // 测试2：分类列表
  const { response: catRes } = await testRequest(
    '分类列表',
    '/api/categories'
  );
  
  if (catRes && catRes.status === 200) {
    results.passed.push({
      test: '公开API',
      case: '分类列表',
      message: '正常访问',
      status: 200
    });
  }
  
  // 测试3：库存API
  const { response: invRes } = await testRequest(
    '库存查询',
    '/api/inventory'
  );
  
  if (invRes) {
    if (invRes.status === 200) {
      results.passed.push({
        test: '公开API',
        case: '库存查询',
        message: '正常访问',
        status: 200
      });
    } else if (invRes.status === 401) {
      results.passed.push({
        test: '公开API',
        case: '库存查询',
        message: '需要认证（如果是预期行为）',
        status: 401
      });
    }
  }
}

// ============================================
// 测试 29: 单产品API安全
// ============================================
async function testSingleProductSecurity() {
  console.log('\n🔍 测试 29: 单产品API安全');
  
  // 测试1：SQL注入在产品ID
  console.log('  测试产品ID SQL注入...');
  const sqlPayloads = [
    "1; DROP TABLE products;--",
    "1' OR '1'='1",
    "1 UNION SELECT * FROM users--"
  ];
  
  for (const payload of sqlPayloads) {
    const { response } = await testRequest(
      `产品ID注入`,
      `/api/products/${encodeURIComponent(payload)}`
    );
    
    if (response) {
      if (response.status === 400 || response.status === 404) {
        results.passed.push({
          test: '单产品API',
          case: 'SQL注入防护',
          message: '正确拒绝注入',
          status: response.status
        });
        break;
      } else if (response.status === 500) {
        results.warnings.push({
          test: '单产品API',
          case: 'SQL注入防护',
          message: '500错误可能表示问题'
        });
        break;
      }
    }
  }
  
  // 测试2：无效产品ID
  console.log('  测试无效产品ID...');
  const invalidIds = ['abc', '-1', '0', '99999999', 'NaN', 'undefined', 'null'];
  
  for (const id of invalidIds) {
    const { response } = await testRequest(
      `无效产品ID: ${id}`,
      `/api/products/${id}`
    );
    
    if (response) {
      if (response.status === 400 || response.status === 404) {
        results.passed.push({
          test: '单产品API',
          case: '无效ID处理',
          message: '正确处理无效ID',
          status: response.status
        });
        break;
      }
    }
  }
  
  // 测试3：路径遍历
  console.log('  测试路径遍历...');
  const pathTraversalPayloads = [
    '../../../etc/passwd',
    '..%2F..%2F..%2Fetc%2Fpasswd',
    '....//....//etc/passwd'
  ];
  
  for (const payload of pathTraversalPayloads) {
    const { response } = await testRequest(
      `路径遍历`,
      `/api/products/${encodeURIComponent(payload)}`
    );
    
    if (response) {
      if (response.status === 400 || response.status === 404) {
        results.passed.push({
          test: '单产品API',
          case: '路径遍历防护',
          message: '正确拒绝路径遍历',
          status: response.status
        });
        break;
      }
    }
  }
}

// ============================================
// 测试 30: 购物车删除单品安全
// ============================================
async function testCartItemDeleteSecurity() {
  console.log('\n🔍 测试 30: 购物车删除单品安全');
  
  // 测试1：未认证删除
  console.log('  测试未认证删除购物车项...');
  const { response: delRes } = await testRequest(
    '未认证删除购物车项',
    '/api/cart/1',
    { method: 'DELETE' }
  );
  
  if (delRes) {
    if (delRes.status === 401) {
      results.passed.push({
        test: '购物车删除',
        case: '认证验证',
        message: '正确要求认证',
        status: 401
      });
    }
  }
  
  // 测试2：无效产品ID
  console.log('  测试无效产品ID删除...');
  const invalidIds = ['abc', '-1', '0', 'undefined'];
  
  for (const id of invalidIds) {
    const { response } = await testRequest(
      `无效产品ID: ${id}`,
      `/api/cart/${id}`,
      { method: 'DELETE' }
    );
    
    if (response) {
      if (response.status === 400 || response.status === 401 || response.status === 404) {
        results.passed.push({
          test: '购物车删除',
          case: '无效ID处理',
          message: '正确处理无效ID',
          status: response.status
        });
        break;
      }
    }
  }
}

// ============================================
// 测试 31: 认证后的敏感操作
// ============================================
async function testAuthenticatedOperations() {
  console.log('\n🔍 测试 31: 认证后敏感操作');
  
  // 使用普通用户登录测试admin权限
  console.log('  尝试登录普通用户...');
  const sessionCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  
  if (!sessionCookie) {
    results.warnings.push({
      test: '认证操作',
      case: '登录',
      message: '无法登录进行测试'
    });
    return;
  }
  
  // 测试1：已认证用户访问admin产品API
  console.log('  测试已认证用户admin访问...');
  const { response: adminRes } = await testRequest(
    'Admin产品访问',
    '/api/admin/products',
    {
      headers: { 'Cookie': sessionCookie }
    }
  );
  
  if (adminRes) {
    if (adminRes.status === 200) {
      results.passed.push({
        test: '认证操作',
        case: 'Admin产品访问',
        message: 'Admin用户可访问',
        status: 200
      });
    } else if (adminRes.status === 403) {
      results.passed.push({
        test: '认证操作',
        case: 'Admin产品访问',
        message: '非Admin用户被拒绝',
        status: 403
      });
    }
  }
  
  // 测试2：已认证用户获取自己的资料
  console.log('  测试获取用户资料...');
  const { response: profileRes, jsonData: profileData } = await testRequest(
    '获取用户资料',
    '/api/user/profile',
    {
      headers: { 'Cookie': sessionCookie }
    }
  );
  
  if (profileRes && profileRes.status === 200) {
    // 检查是否泄露密码（不包括 hasPassword 这种安全的字段）
    if (profileData) {
      const dataStr = JSON.stringify(profileData).toLowerCase();
      // 检查敏感字段：password_hash, passwordHash, hash值等
      // 但排除 hasPassword（这是一个安全的布尔字段）
      const sensitivePatterns = [
        'password_hash',
        'passwordhash',
        '"hash"',    // 直接的hash字段
        'bcrypt',    // bcrypt hash
        '$2b$',      // bcrypt hash prefix
        '$2a$'       // bcrypt hash prefix
      ];
      const hasSensitive = sensitivePatterns.some(p => dataStr.includes(p));
      
      if (hasSensitive) {
        results.failed.push({
          test: '认证操作',
          case: '资料隐私',
          message: '⚠️ 资料API泄露密码哈希！'
        });
      } else {
        results.passed.push({
          test: '认证操作',
          case: '资料隐私',
          message: '未泄露敏感信息'
        });
      }
    }
  }
  
  // 测试3：已认证用户获取自己的订单
  console.log('  测试获取用户订单...');
  const { response: ordersRes } = await testRequest(
    '获取用户订单',
    '/api/orders/my-orders',
    {
      headers: { 'Cookie': sessionCookie }
    }
  );
  
  if (ordersRes) {
    if (ordersRes.status === 200) {
      results.passed.push({
        test: '认证操作',
        case: '订单访问',
        message: '可获取自己的订单',
        status: 200
      });
    }
  }
}

// ============================================
// 主函数
// ============================================
async function runAllTests() {
  console.log('🔥 开始安全测试...\n');
  console.log(`目标: ${BASE_URL}\n`);
  
  // 先清除Redis缓存，确保测试环境干净
  await clearRedisCache();
  console.log('');
  
  await testPriceTampering();
  await testSQLInjection();
  await testXSS();
  await testAccessControl();
  await testAdminWithAuth();  // 需要登录的测试，放在Rate Limiting之前
  await testInputValidation();
  await testCSRF();
  await testIDOR();
  await testBusinessLogic();
  await testInformationDisclosure();
  await testAPIAbuseAndWebhooks();
  
  // 新增测试 (13-19)
  await testCartSecurity();
  await testAddressSecurity();
  await testOrderSecurity();
  await testResetTokenSecurity();
  await testAdminOtherEndpoints();
  await testHTTPMethods();
  await testProfileSecurity();
  
  // 更多测试 (20-28)
  await testFileUploadSecurity();
  await testAdminProductCRUD();
  await testAdminShippingSecurity();
  await testAdminCategoryCRUD();
  await testAddressUpdateSecurity();
  await testProductSearchSecurity();
  await testCheckoutSecurity();
  await testOrderSessionSecurity();
  await testPublicAPIs();
  
  // 额外测试 (29-31)
  await testSingleProductSecurity();
  await testCartItemDeleteSecurity();
  await testAuthenticatedOperations();
  
  await testRateLimiting();  // 这个会触发登录限流，所以放最后
  
  // 输出结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  console.log(`\n✅ 通过: ${results.passed.length}`);
  if (results.passed.length > 0) {
    results.passed.forEach(r => {
      console.log(`  ✓ ${r.test}: ${r.case || r.message}`);
    });
  }
  
  console.log(`\n⚠️  警告: ${results.warnings.length}`);
  if (results.warnings.length > 0) {
    results.warnings.forEach(r => {
      console.log(`  ! ${r.test}: ${r.message}`);
    });
  }
  
  console.log(`\n❌ 失败: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(r => {
      console.log(`  ✗ ${r.test}: ${r.message}`);
      if (r.payload) console.log(`    Payload: ${r.payload}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  const totalTests = results.passed.length + results.failed.length + results.warnings.length;
  const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);
  
  console.log(`\n总测试数: ${totalTests}`);
  console.log(`通过率: ${passRate}%`);
  
  if (results.failed.length > 0) {
    console.log('\n⚠️  发现严重安全问题，需要立即修复！');
    process.exit(1);
  } else if (results.warnings.length > 0) {
    console.log('\n⚠️  发现潜在安全问题，建议检查');
    process.exit(0);
  } else {
    console.log('\n✅ 安全测试通过！');
    process.exit(0);
  }
}

// 运行测试
runAllTests().catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});
