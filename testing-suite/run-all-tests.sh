#!/bin/bash

# ============================================
# 完整测试套件运行脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Windows / WSL 路径补全：尝试加入常见的 Node.js/PostgreSQL/NPM 全局目录到 PATH
case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
        USER_NAME="${USERNAME:-$USER}"
        PATH_NODE="/c/Program Files/nodejs:/c/Program Files (x86)/nodejs:/c/Users/${USER_NAME}/AppData/Local/Programs/nodejs"
        PATH_NPM_GLOBAL="/c/Users/${USER_NAME}/AppData/Roaming/npm"
        PATH_PSQL=""
        for d in /c/Program\ Files/PostgreSQL/*/bin; do
            [ -d "$d" ] && PATH_PSQL="$PATH_PSQL:$d"
        done
        export PATH="$PATH:$PATH_NODE:$PATH_PSQL:$PATH_NPM_GLOBAL"
        ;;
    Linux*)
        # 兼容 WSL 下使用 Windows 安装的 node/npm/psql
        if grep -qi microsoft /proc/version 2>/dev/null; then
            USER_NAME="${USERNAME:-$USER}"
            PATH_NODE="/mnt/c/Program Files/nodejs:/mnt/c/Program Files (x86)/nodejs:/mnt/c/Users/${USER_NAME}/AppData/Local/Programs/nodejs"
            PATH_NPM_GLOBAL="/mnt/c/Users/${USER_NAME}/AppData/Roaming/npm"
            PATH_PSQL=""
            for d in /mnt/c/Program\ Files/PostgreSQL/*/bin; do
                [ -d "$d" ] && PATH_PSQL="$PATH_PSQL:$d"
            done
            export PATH="$PATH:$PATH_NODE:$PATH_PSQL:$PATH_NPM_GLOBAL"
        fi
        ;;
esac

