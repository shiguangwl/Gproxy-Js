# Gproxy-Js 项目文档

## 1. 项目概述

Gproxy-Js 是一个基于 Cloudflare Workers 和 Hono 构建的高性能、可配置的代理服务。它允许用户通过灵活的规则引擎将传入请求动态路由到不同的目标服务器，并提供内容替换、缓存、管理后台等功能。

### 1.1 核心功能

- **动态代理**：根据用户定义的规则将 HTTP/HTTPS 请求转发到不同的后端服务
- **内容替换**：强大的内容替换引擎，支持字符串和正则表达式匹配
- **异步请求控制**：精细控制客户端 AJAX/Fetch 请求的代理行为
- **WebSocket 代理**：支持 WebSocket 连接的透明代理
- **管理后台**：用户友好的 Web 界面，用于配置代理目标、替换规则和异步策略
- **基于 JWT 的认证**：安全的管理后台访问控制

### 1.2 技术栈

- **运行时环境**：Cloudflare Workers
- **Web 框架**：Hono.js
- **语言**：TypeScript
- **数据库**：Cloudflare D1 (SQLite)
- **缓存/存储**：Cloudflare KV / R2
- **前端**：Hono JSX (服务端渲染)
- **打包/构建**：Wrangler CLI
- **包管理**：pnpm

## 2. 安装指南

### 2.1 前置条件

在开始之前，请确保您已安装以下软件：

- **Node.js** (推荐 v18 或更高版本)
- **pnpm** (v8 或更高版本)
- **Wrangler CLI** (v4 或更高版本)
- **Cloudflare 账户**（用于部署 Workers 和创建 D1 数据库）

### 2.2 本地开发环境设置

1. **克隆仓库**

   ```bash
   git clone https://github.com/yourusername/gproxy-js.git
   cd gproxy-js
   ```

2. **安装依赖**

   ```bash
   pnpm install
   ```

3. **配置环境变量**

   复制 `.dev.vars.example` 文件（如果存在）为 `.dev.vars`：

   ```bash
   cp .dev.vars.example .dev.vars
   ```

   编辑 `.dev.vars` 文件，设置以下环境变量：

   ```
   # JWT密钥用于用户认证（生成一个强随机字符串）
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

   # 应用环境标识
   APP_ENV=development
   ```

4. **创建和配置 D1 数据库**

   使用 Wrangler 创建一个本地 D1 数据库：

   ```bash
   wrangler d1 create gproxy-db
   ```

   这将输出一个配置片段，您需要将其添加到 `wrangler.jsonc` 文件中（如果尚未添加）。确保 `wrangler.jsonc` 中包含类似以下的配置：

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "gproxy-db",
       "database_id": "your-database-id-from-wrangler-output"
     }
   ]
   ```

5. **应用数据库迁移**

   ```bash
   wrangler d1 migrations apply DB --local
   ```

6. **启动本地开发服务器**

   ```bash
   pnpm dev
   ```

   这将启动一个本地开发服务器，默认地址为 `http://localhost:8787`。

## 3. 部署指南

### 3.1 部署到 Cloudflare Workers

1. **登录 Wrangler**

   如果您尚未登录 Wrangler，请运行以下命令并按照提示操作：

   ```bash
   wrangler login
   ```

2. **创建生产环境 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db --production
   ```

   将输出的配置添加到 `wrangler.jsonc` 文件中（如果尚未添加）。

3. **应用数据库迁移到生产环境**

   ```bash
   wrangler d1 migrations apply DB --remote
   ```

4. **配置生产环境密钥**

   设置 JWT 密钥（用于管理员认证）：

   ```bash
   wrangler secret put JWT_SECRET
   ```

   在提示时输入一个强随机字符串作为 JWT 密钥。

5. **部署 Worker**

   ```bash
   pnpm deploy
   ```

   部署成功后，Wrangler 将输出您的 Worker URL，例如 `https://gproxy-js.your-username.workers.dev`。

### 3.2 自定义域名设置

