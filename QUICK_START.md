# Gproxy-Js 快速入门指南

这个指南将帮助您快速开始使用 Gproxy-Js 代理服务。

## 1. 安装

### 前置条件

- Node.js (v18+)
- pnpm (v8+)
- Wrangler CLI (v4+)
- Cloudflare 账户

### 步骤

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

   创建 `.dev.vars` 文件：

   ```bash
   # JWT密钥用于用户认证
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # 应用环境标识
   APP_ENV=development
   ```

## 2. 本地开发

1. **创建本地 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db
   ```

   将输出的配置添加到 `wrangler.jsonc` 文件中。

2. **应用数据库迁移**

   ```bash
   wrangler d1 migrations apply DB --local
   ```

3. **启动开发服务器**

   ```bash
   pnpm dev
   ```

   服务器将在 `http://localhost:8787` 运行。

## 3. 部署

1. **登录 Wrangler**

   ```bash
   wrangler login
   ```

2. **创建生产环境 D1 数据库**

   ```bash
   wrangler d1 create gproxy-db --production
   ```

   更新 `wrangler.jsonc` 文件。

3. **设置 JWT 密钥**

   ```bash
   wrangler secret put JWT_SECRET
   ```

4. **应用数据库迁移**

   ```bash
   wrangler d1 migrations apply DB --remote
   ```

5. **部署 Worker**

   ```bash
   pnpm deploy
   ```

## 4. 初始设置

1. 访问 `/admin/setup` 路径（例如 `https://your-worker-url.workers.dev/admin/setup`）
2. 设置管理员密码
3. 提交表单完成设置

## 5. 基本使用

### 登录管理后台

1. 访问 `/admin/login` 路径
2. 使用您设置的密码登录

### 添加代理目标

1. 在管理后台，导航到 "代理目标" 页面
2. 点击 "添加新目标"
3. 填写表单：
   - **目标 URL 前缀**：要代理的目标服务器 URL（例如 `https://example.com`）
   - **启用 JS 注入**：如果需要代理客户端请求，选择此项
4. 点击 "保存"

### 使用代理

通过以下格式的 URL 访问代理：

```
https://your-worker-url.workers.dev/proxy/https/example.com/path
```

这将代理 `https://example.com/path` 的内容。

## 6. 其他配置

### 添加内容替换规则

1. 在管理后台，导航到 "替换规则" 页面
2. 点击 "添加新规则"
3. 填写表单：
   - **名称**：规则描述
   - **搜索模式**：要查找的内容
   - **替换内容**：替换后的内容
   - **匹配类型**：string（字符串）或 regex（正则表达式）
4. 点击 "保存"

### 配置异步请求策略

1. 在管理后台，导航到 "异步策略" 页面
2. 点击 "添加新策略"
3. 填写表单：
   - **名称**：策略描述
   - **目标 URL 模式**：匹配客户端请求的正则表达式
   - **执行动作**：proxy（通过代理）或 direct（直接连接）
4. 点击 "保存"

## 7. 常见问题

- **无法访问管理后台**：确认您访问的是正确的 URL 并使用正确的密码
- **代理请求失败**：检查代理目标配置是否正确
- **内容替换不生效**：确认替换规则已启用并正确配置

更多详细信息，请参阅完整的 [DOCUMENTATION.md](DOCUMENTATION.md) 文件。 