# Gproxy-Js 部署指南

本文档提供了将 Gproxy-Js 部署到不同环境的详细步骤、注意事项和最佳实践。

## 1. 部署概述

Gproxy-Js 是一个基于 Cloudflare Workers 的应用，部署主要涉及以下步骤：

1. 准备 Cloudflare 账户和必要的资源
2. 配置 Wrangler CLI
3. 创建和配置 D1 数据库
4. 设置环境变量和密钥
5. 部署 Worker 代码
6. 应用数据库迁移
7. 验证部署

## 2. 部署环境

### 2.1 开发环境

开发环境通常是指本地开发服务器，用于功能开发和测试。

#### 设置步骤

1. **安装依赖**

   ```bash
   pnpm install
   ```

2. **配置本地环境变量**

   创建 `.dev.vars` 文件：

   ```
   JWT_SECRET=development-jwt-secret-key
   APP_ENV=development
   ```

3. **创建本地 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db-dev
   ```

   将输出的配置添加到 `wrangler.jsonc` 文件中：

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "gproxy-db-dev",
       "database_id": "your-dev-database-id"
     }
   ]
   ```

4. **应用数据库迁移**

   ```bash
   wrangler d1 migrations apply DB --local
   ```

5. **启动开发服务器**

   ```bash
   pnpm dev
   ```

### 2.2 预览环境

预览环境是 Cloudflare Workers 的预览部署，用于在生产环境前进行测试。

#### 设置步骤

1. **创建预览 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db-preview
   ```

   将输出的配置添加到 `wrangler.jsonc` 文件中，作为预览数据库：

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "gproxy-db-preview",
       "database_id": "your-preview-database-id",
       "preview_database_id": "your-preview-database-id"
     }
   ]
   ```

2. **设置预览环境变量**

   ```bash
   wrangler secret put JWT_SECRET --env preview
   ```

   在提示时输入预览环境的 JWT 密钥。

3. **部署到预览环境**

   ```bash
   pnpm run preview
   # 或
   wrangler deploy --env preview
   ```

4. **应用数据库迁移到预览环境**

   ```bash
   wrangler d1 migrations apply DB --env preview
   ```

### 2.3 生产环境

生产环境是面向最终用户的部署。

#### 设置步骤

1. **创建生产 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db-prod --production
   ```

   将输出的配置添加到 `wrangler.jsonc` 文件中：

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "gproxy-db-prod",
       "database_id": "your-prod-database-id"
     }
   ]
   ```

2. **设置生产环境变量**

   ```bash
   wrangler secret put JWT_SECRET
   ```

   在提示时输入一个强随机字符串作为生产环境的 JWT 密钥。

3. **部署到生产环境**

   ```bash
   pnpm deploy
   # 或
   wrangler deploy
   ```

4. **应用数据库迁移到生产环境**

   ```bash
   wrangler d1 migrations apply DB --remote
   ```

## 3. 自定义域名配置

### 3.1 通过 Cloudflare Dashboard 配置

1. 登录 Cloudflare Dashboard
2. 选择或添加您的域名
3. 导航到 "Workers 和 Pages" 部分
4. 点击您的 Worker
5. 在 "触发器" 选项卡中，点击 "添加自定义域"
6. 输入您要使用的域名或子域名（例如 `proxy.yourdomain.com`）
7. 按照提示完成域名验证和 DNS 配置

### 3.2 通过 Wrangler 配置

在 `wrangler.jsonc` 文件中添加自定义域名配置：

```json
"routes": [
  {
    "pattern": "proxy.yourdomain.com/*",
    "zone_name": "yourdomain.com"
  }
]
```

然后重新部署 Worker：

```bash
pnpm deploy
```

## 4. 多环境配置

### 4.1 环境配置文件

为不同环境创建单独的配置文件：

- `wrangler.dev.jsonc` - 开发环境配置
- `wrangler.preview.jsonc` - 预览环境配置
- `wrangler.prod.jsonc` - 生产环境配置

或者在单个 `wrangler.jsonc` 文件中使用环境配置：

```json
{
  "env": {
    "dev": {
      "name": "gproxy-js-dev",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "gproxy-db-dev",
          "database_id": "your-dev-database-id"
        }
      ]
    },
    "preview": {
      "name": "gproxy-js-preview",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "gproxy-db-preview",
          "database_id": "your-preview-database-id"
        }
      ]
    },
    "production": {
      "name": "gproxy-js",
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "gproxy-db-prod",
          "database_id": "your-prod-database-id"
        }
      ]
    }
  }
}
```

### 4.2 环境特定的部署命令

在 `package.json` 中添加环境特定的部署命令：