要将 Gproxy-Js 部署到自定义域名：

1. 在 Cloudflare Dashboard 中添加您的域名
2. 在 Workers 部分，将您的 Worker 路由到自定义域名或路径
3. 更新 DNS 记录，将域名指向 Cloudflare

## 4. 配置指南

### 4.1 初始设置

首次访问 Gproxy-Js 管理后台时，您需要完成初始设置：

1. 访问 `/admin/setup` 路径（例如 `https://your-worker-url.workers.dev/admin/setup`）
2. 设置管理员密码
3. 提交表单完成设置

### 4.2 管理后台配置

成功设置后，您可以通过 `/admin/login` 路径登录管理后台，使用您在初始设置中创建的密码。

管理后台包含以下主要部分：

#### 4.2.1 代理目标管理

在 `/admin/targets` 页面，您可以：

- 添加新的代理目标
- 编辑现有代理目标
- 启用/禁用代理目标
- 配置 JavaScript 注入选项

每个代理目标需要配置以下信息：
- **目标 URL 前缀**：要代理的目标服务器 URL 前缀
- **是否启用**：控制此代理目标是否生效
- **启用 JS 注入**：是否在代理的 HTML 页面中注入客户端脚本
- **备注**：可选的描述信息

#### 4.2.2 替换规则管理

在 `/admin/rules` 页面，您可以配置内容替换规则：

- 添加新的替换规则
- 编辑现有替换规则
- 启用/禁用替换规则

每个替换规则需要配置以下信息：
- **名称**：规则的描述性名称
- **是否启用**：控制此规则是否生效
- **搜索模式**：要查找的内容（字符串或正则表达式）
- **替换内容**：用于替换的内容
- **匹配类型**：string（字符串）或 regex（正则表达式）
- **URL 匹配正则**：可选，指定应用规则的 URL 模式
- **URL 排除正则**：可选，指定不应用规则的 URL 模式
- **内容类型匹配**：可选，指定应用规则的内容类型（如 text/html）
- **优先级顺序**：规则的执行优先级（数字越小优先级越高）

#### 4.2.3 异步请求策略管理

在 `/admin/async-policies` 页面，您可以配置客户端异步请求的处理策略：

- 添加新的异步请求策略
- 编辑现有策略
- 启用/禁用策略

每个异步请求策略需要配置以下信息：
- **名称**：策略的描述性名称
- **是否启用**：控制此策略是否生效
- **目标 URL 模式**：匹配客户端请求 URL 的正则表达式
- **执行动作**：proxy（通过代理）或 direct（直接连接）
- **应用于目标前缀**：可选，指定此策略适用的代理目标
- **优先级顺序**：策略的执行优先级
- **备注**：可选的描述信息

#### 4.2.4 全局设置

在 `/admin/settings` 页面，您可以：

- 修改管理员密码
- 查看系统信息

### 4.3 高级配置

#### 4.3.1 Cloudflare Workers 配置

您可以在 `wrangler.jsonc` 文件中配置 Worker 的行为：

```json
{
  "name": "gproxy-js",
  "main": "src/index.ts",
  "compatibility_date": "2025-05-26",
  "account_id": "your-account-id",
  "vars": {
    "APP_ENV": "production"
  },
  "kv_namespaces": [
    {
      "binding": "CACHE_STORE",
      "id": "your-kv-namespace-id"
    }
  ],
  "r2_buckets": [
    {
      "binding": "CACHE_STORE_R2",
      "bucket_name": "gproxy-cache-store"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "gproxy-db",
      "database_id": "your-database-id"
    }
  ]
}
```

#### 4.3.2 数据库结构

Gproxy-Js 使用以下主要数据表：

- **settings**：存储系统设置（如管理员密码哈希）
- **proxied_targets**：存储代理目标配置
- **replace_rules**：存储内容替换规则
- **async_request_policies**：存储异步请求处理策略
- **header_rules**：存储请求/响应头修改规则
- **response_rules**：存储响应处理规则
- **cache_settings**：存储缓存配置
- **cached_responses**：存储缓存的响应
- **request_logs**：存储请求日志

