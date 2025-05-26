# Gproxy-Js

Gproxy-Js 是一个基于 Cloudflare Workers 和 Hono 构建的高性能、可配置的代理服务。它允许用户通过灵活的规则引擎将传入请求动态路由到不同的目标服务器，并提供缓存、管理后台等功能。

## ✨ 功能特性

*   **动态代理**：根据用户定义的规则将 HTTP/HTTPS 请求转发到不同的后端服务。
*   **灵活的规则引擎**：支持基于请求路径、方法、头部等多种条件进行匹配和路由。
*   **缓存机制**：集成缓存策略，减少对后端服务的请求，提高响应速度。
*   **管理后台**：提供用户友好的 Web界面，用于：
    *   管理目标服务器 ([`/admin/targets`](src/views/admin/targets.tsx:1))
    *   配置路由规则 ([`/admin/rules`](src/views/admin/rules.tsx:1))
    *   管理缓存 ([`/admin/cache`](src/views/admin/cache.tsx:1))
    *   查看请求日志 ([`/admin/logs`](src/views/admin/logs.tsx:1))
    *   配置异步策略 ([`/admin/async-policies`](src/views/admin/async-policies.tsx:1))
*   **异步处理**：支持异步任务处理，例如数据同步或后台作业。
*   **基于 JWT 的认证**：管理后台使用 JWT 进行安全认证。

## 项目结构

```
.
├── .env.example        # 环境变量示例文件
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
├── wrangler.jsonc      # Cloudflare Workers 类型生成配置文件
├── wrangler.toml       # Cloudflare Workers 部署配置文件
├── public/             # 静态资源 (如果通过 Cloudflare Pages 部署)
├── src/                # 项目源代码
│   ├── index.ts        # 应用入口文件
│   ├── db/             # 数据库相关 (D1)
│   │   ├── index.ts
│   │   └── schema.sql
│   ├── middleware/     # Hono 中间件
│   │   ├── auth.ts
│   │   ├── config-check.ts
│   │   └── setup-check.ts
│   ├── routes/         # Hono 路由定义
│   │   ├── admin.ts
│   │   └── proxy.ts
│   ├── services/       # 业务逻辑服务
│   │   ├── adminService.ts
│   │   ├── asyncProcessor.ts
│   │   ├── cacheService.ts
│   │   ├── proxyService.ts
│   │   └── ruleEngineService.ts
│   └── views/          # JSX 视图组件 (用于管理后台)
│       ├── admin/
│       └── layouts/
└── test/               # 测试文件 (待补充)
```

## 🚀 安装与运行

### 1. 安装依赖

项目使用 pnpm 进行包管理。

```bash
pnpm install
```

### 2. 配置环境变量

复制 [`.env.example`](.env.example) 文件为 `.env`，并根据您的环境修改其中的值。

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# JWT Secret for admin authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Static assets base URL (Cloudflare Pages)
# 如果您使用 Cloudflare Pages 部署静态资源 (例如管理后台的 CSS/JS)，请设置此项。
# 否则，如果静态资源由 Worker 本身提供，则可能不需要。
STATIC_ASSETS_BASE_URL=https://your-project.pages.dev
```

**环境变量说明：**

*   `JWT_SECRET`: 用于管理后台登录认证的 JWT 密钥。**请务必在生产环境中更改为一个强随机字符串。**
*   `STATIC_ASSETS_BASE_URL`: 静态资源的基础 URL。这通常指向您部署在 Cloudflare Pages 上的前端静态文件。如果您的静态资源直接由 Worker 提供，则此配置可能有所不同或不需要。

### 3. 开发模式

在本地运行开发服务器 (使用 Wrangler):

```bash
pnpm dev
```

### 4. 部署到 Cloudflare Workers

```bash
pnpm deploy
```

## ⚙️ 管理后台

管理后台用于配置代理规则、目标服务器、查看日志等。

*   **访问路径**: 部署后，通常可以通过 `/admin` 路径访问管理后台 (例如 `https://your-worker-url.workers.dev/admin`)。
*   **首次设置/登录**:
    *   首次访问 `/admin/setup` ([`src/views/admin/setup.tsx`](src/views/admin/setup.tsx:1)) 来初始化管理员账户。
    *   之后通过 `/admin/login` ([`src/views/admin/login.tsx`](src/views/admin/login.tsx:1)) 登录。

## ☁️ Cloudflare Workers 特定说明

### 类型生成

为了在 TypeScript 中获得 Cloudflare 绑定 (如 KV, D1, R2) 的类型提示，可以运行：

```bash
pnpm cf-typegen
```

这将根据您的 [`wrangler.jsonc`](wrangler.jsonc) 或 [`wrangler.toml`](wrangler.toml) 文件生成类型定义。

### Hono 绑定

在实例化 Hono 应用时，传递 `CloudflareBindings` 作为泛型参数：

```typescript
// src/index.ts
import { Hono } from 'hono'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// ... 其他代码
```

## 📝 TODO / 未来功能（暂不开发）

*   [ ] 更详细的规则匹配选项 (例如：基于地理位置、IP 黑白名单)。
*   [ ] 完善的测试用例。
*   [ ] 管理后台 UI/UX 优化。
*   [ ] 支持更多类型的缓存后端。
*   [ ] 插件系统，方便扩展功能。
