# Gproxy-Js 故障排查指南

本文档提供了使用 Gproxy-Js 过程中可能遇到的常见问题及其解决方案。

## 1. 安装与配置问题

### 1.1 依赖安装失败

**问题**: 运行 `pnpm install` 时出现错误。

**可能原因**:
- Node.js 版本不兼容
- pnpm 版本过低
- 网络连接问题
- 包冲突

**解决方案**:
1. 确保使用 Node.js v18 或更高版本：`node --version`
2. 更新 pnpm 到最新版本：`npm install -g pnpm@latest`
3. 尝试使用代理或更改 npm 源：`pnpm config set registry https://registry.npmmirror.com/`
4. 删除 `node_modules` 目录和 `pnpm-lock.yaml` 文件后重试：
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### 1.2 Wrangler 配置问题

**问题**: Wrangler 命令报错，提示配置文件错误。

**可能原因**:
- `wrangler.jsonc` 文件格式错误
- 缺少必要的配置项
- 账户权限不足

**解决方案**:
1. 验证 `wrangler.jsonc` 文件的 JSON 格式是否正确
2. 确保包含所有必要的配置项（name, main, compatibility_date）
3. 运行 `wrangler whoami` 检查当前登录的账户
4. 如果需要，重新登录：`wrangler login`

### 1.3 环境变量未生效

**问题**: 应用无法读取环境变量。

**可能原因**:
- `.dev.vars` 文件不存在或格式错误
- 生产环境中未设置 secrets
- 变量名称不匹配

**解决方案**:
1. 确保本地开发时存在 `.dev.vars` 文件，格式为 `KEY=VALUE`
2. 检查生产环境中是否设置了所需的 secrets：`wrangler secret list`
3. 确保代码中使用的变量名与配置中的变量名匹配
4. 对于生产环境，重新设置 secret：`wrangler secret put JWT_SECRET`

## 2. 数据库问题

### 2.1 数据库迁移失败

**问题**: 运行 `wrangler d1 migrations apply` 命令失败。

**可能原因**:
- 数据库 ID 或绑定名称错误
- SQL 语法错误
- 权限不足
- 迁移文件路径错误

**解决方案**:
1. 检查 `wrangler.jsonc` 中的数据库配置是否正确
2. 验证迁移 SQL 文件的语法
3. 确保当前账户有权限操作该数据库
4. 指定正确的迁移目录：`wrangler d1 migrations apply DB --local --directory=./migrations`

### 2.2 数据库查询错误

**问题**: 应用运行时出现数据库查询错误。

**可能原因**:
- SQL 语法错误
- 表或列不存在
- 约束冲突（如唯一键冲突）
- D1 绑定未正确配置

**解决方案**:
1. 检查 SQL 查询语法
2. 验证表和列是否存在：`wrangler d1 execute DB "PRAGMA table_info(table_name)"`
3. 检查是否违反了唯一性约束
4. 确认 `wrangler.jsonc` 中的 D1 绑定配置正确

### 2.3 数据不一致

**问题**: 数据库中的数据与预期不符。

**可能原因**:
- 本地开发使用的是模拟数据库
- 多环境配置混淆
- 并发写入导致的竞态条件

**解决方案**:
1. 确认当前操作的是哪个环境的数据库
2. 使用 `wrangler d1 execute` 直接查询数据库内容
3. 实现适当的并发控制机制
4. 考虑重置开发环境的数据库：`wrangler d1 execute DB --local "DROP TABLE IF EXISTS table_name"`

## 3. 代理功能问题

### 3.1 代理请求失败

**问题**: 通过代理访问目标网站失败。

**可能原因**:
- 代理目标配置错误
- 目标服务器拒绝请求
- 请求超时
- CORS 问题

**解决方案**:
1. 检查代理目标配置是否正确
2. 确认目标服务器是否可以直接访问
3. 检查目标服务器是否有 IP 限制或地理位置限制
4. 添加适当的请求头（如 User-Agent）
5. 对于 CORS 问题，配置适当的响应头规则

**错误代码**: `PROXY_TARGET_ERROR`

### 3.2 内容替换不生效

**问题**: 配置的内容替换规则没有生效。

