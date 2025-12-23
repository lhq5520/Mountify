# 🔥 Mountify 完整测试套件

**专业级测试方案 - 狠狠鞭打你的项目，找出所有潜在问题！**

---

## 📋 目录

- [测试内容](#-测试内容)
- [快速开始](#-快速开始)
- [详细使用](#-详细使用)
- [测试工具安装](#-测试工具安装)
- [环境变量配置](#-环境变量配置)
- [报告解读](#-报告解读)
- [CI/CD 集成](#-cicd-集成)
- [常见问题](#-常见问题)

---

## 🎯 测试内容

### 1. **数据完整性检查** (SQL)
- 订单金额一致性
- 孤立记录检测
- 外键引用完整性
- 库存负数检查
- Stripe 数据一致性
- 业务逻辑验证

### 2. **安全渗透测试** (Node.js)
- 价格篡改攻击
- SQL 注入测试
- XSS 跨站脚本
- 权限提升测试
- Rate Limiting 验证
- 输入验证检查
- CSRF 保护测试

### 3. **性能压力测试**
- **Artillery**: 真实用户行为模拟（浏览、搜索、购物）
- **K6**: 高并发压力测试（支持 100-200 并发用户）
- 响应时间分析
- 错误率统计
- 数据库连接池测试

### 4. **E2E 端到端测试** (Playwright)
- 完整购物流程（浏览 → 加购 → 结账 → 支付）
- 用户认证流程（注册、登录、OAuth）
- 搜索和筛选功能
- Admin 管理功能
- 响应式设计测试
- 错误处理测试

### 5. **Lighthouse 审计** (可选)
- 性能评分
- 可访问性
- 最佳实践
- SEO 优化

---

## 🚀 快速开始

### 最简单方式 - 运行全部测试

```bash
# 1. 克隆测试套件到项目根目录
cd your-project-root
cp -r testing-suite .

# 2. 进入测试目录
cd testing-suite

# 3. 设置环境变量
export TEST_URL="http://localhost:3000"
export DATABASE_URL="your_database_connection_string"

# 4. 运行所有测试
bash run-all-tests.sh
```

**就这么简单！脚本会自动运行所有测试并生成报告。**

---

## 📝 详细使用

### 方法 1: 运行完整套件（推荐）

```bash
# 一键运行所有测试
bash run-all-tests.sh

# 查看汇总报告
open reports/index.html
```

### 方法 2: 单独运行各个测试

#### 安全测试

```bash
# 基础运行
node security/security-tests.js

# 指定目标 URL
TEST_URL=https://your-app.vercel.app node security/security-tests.js
```

#### 性能测试

```bash
# Artillery - 真实用户模拟
TEST_URL=http://localhost:3000 artillery run performance/artillery-load-test.yml

# K6 - 压力测试
TEST_URL=http://localhost:3000 k6 run performance/k6-load-test.js

# K6 - 快速压力测试（1 分钟冲到 500 用户）
k6 run --stage "1m:500" performance/k6-load-test.js
```

#### E2E 测试

```bash
# 所有浏览器
npx playwright test

# 只运行 Chrome
npx playwright test --project=chromium

# 调试模式（可视化）
npx playwright test --ui

# 带浏览器窗口
npx playwright test --headed

# 运行特定测试
npx playwright test shopping-flow

# 查看报告
npx playwright show-report
```

#### 数据完整性

```bash
# 直接运行 SQL
psql $DATABASE_URL -f data-integrity/integrity-checks.sql

# 保存结果到文件
psql $DATABASE_URL -f data-integrity/integrity-checks.sql > results.txt
```

#### Lighthouse

```bash
# 审计首页
lighthouse http://localhost:3000 --view

# 只测试性能
lighthouse http://localhost:3000 --only-categories=performance

# 输出到文件
lighthouse http://localhost:3000 --output=html --output-path=report.html
```

---

## 🛠️ 测试工具安装

### 必需工具

```bash
# Node.js (v18+)
node --version

# PostgreSQL 客户端
psql --version
```

### 可选工具（按需安装）

#### Playwright (E2E 测试)

```bash
npm install -D @playwright/test
npx playwright install --with-deps
```

#### Artillery (负载测试)

```bash
npm install -g artillery

# 验证安装
artillery version
```

#### K6 (压力测试)

```bash
# macOS
brew install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# 验证安装
k6 version
```

#### Lighthouse (性能审计)

```bash
npm install -g lighthouse

# 验证安装
lighthouse --version
```

### 快速安装所有工具

```bash
npm run install:tools
```

---

## ⚙️ 环境变量配置

创建 `.env` 文件或在运行时设置：

```bash
# 测试目标 URL
export TEST_URL="http://localhost:3000"

# 数据库连接（用于完整性检查）
export DATABASE_URL="postgresql://user:pass@host:5432/database"

# Admin 账号（用于 E2E 测试）
export ADMIN_EMAIL="admin@test.com"
export ADMIN_PASSWORD="admin123"

# Stripe 测试密钥（如果需要）
export STRIPE_SECRET_KEY="sk_test_..."
```

---

## 📊 报告解读

### 目录结构

```
reports/
├── index.html              # 汇总报告（在浏览器打开）
├── security/
│   └── results.txt         # 安全测试详细结果
├── performance/
│   ├── artillery-results.json
│   └── k6-results.json
├── e2e/
│   └── index.html          # Playwright 报告
├── data-integrity/
│   └── results.txt         # 数据库检查结果
└── lighthouse/
    ├── homepage.html
    └── products.html
```

### 如何看报告

#### 1. 安全测试

```bash
cat reports/security/results.txt
```

**关注：**
- ❌ 失败项 - 必须立即修复！
- ⚠️ 警告项 - 建议修复
- ✅ 通过项 - 继续保持

**常见问题：**
- `价格篡改` - 后端未验证价格
- `SQL注入` - 未使用参数化查询
- `权限提升` - 访问控制不严格

#### 2. 性能测试

**Artillery 报告关键指标：**
- `http.codes.200`: 成功请求数（应该最多）
- `http.codes.500`: 服务器错误（应该为 0）
- `p95`: 95% 请求响应时间（< 2000ms 为好）
- `errors`: 业务错误数（应该很少）

**K6 报告关键指标：**
- `http_req_duration`: 响应时间
  - p(95) < 2000ms ✅
  - p(99) < 5000ms ✅
- `http_req_failed`: 错误率
  - rate < 1% ✅

**如果测试失败：**
- 检查数据库连接池是否足够
- 检查是否有慢查询
- 检查 Redis 缓存是否生效
- 考虑增加服务器资源

#### 3. E2E 测试

打开 `reports/e2e/index.html`：
- 绿色 ✅ - 测试通过
- 红色 ❌ - 测试失败（点击查看截图和视频）
- 黄色 ⚠️ - 测试跳过

**失败时的调试：**
1. 点击失败的测试
2. 查看截图（显示失败时的页面状态）
3. 查看视频（重现失败过程）
4. 查看 trace（完整的交互记录）

#### 4. 数据完整性

```sql
-- 查看有问题的查询
cat reports/data-integrity/results.txt | grep "rows"
```

**应该返回 0 行的检查：**
- 订单金额不匹配
- 孤立的记录
- 负数库存
- 重复的唯一字段

**可能有数据的检查（仅供参考）：**
- 低库存产品
- 长时间 pending 的订单
- 异常高价订单

---

## 🔄 CI/CD 集成

### GitHub Actions

创建 `.github/workflows/test.yml`：

```yaml
name: Full Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd testing-suite && npm install
      
      - name: Run security tests
        run: |
          cd testing-suite
          TEST_URL=${{ secrets.TEST_URL }} node security/security-tests.js
      
      - name: Run E2E tests
        run: |
          cd testing-suite
          npx playwright install --with-deps
          TEST_URL=${{ secrets.TEST_URL }} npx playwright test
      
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: testing-suite/reports/
```

### Vercel 部署后自动测试

创建 `vercel-test-hook.sh`：

```bash
#!/bin/bash
# Vercel 部署后运行测试

DEPLOYMENT_URL=$1

# 等待部署完成
sleep 30

# 运行测试
cd testing-suite
TEST_URL=$DEPLOYMENT_URL bash run-all-tests.sh

# 发送通知（可选）
if [ $? -ne 0 ]; then
    # 发送 Slack 通知或邮件
    echo "Tests failed for $DEPLOYMENT_URL"
fi
```

---

## ❓ 常见问题

### Q: 测试需要多长时间？

**A: 完整套件约 25-30 分钟**
- 安全测试: 2-3 分钟
- 性能测试: 15-20 分钟
- E2E 测试: 5-10 分钟
- 数据检查: < 1 分钟

**快速测试（5 分钟）:**
```bash
node security/security-tests.js
npx playwright test --project=chromium tests/shopping-flow.spec.ts
```

### Q: 可以在生产环境运行吗？

**A: 部分可以，部分不行**
- ✅ 可以: 数据完整性检查、Lighthouse
- ❌ 不行: 性能压力测试（会造成大量负载）
- ⚠️ 谨慎: 安全测试（可能触发 rate limiting）

**建议**: 在 staging 环境运行完整测试。

### Q: 性能测试失败怎么办？

**A: 检查瓶颈**

1. **数据库慢查询**
   ```sql
   SELECT query, calls, mean_exec_time 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

2. **缺少索引**
   - 查看 `data-integrity/integrity-checks.sql` 的索引检查

3. **缓存未生效**
   - 检查 Redis 配置
   - 查看缓存命中率

4. **服务器资源不足**
   - 升级 Vercel plan
   - 增加数据库连接数

### Q: E2E 测试不稳定？

**A: 常见原因和解决方案**

1. **元素加载慢**
   ```typescript
   // 增加等待时间
   await page.waitForSelector('[data-testid="product-card"]', { 
     timeout: 10000 
   });
   ```

2. **网络问题**
   ```typescript
   // 设置重试
   test.describe.configure({ retries: 2 });
   ```

3. **Stripe 超时**
   - 使用更长的超时时间
   - 检查 Stripe 测试卡是否正确

### Q: 如何只测试特定功能？

**A: 使用标签和过滤**

```bash
# 只测试购物流程
npx playwright test shopping

# 只测试 Admin 功能
npx playwright test --grep "Admin"

# 跳过慢速测试
npx playwright test --grep-invert "slow"
```

### Q: 测试通过但生产还是有问题？

**A: 可能的原因**

1. **环境差异**
   - 检查生产环境变量
   - 验证数据库连接
   - 确认 Redis 配置

2. **数据量差异**
   - 测试环境数据少
   - 生产环境查询慢

3. **外部依赖**
   - Stripe webhook 配置
   - Cloudinary API key
   - Email 服务配置

**建议**: 在 staging 环境使用生产数据的副本测试。

---

## 📚 最佳实践

### 1. 定期运行测试

```bash
# 每次代码提交前
bash run-all-tests.sh

# 每天自动运行（cron）
0 2 * * * cd /path/to/project/testing-suite && bash run-all-tests.sh
```

### 2. 持续改进

- 每次发现 bug，添加对应的测试
- 性能下降时，调查原因
- 定期更新测试数据

### 3. 团队协作

- 分享测试报告
- 记录已知问题
- 制定修复优先级

### 4. 监控趋势

```bash
# 保存历史报告
cp reports/performance/k6-results.json reports/history/$(date +%Y%m%d).json

# 对比趋势
python analyze-trends.py
```

---

## 🎓 测试策略建议

### 开发阶段
- 快速测试（安全 + 关键 E2E）
- 本地运行
- 5 分钟完成

### Pull Request
- 中等测试（安全 + E2E + 轻量性能）
- CI/CD 自动运行
- 15 分钟完成

### 发布前
- 完整测试套件
- Staging 环境
- 30 分钟完成

### 生产监控
- 只运行数据完整性检查
- 定期 Lighthouse 审计
- 不运行压力测试

---

## 📞 支持

遇到问题？

1. 查看 [常见问题](#-常见问题)
2. 检查测试工具版本
3. 查看详细错误日志
4. 搜索相关文档

---

## 📄 许可

MIT License - 自由使用和修改

---

**祝测试顺利！** 🚀

记住：**测试不是为了找茬，而是为了让产品更好！**