```json
"scripts": {
  "dev": "wrangler dev",
  "preview": "wrangler deploy --env preview",
  "deploy": "wrangler deploy --env production",
  "deploy:dev": "wrangler deploy --env dev",
  "deploy:preview": "wrangler deploy --env preview",
  "deploy:prod": "wrangler deploy --env production"
}
```

## 5. 持续集成/持续部署 (CI/CD)

### 5.1 GitHub Actions 配置

创建 `.github/workflows/deploy.yml` 文件：

```yaml
name: Deploy

on:
  push:
    branches:
      - main  # 生产部署
      - develop  # 预览部署

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Install dependencies
        run: pnpm install
      - name: Publish to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: |
            if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
              wrangler deploy --env production
              wrangler d1 migrations apply DB --env production
            elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
              wrangler deploy --env preview
              wrangler d1 migrations apply DB --env preview
            fi
        env:
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### 5.2 必要的 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `CF_API_TOKEN` - Cloudflare API 令牌
- `CF_ACCOUNT_ID` - Cloudflare 账户 ID
- `JWT_SECRET` - JWT 密钥（可以为每个环境设置不同的密钥）

## 6. 部署后验证

### 6.1 基本验证

1. 访问 Worker URL（例如 `https://gproxy-js.your-username.workers.dev`）
2. 访问管理后台设置页面（`/admin/setup`）并完成初始设置
3. 登录管理后台（`/admin/login`）并验证功能是否正常

### 6.2 功能验证

1. 添加一个代理目标
2. 通过代理 URL 访问目标网站
3. 添加一个内容替换规则并验证替换是否生效
4. 添加一个异步请求策略并验证客户端请求是否按预期处理

### 6.3 性能监控

1. 在 Cloudflare Dashboard 中监控 Worker 的性能指标
2. 检查 Worker 的 CPU 和内存使用情况
3. 监控请求成功率和错误率

## 7. 故障排查

### 7.1 部署失败

**问题**: Wrangler 部署命令失败。

**解决方案**:
- 检查 Wrangler CLI 版本是否最新
- 确认 `wrangler.jsonc` 文件格式正确
- 验证 Cloudflare 账户权限
- 检查 Worker 代码大小是否超过限制（免费计划为 1MB）

### 7.2 数据库迁移失败

**问题**: 数据库迁移命令失败。

**解决方案**:
- 确认 D1 数据库 ID 和绑定名称正确
- 检查迁移文件语法是否正确
- 验证是否有足够的权限执行迁移

### 7.3 Worker 运行时错误

**问题**: Worker 部署成功但运行时出错。

**解决方案**:
- 在 Cloudflare Dashboard 中检查 Worker 日志
- 使用 `wrangler tail` 命令实时查看日志
- 确认所有必要的环境变量和密钥已正确设置

## 8. 最佳实践

### 8.1 安全最佳实践

- 使用强随机字符串作为 JWT 密钥
- 定期轮换密钥和凭证
- 限制管理后台访问权限
- 启用 Cloudflare 安全功能（如 WAF、速率限制）

### 8.2 性能最佳实践

- 启用适当的缓存策略
- 优化内容替换规则，避免复杂的正则表达式
- 监控 Worker 资源使用情况
- 使用 Cloudflare 的边缘缓存功能

### 8.3 可维护性最佳实践

- 使用语义化版本控制
- 保持清晰的部署历史记录
- 实施自动化测试和部署流程
- 记录部署过程和配置变更

## 9. 扩展与定制

### 9.1 添加自定义功能

如需添加自定义功能，请按照以下步骤操作：

1. 在 `src` 目录中实现功能代码
2. 更新数据库模式（如需要）
3. 创建新的数据库迁移
4. 更新管理后台 UI（如需要）
5. 测试新功能
6. 部署更新

### 9.2 集成第三方服务

Gproxy-Js 可以与其他 Cloudflare 服务或第三方服务集成：

- **Cloudflare R2**: 用于大型文件存储
- **Cloudflare KV**: 用于高性能键值存储
- **Cloudflare Queues**: 用于异步任务处理
- **外部 API**: 通过 `fetch` API 集成第三方服务

## 10. 资源限制与注意事项

### 10.1 Cloudflare Workers 限制

- **CPU 时间**: 单个请求最多 50ms（免费计划）或 30s（付费计划）
- **内存**: 最多 128MB
- **代码大小**: 最多 1MB（压缩后）
- **环境变量**: 最多 64KB
- **KV 操作**: 每秒最多 1000 次读取，每秒最多 1000 次写入

### 10.2 D1 数据库限制

- **数据库大小**: 最多 5GB（可能会随时间变化）
- **并发连接**: 根据计划不同有所限制
- **查询复杂度**: 复杂查询可能受到性能限制

请根据您的使用情况和 Cloudflare 的最新限制调整部署策略。 