**可能原因**:
- 规则未启用
- 匹配条件不正确
- 优先级设置问题
- 内容类型不匹配

**解决方案**:
1. 确认替换规则的 `is_active` 设置为 1（启用）
2. 检查 URL 匹配模式是否正确
3. 验证内容类型匹配设置
4. 调整规则优先级
5. 对于正则表达式，测试匹配模式是否正确

**错误代码**: `REPLACE_RULE_NOT_APPLIED`

### 3.3 客户端请求拦截问题

**问题**: 客户端 AJAX/Fetch 请求未被正确代理。

**可能原因**:
- JS 注入未启用
- 异步请求策略配置错误
- 客户端脚本加载失败
- 浏览器扩展干扰

**解决方案**:
1. 确认代理目标的 `enable_js_injection` 设置为 1（启用）
2. 检查异步请求策略配置
3. 使用浏览器开发者工具检查客户端脚本是否正确加载
4. 尝试在无扩展的浏览器中测试

**错误代码**: `CLIENT_SCRIPT_ERROR`

## 4. 管理后台问题

### 4.1 无法访问管理后台

**问题**: 访问 `/admin/login` 或 `/admin/setup` 页面失败。

**可能原因**:
- Worker 部署不成功
- 路由配置错误
- 服务器错误

**解决方案**:
1. 确认 Worker 已成功部署
2. 检查 Cloudflare Dashboard 中的 Worker 日志
3. 确认访问的 URL 是否正确
4. 使用 `wrangler tail` 命令查看实时日志

**错误代码**: `ADMIN_ACCESS_ERROR`

### 4.2 登录失败

**问题**: 无法登录管理后台。

**可能原因**:
- 密码错误
- JWT 密钥配置问题
- Cookie 或存储问题

**解决方案**:
1. 确认使用的密码正确
2. 检查 JWT_SECRET 环境变量是否正确设置
3. 清除浏览器 Cookie 和本地存储
4. 如果忘记密码，可能需要重置数据库中的密码哈希：
   ```bash
   wrangler d1 execute DB "UPDATE settings SET value='new_hash' WHERE key='admin_password_hash'"
   ```

**错误代码**: `AUTH_FAILED`

### 4.3 管理后台操作失败

**问题**: 在管理后台进行添加、编辑或删除操作失败。

**可能原因**:
- 数据验证失败
- 数据库操作错误
- 会话过期
- 权限问题

**解决方案**:
1. 检查表单输入是否符合要求
2. 查看浏览器开发者工具中的网络请求和响应
3. 如果会话过期，重新登录
4. 检查 Worker 日志以获取详细错误信息

**错误代码**: `ADMIN_OPERATION_FAILED`

## 5. 性能和资源问题

### 5.1 Worker 超时

**问题**: Worker 请求处理超时。

**可能原因**:
- 请求处理时间超过限制（免费计划 50ms，付费计划 30s）
- 复杂的正则表达式导致性能问题
- 大量数据库查询
- 目标服务器响应慢

**解决方案**:
1. 优化代码，减少处理时间
2. 简化正则表达式
3. 减少数据库查询次数，考虑批量查询
4. 实现缓存机制
5. 升级到付费计划以获得更长的 CPU 时间

**错误代码**: `WORKER_TIMEOUT`

### 5.2 内存使用过高

**问题**: Worker 内存使用接近或超过限制（128MB）。

**可能原因**:
- 处理大型响应
- 内存泄漏
- 过多的并发请求

**解决方案**:
1. 使用流式处理而不是将整个响应加载到内存
2. 检查代码中的内存泄漏
3. 限制并发请求数量
4. 分解大型响应的处理

**错误代码**: `MEMORY_LIMIT_EXCEEDED`

### 5.3 请求频率限制

**问题**: 达到 Cloudflare Workers 的请求频率限制。

**可能原因**:
- 高流量
- 免费计划限制（每天 100,000 请求）
- 短时间内大量请求

**解决方案**:
1. 实现缓存策略减少请求数
2. 升级到付费计划
3. 实现请求限流机制
4. 优化客户端，减少不必要的请求

**错误代码**: `RATE_LIMIT_EXCEEDED`

## 6. 部署问题

### 6.1 部署失败

