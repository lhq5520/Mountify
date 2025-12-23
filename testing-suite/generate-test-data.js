#!/usr/bin/env node

/**
 * 测试数据生成器
 * 快速创建测试所需的产品、用户、订单等数据
 */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 请设置 DATABASE_URL 环境变量');
  process.exit(1);
}

const { Client } = require('pg');

async function generateTestData() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ 连接数据库成功\n');
    
    // 1. 创建测试用户
    console.log('👤 创建测试用户...');
    await createUsers(client);
    
    // 2. 创建测试分类
    console.log('📂 创建测试分类...');
    await createCategories(client);
    
    // 3. 创建测试产品
    console.log('📦 创建测试产品...');
    await createProducts(client);
    
    // 4. 创建测试订单
    console.log('🛒 创建测试订单...');
    await createOrders(client);
    
    console.log('\n✅ 测试数据生成完成！');
    console.log('\n📊 数据统计:');
    
    const stats = await getStats(client);
    console.log(`  - 用户: ${stats.users} 个`);
    console.log(`  - 分类: ${stats.categories} 个`);
    console.log(`  - 产品: ${stats.products} 个`);
    console.log(`  - 订单: ${stats.orders} 个`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function createUsers(client) {
  const users = [
    {
      name: 'Test User',
      email: 'test@example.com',
      password: '$2a$10$...',  // bcrypt hash of "testpassword123"
      role: 'user'
    },
    {
      name: 'Admin User',
      email: 'admin@test.com',
      password: '$2a$10$...',  // bcrypt hash of "admin123"
      role: 'admin'
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: '$2a$10$...',
      role: 'user'
    }
  ];
  
  for (const user of users) {
    await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, [user.name, user.email, user.password, user.role]);
  }
  
  console.log(`  ✓ 创建 ${users.length} 个用户`);
}

async function createCategories(client) {
  const categories = [
    { name: 'Protein', slug: 'protein' },
    { name: 'Pre-Workout', slug: 'pre-workout' },
    { name: 'Vitamins', slug: 'vitamins' },
    { name: 'Creatine', slug: 'creatine' },
    { name: 'BCAA', slug: 'bcaa' },
  ];
  
  for (const cat of categories) {
    await client.query(`
      INSERT INTO categories (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO NOTHING
    `, [cat.name, cat.slug]);
  }
  
  console.log(`  ✓ 创建 ${categories.length} 个分类`);
}

async function createProducts(client) {
  const categoryResult = await client.query('SELECT id FROM categories LIMIT 5');
  const categoryIds = categoryResult.rows.map(r => r.id);
  
  const products = [
    {
      name: 'Whey Protein Isolate',
      description: 'Premium whey protein isolate with 25g protein per serving',
      price: 49.99,
      stock: 100,
      categoryId: categoryIds[0]
    },
    {
      name: 'Pre-Workout Energy Boost',
      description: 'Explosive energy formula with beta-alanine and caffeine',
      price: 34.99,
      stock: 75,
      categoryId: categoryIds[1]
    },
    {
      name: 'Multivitamin Complex',
      description: 'Complete daily vitamin and mineral formula',
      price: 24.99,
      stock: 150,
      categoryId: categoryIds[2]
    },
    {
      name: 'Creatine Monohydrate',
      description: 'Pure micronized creatine monohydrate',
      price: 19.99,
      stock: 200,
      categoryId: categoryIds[3]
    },
    {
      name: 'BCAA Recovery',
      description: '2:1:1 ratio BCAA for muscle recovery',
      price: 29.99,
      stock: 80,
      categoryId: categoryIds[4]
    },
    {
      name: 'Casein Protein',
      description: 'Slow-digesting protein for overnight recovery',
      price: 44.99,
      stock: 60,
      categoryId: categoryIds[0]
    },
    {
      name: 'Beta-Alanine',
      description: 'Pure beta-alanine for endurance',
      price: 22.99,
      stock: 90,
      categoryId: categoryIds[1]
    },
    {
      name: 'Omega-3 Fish Oil',
      description: 'High-potency omega-3 fatty acids',
      price: 27.99,
      stock: 120,
      categoryId: categoryIds[2]
    },
    {
      name: 'Creatine HCL',
      description: 'Highly concentrated creatine hydrochloride',
      price: 32.99,
      stock: 50,
      categoryId: categoryIds[3]
    },
    {
      name: 'Essential Amino Acids',
      description: 'Complete EAA formula with all 9 essential amino acids',
      price: 39.99,
      stock: 70,
      categoryId: categoryIds[4]
    }
  ];
  
  for (const product of products) {
    await client.query(`
      INSERT INTO products (name, description, price_cad, stock, category_id, low_stock_threshold)
      VALUES ($1, $2, $3, $4, $5, 10)
      ON CONFLICT DO NOTHING
    `, [product.name, product.description, product.price, product.stock, product.categoryId]);
  }
  
  console.log(`  ✓ 创建 ${products.length} 个产品`);
}

async function createOrders(client) {
  const userResult = await client.query('SELECT id, email FROM users WHERE role = $1 LIMIT 2', ['user']);
  const users = userResult.rows;
  
  const productResult = await client.query('SELECT id, price_cad FROM products LIMIT 10');
  const products = productResult.rows;
  
  const statuses = ['pending', 'paid', 'shipped', 'delivered'];
  
  // 创建 20 个订单
  for (let i = 0; i < 20; i++) {
    const user = users[i % users.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // 随机选择 1-3 个产品
    const numItems = Math.floor(Math.random() * 3) + 1;
    const orderProducts = [];
    let total = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      orderProducts.push({ ...product, quantity });
      total += parseFloat(product.price_cad) * quantity;
    }
    
    // 创建订单
    const orderResult = await client.query(`
      INSERT INTO orders (user_id, email, total, status, created_at)
      VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${Math.floor(Math.random() * 30)} days')
      RETURNING id
    `, [user.id, user.email, total, status]);
    
    const orderId = orderResult.rows[0].id;
    
    // 创建订单项
    for (const item of orderProducts) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES ($1, $2, $3, $4)
      `, [orderId, item.id, item.quantity, item.price_cad]);
    }
    
    // 如果是已发货订单，添加物流信息
    if (status === 'shipped' || status === 'delivered') {
      const carriers = ['ups', 'fedex', 'usps', 'dhl'];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      const trackingNumber = `TEST${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      await client.query(`
        UPDATE orders
        SET tracking_number = $1,
            carrier = $2,
            shipped_at = NOW() - INTERVAL '${Math.floor(Math.random() * 7)} days',
            shipping_name = $3,
            shipping_address = $4
        WHERE id = $5
      `, [
        trackingNumber,
        carrier,
        'Test Customer',
        JSON.stringify({
          line1: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          postal_code: '12345',
          country: 'US'
        }),
        orderId
      ]);
    }
  }
  
  console.log(`  ✓ 创建 20 个订单`);
}

async function getStats(client) {
  const usersResult = await client.query('SELECT COUNT(*) FROM users');
  const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
  const productsResult = await client.query('SELECT COUNT(*) FROM products');
  const ordersResult = await client.query('SELECT COUNT(*) FROM orders');
  
  return {
    users: parseInt(usersResult.rows[0].count),
    categories: parseInt(categoriesResult.rows[0].count),
    products: parseInt(productsResult.rows[0].count),
    orders: parseInt(ordersResult.rows[0].count),
  };
}

// 运行
generateTestData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
