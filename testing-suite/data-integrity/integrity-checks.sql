-- ============================================
-- 数据完整性检查脚本
-- 验证数据库一致性、约束和业务逻辑
-- ============================================

\echo '🔍 开始数据完整性检查...\n'

-- ============================================
-- 1. 订单数据完整性
-- ============================================

\echo '=== 1. 订单数据完整性 ==='

-- 1.1 检查订单金额是否等于订单项总和
\echo '检查 1.1: 订单金额是否正确...'
SELECT 
    o.id as order_id,
    o.total as recorded_total,
    COALESCE(SUM(oi.quantity * oi.price), 0) as calculated_total,
    o.total - COALESCE(SUM(oi.quantity * oi.price), 0) as difference
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.total
HAVING o.total != COALESCE(SUM(oi.quantity * oi.price), 0);

\echo '  ✓ 应该返回 0 行（所有订单金额正确）\n'

-- 1.2 检查孤立的订单项（订单被删除但 items 还在）
\echo '检查 1.2: 孤立的订单项...'
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;

\echo '  ✓ 应该返回 0 行（没有孤立的订单项）\n'

-- 1.3 检查孤立的订单（没有订单项的订单）
\echo '检查 1.3: 没有订单项的订单...'
SELECT 
    o.id,
    o.email,
    o.status,
    o.total,
    o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE oi.id IS NULL 
  AND o.status NOT IN ('pending', 'expired', 'cancelled');

\echo '  ✓ 应该返回 0 行或只有 pending/expired/cancelled 订单\n'

-- 1.4 检查 paid 订单是否都有 stripe_session_id
\echo '检查 1.4: Paid 订单的 Stripe Session ID...'
SELECT 
    id,
    email,
    status,
    total,
    stripe_session_id,
    created_at
FROM orders
WHERE status = 'paid' 
  AND stripe_session_id IS NULL;

\echo '  ✓ 应该返回 0 行（所有 paid 订单都有 session ID）\n'

-- 1.5 检查重复的 stripe_session_id
\echo '检查 1.5: 重复的 Stripe Session ID...'
SELECT 
    stripe_session_id,
    COUNT(*) as order_count,
    STRING_AGG(id::TEXT, ', ') as order_ids
FROM orders
WHERE stripe_session_id IS NOT NULL
GROUP BY stripe_session_id
HAVING COUNT(*) > 1;

\echo '  ✓ 应该返回 0 行（每个 session 只对应一个订单）\n'

-- 1.6 检查订单项引用的产品是否存在
\echo '检查 1.6: 订单项引用不存在的产品...'
SELECT 
    oi.id as order_item_id,
    oi.order_id,
    oi.product_id,
    oi.quantity
FROM order_items oi
LEFT JOIN products p ON oi.product_id = p.id
WHERE p.id IS NULL;

\echo '  ✓ 应该返回 0 行（所有产品都存在）\n'

-- ============================================
-- 2. 产品数据完整性
-- ============================================

\echo '\n=== 2. 产品数据完整性 ==='

-- 2.1 检查库存不应该是负数
\echo '检查 2.1: 负数库存...'
SELECT 
    id,
    name,
    stock,
    low_stock_threshold
FROM products
WHERE stock < 0;

\echo '  ✓ 应该返回 0 行（库存不能为负）\n'

-- 2.2 检查价格不应该是负数或零
\echo '检查 2.2: 无效价格...'
SELECT 
    id,
    name,
    price_cad,
    stock
FROM products
WHERE price_cad <= 0;

\echo '  ✓ 应该返回 0 行（价格必须为正数）\n'

-- 2.3 检查孤立的产品图片（产品被删除但图片还在）
\echo '检查 2.3: 孤立的产品图片...'
SELECT 
    pi.id as image_id,
    pi.product_id,
    pi.cloudinary_public_id,
    pi.display_order
FROM product_images pi
LEFT JOIN products p ON pi.product_id = p.id
WHERE p.id IS NULL;

\echo '  ✓ 应该返回 0 行（没有孤立的图片记录）\n'

-- 2.4 检查产品是否至少有一张图片
\echo '检查 2.4: 没有图片的产品...'
SELECT 
    p.id,
    p.name,
    p.price_cad,
    p.stock
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE pi.id IS NULL;

\echo '  ⚠️  这些产品没有图片（可能需要添加）\n'