**问题**: `wrangler deploy` 命令失败。

**可能原因**:
- 账户权限问题
- 代码大小超过限制
- 配置错误
- 网络问题

**解决方案**:
1. 确认已正确登录 Wrangler：`wrangler whoami`
2. 检查代码大小是否超过限制（1MB 压缩后）
3. 验证 `wrangler.jsonc` 配置
4. 检查网络连接

**错误代码**: `DEPLOYMENT_FAILED`

### 6.2 部署成功但功能不正常

**问题**: Worker 部署成功，但功能不如预期。

**可能原因**:
- 环境变量缺失
- 数据库迁移未应用
- 代码中的环境检测问题
- 缓存问题

**解决方案**:
1. 确认所有必要的环境变量和 secrets 已设置
2. 检查数据库迁移是否已应用：`wrangler d1 migrations list DB`
3. 检查代码中的环境检测逻辑
4. 清除 Cloudflare 缓存

**错误代码**: `POST_DEPLOYMENT_ISSUE`

## 7. 特定错误代码和解决方案

### 7.1 `DB_CONNECTION_ERROR`

**问题**: 无法连接到 D1 数据库。

**解决方案**:
1. 确认 D1 数据库存在且配置正确
2. 检查 `wrangler.jsonc` 中的数据库 ID 和绑定名称
3. 验证当前环境（开发/预览/生产）的数据库配置
4. 重新创建数据库连接

### 7.2 `JWT_VERIFICATION_ERROR`

**问题**: JWT 验证失败。

**解决方案**:
1. 确认 JWT_SECRET 环境变量设置正确
2. 检查 JWT 是否过期
3. 验证 JWT 签名算法
4. 清除浏览器 Cookie 和本地存储，重新登录

### 7.3 `HTML_REWRITER_ERROR`

**问题**: HTML 内容处理过程中出错。

**解决方案**:
1. 检查目标网站的 HTML 是否有特殊结构
2. 简化内容替换规则
3. 检查是否有不兼容的 HTML 特性
4. 考虑使用更简单的字符串替换而不是 HTMLRewriter

### 7.4 `CACHE_OPERATION_FAILED`

**问题**: 缓存操作失败。

**解决方案**:
1. 确认 KV 命名空间配置正确
2. 检查缓存键的格式和长度
3. 验证缓存值的大小是否在限制范围内
4. 检查 KV 操作的频率是否超过限制

### 7.5 `REGEX_TIMEOUT`

**问题**: 正则表达式执行超时。

**解决方案**:
1. 简化复杂的正则表达式
2. 避免使用可能导致灾难性回溯的模式
3. 将大型文本分块处理
4. 考虑使用字符串匹配代替正则表达式

## 8. 调试技巧

### 8.1 查看 Worker 日志

```bash
# 实时查看日志
wrangler tail

# 查看特定 Worker 的日志
wrangler tail --name gproxy-js
```

### 8.2 检查数据库内容

```bash
# 查询表结构
wrangler d1 execute DB "PRAGMA table_info(table_name)"

# 查询表内容
wrangler d1 execute DB "SELECT * FROM table_name LIMIT 10"

# 执行特定查询
wrangler d1 execute DB "SELECT * FROM replace_rules WHERE is_active = 1"
```

### 8.3 测试环境变量

```bash
# 列出所有 secrets
wrangler secret list

# 检查环境变量是否生效
wrangler dev --local --env-from=.dev.vars
```

### 8.4 浏览器开发者工具

1. 打开浏览器开发者工具 (F12)
2. 检查网络请求和响应
3. 查看控制台错误
4. 检查客户端脚本是否正确加载和执行
5. 使用 "无痕模式" 或 "隐私浏览" 排除扩展干扰

## 9. 联系支持

如果您尝试了上述解决方案后问题仍然存在，请通过以下方式寻求帮助：

1. 在 GitHub 仓库提交 Issue：[https://github.com/yourusername/gproxy-js/issues](https://github.com/yourusername/gproxy-js/issues)
2. 提供详细的问题描述、错误消息和复现步骤
3. 包含您的环境信息（Node.js 版本、Wrangler 版本、操作系统等）
4. 如果可能，提供最小复现示例 