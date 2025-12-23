# 🚀 测试套件速查表

**打印这一页，贴在显示器旁边！**

---

## 最常用命令

```bash
# 🔥 运行所有测试（25-30 分钟）
bash run-all-tests.sh

# ⚡ 快速测试（5 分钟）
node security/security-tests.js && npx playwright test --project=chromium

# 📊 查看报告
open reports/index.html
```

---

## 环境变量（必设）

```bash
export TEST_URL="http://localhost:3000"
export DATABASE_URL="postgresql://..."
```

---

## 单独运行各测试

| 测试类型 | 命令 | 时间 |
|---------|------|------|
| **安全** | `node security/security-tests.js` | 2 分钟 |
| **性能** | `artillery run performance/artillery-load-test.yml` | 15 分钟 |
| **压力** | `k6 run performance/k6-load-test.js` | 20 分钟 |
| **E2E** | `npx playwright test` | 10 分钟 |
| **数据** | `psql $DATABASE_URL -f data-integrity/integrity-checks.sql` | 1 分钟 |

---

## E2E 测试快捷键

```bash
# 可视化调试
npx playwright test --ui

# 只跑一个测试
npx playwright test shopping-flow

# 只跑 Chrome
npx playwright test --project=chromium

# 查看报告
npx playwright show-report
```

---

## 判断标准

### ✅ 通过条件

- 安全测试: 0 个失败
- 性能测试: p95 < 2000ms，错误率 < 1%
- E2E 测试: 所有测试通过
- 数据完整性: 关键检查返回 0 行

### ⚠️ 警告但可接受

- 个别性能测试接近阈值
- 少量非关键数据异常
- 部分可选功能测试失败

### ❌ 不可上线

- 任何安全测试失败
- 核心购物流程 E2E 失败
- 数据完整性严重问题
- 错误率 > 5%

---

## 快速问题排查

### 安全测试失败

```bash
# 查看详细结果
cat reports/security/results.txt

# 常见问题：
# 1. 价格篡改 → 后端验证价格
# 2. SQL注入 → 参数化查询
# 3. 权限提升 → 检查 auth 中间件
```

### 性能测试失败

```bash
# 检查慢查询
psql $DATABASE_URL -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 常见问题：
# 1. 响应慢 → 加索引
# 2. 高错误率 → 检查连接池
# 3. 超时 → 增加资源
```

### E2E 测试失败

```bash
# 查看失败截图
open test-results/

# 常见问题：
# 1. 元素找不到 → 检查 data-testid
# 2. 超时 → 增加 waitForSelector timeout
# 3. Stripe 失败 → 检查测试卡号
```

---

## Stripe 测试卡

```
成功: 4242 4242 4242 4242
失败: 4000 0000 0000 0002
3DS: 4000 0025 0000 3155
```

---

## 报告位置

```
reports/
├── index.html          ← 打开这个！
├── security/results.txt
├── performance/
├── e2e/index.html
└── data-integrity/results.txt
```

---

## 紧急情况

### 发现严重安全漏洞

```bash
# 1. 停止部署
# 2. 查看详细结果
cat reports/security/results.txt

# 3. 立即修复
# 4. 重新测试
node security/security-tests.js

# 5. 确认通过后才部署
```

### 生产环境崩溃

```bash
# 1. 回滚到上个版本
vercel rollback

# 2. 在本地复现
TEST_URL=https://your-app.vercel.app bash run-all-tests.sh

# 3. 查看数据库状态
psql $DATABASE_URL -f data-integrity/integrity-checks.sql

# 4. 修复并重新测试
```

---

## 工具安装（首次使用）

```bash
# Playwright
npm install -D @playwright/test
npx playwright install --with-deps

# Artillery
npm install -g artillery

# K6 (macOS)
brew install k6

# Lighthouse
npm install -g lighthouse
```

---

## 测试频率建议

| 时机 | 运行测试 | 说明 |
|-----|---------|------|
| **每次 commit** | 安全 + 快速 E2E | 5 分钟 |
| **Pull Request** | 完整测试 | 30 分钟 |
| **发布前** | 完整测试 + 手动验证 | 1 小时 |
| **每周** | 生产环境数据检查 | 5 分钟 |

---

## 救命命令

```bash
# 杀掉卡住的测试进程
pkill -9 node
pkill -9 playwright

# 清空所有报告
npm run clean

# 重新安装所有工具
npm run install:tools

# 查看测试进程
ps aux | grep -E "node|playwright|artillery|k6"
```

---

**记住：测试是朋友，不是敌人！** ✨

**每次测试通过，就离完美更近一步！** 🎯