-- 2.5 检查产品分类引用
\echo '检查 2.5: 产品引用不存在的分类...'
SELECT 
    p.id,
    p.name,
    p.category_id
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL 
  AND c.id IS NULL;

\echo '  ✓ 应该返回 0 行（所有分类都存在）\n'

-- ============================================
-- 3. 用户数据完整性
-- ============================================

\echo '\n=== 3. 用户数据完整性 ==='

-- 3.1 检查重复的邮箱
\echo '检查 3.1: 重复的用户邮箱...'
SELECT 
    email,
    COUNT(*) as user_count,
    STRING_AGG(id::TEXT, ', ') as user_ids
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

\echo '  ✓ 应该返回 0 行（邮箱必须唯一）\n'

-- 3.2 检查 OAuth 用户没有密码
\echo '检查 3.2: OAuth 用户的密码字段...'
SELECT 
    id,
    email,
    oauth_provider
FROM users
WHERE oauth_provider IS NOT NULL 
  AND password_hash IS NOT NULL;

\echo '  ⚠️  OAuth 用户应该没有密码哈希\n'

-- 3.3 检查普通用户必须有密码
\echo '检查 3.3: 普通用户缺少密码...'
SELECT 
    id,
    email,
    oauth_provider
FROM users
WHERE oauth_provider IS NULL 
  AND password_hash IS NULL;

\echo '  ✓ 应该返回 0 行（普通用户必须有密码）\n'

-- 3.4 检查用户的订单关联
\echo '检查 3.4: 订单关联到不存在的用户...'
SELECT 
    o.id as order_id,
    o.user_id,
    o.email,
    o.status
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.user_id IS NOT NULL 
  AND u.id IS NULL;

\echo '  ✓ 应该返回 0 行（所有用户都存在）\n'

-- ============================================
-- 4. 物流数据完整性
-- ============================================

\echo '\n=== 4. 物流数据完整性 ==='

-- 4.1 检查 shipped 订单是否有物流信息
\echo '检查 4.1: Shipped 订单的物流信息...'
SELECT 
    id,
    email,
    status,
    tracking_number,
    carrier,
    shipped_at
FROM orders
WHERE status IN ('shipped', 'delivered')
  AND (tracking_number IS NULL OR carrier IS NULL);

\echo '  ✓ 应该返回 0 行（所有发货订单都有物流信息）\n'

-- 4.2 检查有物流信息但状态不对的订单
\echo '检查 4.2: 物流信息但状态不是 shipped/delivered...'
SELECT 
    id,
    email,
    status,
    tracking_number,
    carrier
FROM orders
WHERE tracking_number IS NOT NULL
  AND status NOT IN ('shipped', 'delivered');

\echo '  ⚠️  这些订单有物流信息但状态异常\n'

-- 4.3 检查 shipped_at 的合理性
\echo '检查 4.3: 发货时间早于订单创建时间...'
SELECT 
    id,
    email,
    created_at,
    shipped_at,
    shipped_at - created_at as time_diff
FROM orders
WHERE shipped_at IS NOT NULL
  AND shipped_at < created_at;

\echo '  ✓ 应该返回 0 行（发货时间不能早于创建时间）\n'

-- 4.4 检查收货地址完整性
\echo '检查 4.4: Paid 订单缺少收货地址...'
SELECT 
    id,
    email,
    status,
    shipping_address,
    shipping_name,
    created_at
FROM orders
WHERE status IN ('paid', 'shipped', 'delivered')
  AND shipping_address IS NULL;

\echo '  ⚠️  这些订单没有收货地址（可能是旧数据）\n'

-- ============================================
-- 5. 分类数据完整性
-- ============================================

\echo '\n=== 5. 分类数据完整性 ==='

-- 5.1 检查空分类（没有产品的分类）
\echo '检查 5.1: 空分类（没有产品）...'
SELECT 
    c.id,
    c.name,
    c.slug,
    COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name, c.slug
HAVING COUNT(p.id) = 0;

\echo '  ⚠️  这些分类没有产品（可以考虑删除）\n'

-- 5.2 检查重复的分类 slug
\echo '检查 5.2: 重复的分类 slug...'
SELECT 
    slug,
    COUNT(*) as count,
    STRING_AGG(id::TEXT || ':' || name, ', ') as categories
FROM categories
GROUP BY slug
HAVING COUNT(*) > 1;

