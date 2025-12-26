<img src="/public/images/DEMO.png" alt="Mountify Demo" width="720" />

# Mountify

A production-grade e-commerce platform built with Next.js

一个基于 Next.js 构建的生产级电商平台

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff?logo=stripe)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[English](#english) | [中文](#中文)

📖 [View Documentation / 查阅文档](https://docs.mountify.shop)

<img src="/public/images/logo.png" alt="Logo" width="150" />

---

## English

### Features

- Full e-commerce flow: cart → checkout → payment → order confirmation
- Auth via NextAuth v5 (credentials + Google OAuth)
- Stripe Checkout + Webhooks with idempotent processing
- Redis caching (56x faster queries)
- Rate limiting, input validation, RBAC
- Docker / PM2 / Vercel deployment ready

### Tech Stack

| Layer    | Tech                                       |
| -------- | ------------------------------------------ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind |
| Backend  | Next.js API Routes, NextAuth 5             |
| Database | PostgreSQL (Neon)                          |
| Cache    | Redis (Upstash)                            |
| Payments | Stripe Checkout + Webhooks                 |
| Email    | Resend                                     |

### Quick Start

```bash
git clone https://github.com/lhq5520/Mountify-Commerce.git
cd Mountify-Commerce
npm install
cp .env.example .env.local  # Configure your environment variables
npm run dev
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
AUTH_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional
RESEND_API_KEY=...
CLOUDINARY_API_KEY=...
```

### Stripe Test

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Test card: `4242 4242 4242 4242`

### Documentation

📖 [docs.mountify.shop](https://docs.mountify.shop)

---

## 中文

### 功能特性

- 完整电商流程：购物车 → 结账 → 支付 → 订单确认
- NextAuth v5 认证（账号密码 + Google OAuth）
- Stripe 支付 + Webhooks 幂等处理
- Redis 缓存（查询速度提升 56 倍）
- 限流、输入验证、RBAC 权限控制
- 支持 Docker / PM2 / Vercel 部署

### 技术栈

| 层级   | 技术                                       |
| ------ | ------------------------------------------ |
| 前端   | Next.js 16, React 19, TypeScript, Tailwind |
| 后端   | Next.js API Routes, NextAuth 5             |
| 数据库 | PostgreSQL (Neon)                          |
| 缓存   | Redis (Upstash)                            |
| 支付   | Stripe Checkout + Webhooks                 |
| 邮件   | Resend                                     |

### 快速开始

```bash
git clone https://github.com/lhq5520/Mountify-Commerce.git
cd Mountify-Commerce
npm install
cp .env.example .env.local  # 配置环境变量
npm run dev
```

### 环境变量

```env
# 必需
DATABASE_URL=postgresql://...
AUTH_SECRET=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 可选
RESEND_API_KEY=...
CLOUDINARY_API_KEY=...
```

### Stripe 测试

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

测试卡号：`4242 4242 4242 4242`

### 文档

📖 [docs.mountify.shop](https://docs.mountify.shop)

---

## License

MIT © [Weifan Li](https://github.com/lhq5520)