# 自动加载上级 .env.test（当未显式设置关键变量时）
if [ -z "${TEST_URL:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
    if [ -f "../.env.test" ]; then
        echo -e "${YELLOW}未检测到部分环境变量，尝试自动加载 ../.env.test${NC}"
        # 规范化并加载（去除 CR、忽略注释/空行、修剪 KEY=VALUE 两侧空白）
        __ENV_TMP=".env.autoload.$$"
        sed -e 's/\r$//' ../.env.test | \
            awk -F= '
                /^[[:space:]]*#/ { next }
                /^[[:space:]]*$/ { next }
                /^[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=/ {
                    key=$1; sub(/^[ \t]+|[ \t]+$/, "", key)
                    $1=""; val=substr($0, index($0,"=")+1)
                    sub(/^[ \t]+/, "", val)
                    print key"="val
                }' > "$__ENV_TMP"
        set -a
        . "$__ENV_TMP"
        set +a
        rm -f "$__ENV_TMP"
    fi
fi

# 配置
TEST_URL="${TEST_URL:-http://localhost:3000}"
DATABASE_URL="${DATABASE_URL:-}"
# 纠正常见的连接串空格错误（例如 "sslmode require" -> "sslmode=require"）
DATABASE_URL="${DATABASE_URL//sslmode require/sslmode=require}"
DATABASE_URL="${DATABASE_URL//channel_binding require/channel_binding=require}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@test.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         🔥 完整测试套件 - 狠狠鞭打项目 🔥                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}测试目标: ${TEST_URL}${NC}\n"

# 创建报告目录（包含可能使用到的子目录）
mkdir -p reports/{security,performance,e2e,data-integrity,lighthouse}

# ============================================
# 1. 数据完整性检查
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}1️⃣  数据完整性检查${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  未设置 DATABASE_URL，跳过数据库检查${NC}"
else
    if command -v psql >/dev/null 2>&1; then
        echo "运行数据完整性检查..."
        set +e
        psql "$DATABASE_URL" -f data-integrity/integrity-checks.sql > reports/data-integrity/results.txt 2>&1
        PSQL_EXIT=$?
        set -e
        if [ $PSQL_EXIT -eq 0 ]; then
            echo -e "${GREEN}✅ 数据完整性检查完成${NC}"
        else
            echo -e "${YELLOW}⚠️  数据完整性检查未完成（psql 返回 $PSQL_EXIT），继续后续测试${NC}"
            echo "详细结果: reports/data-integrity/results.txt"
        fi
    else
        echo -e "${YELLOW}⚠️  未检测到 psql，跳过数据库检查${NC}"
        echo "安装提示: Windows 可安装 PostgreSQL 客户端或用 WSL 运行 psql"
    fi
fi

# ============================================
# 2. 安全测试
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}2️⃣  安全渗透测试${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

SECURITY_EXIT_CODE=0
if command -v node >/dev/null 2>&1; then
    echo "运行安全测试..."
    node security/security-tests.js > reports/security/results.txt 2>&1
    SECURITY_EXIT_CODE=$?
    if [ $SECURITY_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ 安全测试通过${NC}"
    elif [ $SECURITY_EXIT_CODE -eq 1 ]; then
        echo -e "${RED}❌ 发现严重安全漏洞！${NC}"
        echo "详细结果: reports/security/results.txt"
        cat reports/security/results.txt
        exit 1
    else
        echo -e "${YELLOW}⚠️  安全测试有警告${NC}"
        echo "详细结果: reports/security/results.txt"
    fi
else
    echo -e "${YELLOW}⚠️  未检测到 Node.js，跳过安全测试${NC}"
    echo "请安装 Node 18+ 后重试"
fi

# ============================================
# 3. 性能测试
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}3️⃣  性能压力测试${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# 检查是否安装了测试工具
if command -v artillery &> /dev/null; then
    echo "运行 Artillery 负载测试..."
    TEST_URL=$TEST_URL artillery run performance/artillery-load-test.yml \
        --output reports/performance/artillery-results.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Artillery 测试完成${NC}"
    else
        echo -e "${YELLOW}⚠️  Artillery 测试有问题${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Artillery 未安装，跳过${NC}"
    echo "安装命令: npm install -g artillery"
fi

if command -v k6 &> /dev/null; then
    echo "运行 K6 压力测试..."
    TEST_URL=$TEST_URL k6 run performance/k6-load-test.js \
        --out json=reports/performance/k6-results.json
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ K6 测试完成${NC}"
    else
        echo -e "${YELLOW}⚠️  K6 测试有问题（可能是性能阈值未达标）${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  K6 未安装，跳过${NC}"
    echo "安装命令: brew install k6  (macOS)"
fi

# ============================================
# 4. E2E 自动化测试
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}4️⃣  E2E 端到端测试${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

if command -v playwright &> /dev/null || [ -f "node_modules/.bin/playwright" ]; then
    echo "运行 Playwright E2E 测试..."
    
    # 安装浏览器（如果需要）
    npx playwright install
    
    # 运行测试
    TEST_URL=$TEST_URL npx playwright test -c e2e/playwright.config.ts \
        --reporter=html \
        --reporter=json \
        --output=reports/e2e
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ E2E 测试通过${NC}"
    else
        echo -e "${RED}❌ E2E 测试失败${NC}"
        echo "查看报告: npx playwright show-report reports/e2e"
    fi
else
    echo -e "${YELLOW}⚠️  Playwright 未安装，跳过${NC}"
    echo "安装命令: npm install -D @playwright/test"
fi

# ============================================
# 5. Lighthouse 性能审计（可选）
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}5️⃣  Lighthouse 性能审计${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

if command -v lighthouse &> /dev/null; then
    echo "运行 Lighthouse 审计..."
    
    # 首页
    lighthouse $TEST_URL \
        --only-categories=performance,accessibility,best-practices,seo \
        --output=html \
        --output-path=reports/lighthouse/homepage.html \
        --chrome-flags="--headless"
    
    # 产品页
    lighthouse $TEST_URL/products \
        --only-categories=performance,accessibility,best-practices \
        --output=html \
        --output-path=reports/lighthouse/products.html \
        --chrome-flags="--headless"
    
    echo -e "${GREEN}✅ Lighthouse 审计完成${NC}"
    echo "报告位置: reports/lighthouse/"
else
    echo -e "${YELLOW}⚠️  Lighthouse 未安装，跳过${NC}"
    echo "安装命令: npm install -g lighthouse"
fi

# ============================================
# 总结报告
# ============================================

echo -e "\n${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 测试总结${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

echo "测试报告已生成，位置: ./reports/"
echo ""
echo "详细报告:"
echo "  - 数据完整性: reports/data-integrity/results.txt"
echo "  - 安全测试:   reports/security/results.txt"
echo "  - 性能测试:   reports/performance/"
echo "  - E2E 测试:   reports/e2e/"
echo "  - Lighthouse: reports/lighthouse/"

# 生成汇总 HTML 报告
cat > reports/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>测试报告总览</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007bff;
            padding-bottom: 10px;
        }
        .section {
            background: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-top: 0;
            color: #007bff;
        }
        a {
            color: #007bff;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
        }
        .status.pass { background: #d4edda; color: #155724; }
        .status.fail { background: #f8d7da; color: #721c24; }
        .status.warn { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <h1>🔥 完整测试报告</h1>
    
    <div class="section">
        <h2>📋 测试概览</h2>
        <p><strong>测试时间:</strong> <script>document.write(new Date().toLocaleString())</script></p>
        <p><strong>测试目标:</strong> ' + $TEST_URL + '</p>
    </div>
    
    <div class="section">
        <h2>1️⃣ 数据完整性检查</h2>
        <p><a href="data-integrity/results.txt" target="_blank">查看详细结果</a></p>
    </div>
    
    <div class="section">
        <h2>2️⃣ 安全渗透测试</h2>
        <p><a href="security/results.txt" target="_blank">查看详细结果</a></p>
    </div>
    
    <div class="section">
        <h2>3️⃣ 性能压力测试</h2>
        <ul>
            <li><a href="performance/artillery-results.json" target="_blank">Artillery 结果</a></li>
            <li><a href="performance/k6-results.json" target="_blank">K6 结果</a></li>
        </ul>
    </div>
    
    <div class="section">
        <h2>4️⃣ E2E 端到端测试</h2>
        <p><a href="e2e/index.html" target="_blank">查看 Playwright 报告</a></p>
    </div>
    
    <div class="section">
        <h2>5️⃣ Lighthouse 性能审计</h2>
        <ul>
            <li><a href="lighthouse/homepage.html" target="_blank">首页审计</a></li>
            <li><a href="lighthouse/products.html" target="_blank">产品页审计</a></li>
        </ul>
    </div>
</body>
</html>
EOF

echo -e "\n${GREEN}✅ 完整测试套件执行完毕！${NC}"
echo -e "${BLUE}打开汇总报告: file://$(pwd)/reports/index.html${NC}\n"

# 如果有严重错误，返回失败状态
if [ $SECURITY_EXIT_CODE -eq 1 ]; then
    exit 1
fi

exit 0