\echo '  ✓ 应该返回 0 行（slug 必须唯一）\n'

-- ============================================
-- 6. 业务逻辑检查
-- ============================================

\echo '\n=== 6. 业务逻辑检查 ==='

-- 6.1 检查长时间 pending 的订单
\echo '检查 6.1: 超过 24 小时仍 pending 的订单...'
SELECT 
    id,
    email,
    status,
    total,
    created_at,
    NOW() - created_at as age
FROM orders
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at;

\echo '  ⚠️  这些订单可能需要标记为 expired\n'

-- 6.2 检查异常高价订单
\echo '检查 6.2: 异常高价订单（> $10,000）...'
SELECT 
    id,
    email,
    status,
    total,
    created_at
FROM orders
WHERE total > 10000
ORDER BY total DESC;

\echo '  ⚠️  检查这些高价订单是否正常\n'

-- 6.3 检查单个产品异常高数量订单
\echo '检查 6.3: 单个产品数量 > 100 的订单项...'
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    p.name as product_name,
    oi.quantity,
    o.email,
    o.status
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN orders o ON oi.order_id = o.id
WHERE oi.quantity > 100
ORDER BY oi.quantity DESC;

\echo '  ⚠️  检查这些大批量订单是否合理\n'

-- 6.4 检查库存预警
\echo '检查 6.4: 低库存产品...'
SELECT 
    id,
    name,
    stock,
    low_stock_threshold,
    price_cad
FROM products
WHERE stock <= low_stock_threshold
  AND stock >= 0
ORDER BY stock;

\echo '  ⚠️  这些产品库存较低，需要补货\n'

-- 6.5 检查超卖情况（理论上不应该发生）
\echo '检查 6.5: 检查可能的超卖情况...'
WITH product_sold AS (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'shipped', 'delivered')
      AND o.created_at > NOW() - INTERVAL '30 days'
    GROUP BY oi.product_id
)
SELECT 
    p.id,
    p.name,
    p.stock as current_stock,
    ps.total_sold as sold_last_30_days,
    p.stock + ps.total_sold as theoretical_starting_stock
FROM products p
JOIN product_sold ps ON p.id = ps.product_id
WHERE p.stock < 0 OR (p.stock + ps.total_sold < ps.total_sold);

\echo '  ✓ 应该返回 0 行（没有超卖）\n'

-- ============================================
-- 7. 性能和索引检查
-- ============================================

\echo '\n=== 7. 性能和索引检查 ==='

-- 7.1 检查大表的行数
\echo '检查 7.1: 表数据量统计...'
SELECT 
    'orders' as table_name,
    COUNT(*) as row_count
FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'product_images', COUNT(*) FROM product_images
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
ORDER BY row_count DESC;

\echo '  ℹ️  表数据量统计\n'

-- 7.2 检查缺失的索引（常用查询字段）
\echo '检查 7.2: 常用查询字段的索引...'
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo '  ℹ️  当前索引列表\n'

-- ============================================
-- 8. 数据质量统计
-- ============================================

\echo '\n=== 8. 数据质量统计 ==='

-- 8.1 订单状态分布
\echo '统计 8.1: 订单状态分布...'
SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM orders
GROUP BY status
ORDER BY count DESC;

-- 8.2 产品分类分布
\echo '\n统计 8.2: 产品分类分布...'
SELECT 
    COALESCE(c.name, '未分类') as category,
    COUNT(p.id) as product_count
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
GROUP BY c.name
ORDER BY product_count DESC;

-- 8.3 用户注册来源
\echo '\n统计 8.3: 用户注册来源...'
SELECT 
    COALESCE(oauth_provider, 'email') as registration_method,
    COUNT(*) as user_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
GROUP BY oauth_provider
ORDER BY user_count DESC;

-- 8.4 每日订单统计（最近 7 天）
\echo '\n统计 8.4: 最近 7 天订单统计...'
SELECT 
    DATE(created_at) as date,
    COUNT(*) as order_count,
    SUM(total) as total_revenue,
    ROUND(AVG(total), 2) as avg_order_value
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status IN ('paid', 'shipped', 'delivered')
GROUP BY DATE(created_at)
ORDER BY date DESC;

\echo '\n✅ 数据完整性检查完成！'
\echo '请检查上述结果，修复发现的问题。\n'