## 5. 使用指南

### 5.1 代理请求

Gproxy-Js 通过以下 URL 格式处理代理请求：

```
https://your-worker-url.workers.dev/proxy/{protocol}/{domain}/{path}
```

例如，要代理 `https://example.com/page.html`，URL 将是：

```
https://your-worker-url.workers.dev/proxy/https/example.com/page.html
```

### 5.2 内容替换

配置替换规则后，Gproxy-Js 将自动对匹配的内容进行替换。替换发生在服务器端，对客户端完全透明。

### 5.3 客户端脚本功能

当代理目标启用 JS 注入时，Gproxy-Js 会在代理的 HTML 页面中注入客户端脚本，提供以下功能：

- 拦截并处理 AJAX/Fetch 请求
- 拦截并处理 WebSocket 连接
- 根据配置的异步请求策略决定请求是直接发送还是通过代理
- 自动重写页面中动态加载的资源 URL

### 5.4 缓存功能

Gproxy-Js 支持缓存代理响应，可以通过管理后台配置缓存策略。缓存可以显著提高性能并减少对目标服务器的请求。

## 6. 常见问题解答

### 6.1 管理后台访问问题

**问题**：无法访问管理后台或登录失败。

**解决方案**：
- 确认您访问的是正确的 URL（`/admin/login`）
- 确认您使用的是正确的管理员密码
- 检查 JWT_SECRET 环境变量是否正确设置
- 如果忘记密码，可能需要重置数据库或直接修改数据库中的密码哈希

### 6.2 代理功能问题

**问题**：代理请求失败或返回错误。

**解决方案**：
- 确认目标服务器可以正常访问
- 检查代理目标配置是否正确
- 查看 Cloudflare Workers 日志以获取详细错误信息
- 确认目标服务器没有阻止来自 Cloudflare IP 的请求

### 6.3 内容替换问题

**问题**：内容替换规则不生效。

**解决方案**：
- 确认替换规则已启用
- 检查 URL 匹配模式是否正确
- 对于正则表达式替换，确保语法正确
- 检查内容类型匹配是否正确设置
- 确认规则优先级没有被其他规则覆盖

### 6.4 性能优化

**问题**：代理服务响应缓慢。

**解决方案**：
- 启用缓存功能减少对目标服务器的请求
- 优化替换规则，避免使用复杂的正则表达式
- 考虑使用 Cloudflare 的边缘缓存功能
- 监控 Workers 使用情况，确保没有达到资源限制

### 6.5 部署问题

**问题**：部署到 Cloudflare Workers 失败。

**解决方案**：
- 确认 Wrangler 已正确登录
- 检查 `wrangler.jsonc` 配置是否正确
- 确保 account_id 设置正确
- 查看 Wrangler 输出的详细错误信息
- 确认代码大小没有超过 Cloudflare Workers 的限制

## 7. 高级用例

### 7.1 API 代理

Gproxy-Js 可以用作 API 代理，通过配置适当的头部规则和内容替换规则，可以：

- 修改 API 请求和响应
- 添加认证信息
- 转换数据格式
- 合并多个 API 响应

### 7.2 内容过滤

通过配置替换规则，Gproxy-Js 可以：

- 移除广告或不需要的内容
- 注入自定义脚本或样式
- 修改页面布局
- 翻译或本地化内容

### 7.3 负载均衡

通过配置多个代理目标和规则，Gproxy-Js 可以实现简单的负载均衡功能。

## 8. 贡献指南

欢迎对 Gproxy-Js 项目做出贡献！请按照以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 9. 许可证

本项目采用 MIT 许可证 - 详情请参阅 LICENSE 文件。

## 10. 联系方式

如有问题或建议，请通过以下方式联系我们：

- GitHub Issues: [https://github.com/yourusername/gproxy-js/issues](https://github.com/yourusername/gproxy-js/issues)
- Email: your.email@example.com 