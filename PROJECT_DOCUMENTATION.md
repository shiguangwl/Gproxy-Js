# Gproxy-Js 项目文档

## 1. 项目概述

### 1.1 项目目标
Gproxy-Js 是一个基于 Cloudflare Workers 构建的高性能、可配置的智能请求代理服务。其主要目标是提供一个灵活的代理解决方案，能够根据用户定义的规则将传入请求路由到不同的目标服务器，并提供缓存、异步处理、日志记录和管理后台等功能。

### 1.2 主要功能
*   **动态请求代理**：根据可配置的规则（如路径、请求头、请求方法等）将请求转发到指定的目标。
*   **多目标支持**：可以配置多个目标服务器，并根据规则进行选择。
*   **缓存机制**：支持对代理的响应进行缓存，以提高性能和减少源服务器负载（可能使用 Cloudflare KV 或 R2）。
*   **异步处理**：支持对某些任务（如日志记录、Webhook 通知）进行异步处理，避免阻塞主代理流程。
*   **规则引擎**：强大的规则匹配引擎，支持复杂的匹配条件和逻辑。
*   **管理后台**：提供 Web UI 用于管理代理规则、目标、查看日志、配置缓存和异步策略等。
*   **用户认证**：保护管理后台，确保只有授权用户才能进行配置。
*   **日志记录**：详细记录代理请求和系统事件，方便追踪和审计。
*   **基于 Cloudflare Workers**：利用 Cloudflare 的全球网络，提供低延迟和高可用的代理服务。

### 1.3 技术栈
*   **运行时环境**: Cloudflare Workers
*   **Web 框架**: Hono.js (一个轻量级、快速的 Web 框架，适用于边缘计算环境)
*   **语言**: TypeScript
*   **数据库**: Cloudflare D1 (用于存储配置、规则、日志等结构化数据)
*   **缓存/存储**: Cloudflare KV / R2 (用于缓存响应、存储大对象等)
*   **前端 (管理后台)**: React (JSX) (用于构建交互式的管理界面)
*   **打包/构建**: Wrangler CLI, esbuild (通常由 Wrangler 内部使用)
*   **包管理**: pnpm

## 2. 架构设计

### 2.1 高层架构
Gproxy-Js 部署在 Cloudflare Workers 上，利用其边缘计算能力。传入的 HTTP 请求首先到达 Cloudflare 边缘节点，然后由 Gproxy-Js Worker 处理。

**文本描述架构:**
1.  **客户端请求**: 用户或外部系统向 Gproxy-Js 的 Worker URL 发送请求。
2.  **Cloudflare Worker**:
    *   **Hono 应用实例**: 作为请求入口，初始化中间件和路由。
    *   **中间件栈**:
        *   `SetupCheckMiddleware`: 检查应用是否已完成初始设置。
        *   `ConfigCheckMiddleware`: 检查关键配置是否正确加载。
        *   `AuthMiddleware`: (针对 `/admin` 路径) 验证用户身份。
    *   **路由器**: 根据请求路径分发到 `ProxyRoutes` 或 `AdminRoutes`。
3.  **代理路径 (`/proxy/*`)**:
    *   `ProxyService`: 处理核心代理逻辑。
    *   `RuleEngineService`: 根据请求匹配已定义的规则。
    *   `CacheService`: 检查和存储缓存响应。
    *   请求转发至目标服务器。
    *   `AsyncProcessorService`: (可选) 异步记录日志或触发事件。
4.  **管理路径 (`/admin/*`)**:
    *   `AdminService`: 处理管理后台的业务逻辑（如CRUD操作）。
    *   与 `D1Database` 交互，存储和检索配置数据。
    *   渲染 React 视图 (`src/views`) 返回给管理员。
5.  **后端服务**:
    *   **Cloudflare D1**: 存储规则、目标、用户、日志等。
    *   **Cloudflare KV/R2**: (如果使用) 存储缓存数据。
    *   **目标服务器**: 实际处理被代理请求的后端服务。

**Mermaid 图 (简化版):**
```mermaid
graph TD
    Client --> Edge[Cloudflare Edge]
    Edge --> Worker[Gproxy-Js Worker]

    subgraph Worker
        Hono[Hono App] --> Middleware[Middleware Stack]
        Middleware --> Router{Request Router}

        Router -- "/proxy/*" --> ProxyFlow[Proxy Request Flow]
        Router -- "/admin/*" --> AdminFlow[Admin Request Flow]

        ProxyFlow --> ProxyService[services/proxyService.ts]
        ProxyService --> RuleEngine[services/ruleEngineService.ts]
        ProxyService --> Cache[services/cacheService.ts]
        ProxyService --> Target[Target Server]
        ProxyService --> AsyncProcP[services/asyncProcessor.ts for Proxy]

        AdminFlow --> AdminService[services/adminService.ts]
        AdminService --> D1Admin[db/index.ts for Admin Data]
        AdminService --> Views[views/* (React UI)]
        AdminService --> AsyncProcA[services/asyncProcessor.ts for Admin Events]


        RuleEngine --> D1Rules[db/index.ts for Rules]
        Cache --> KVCache[KV/R2 for Cache]
    end

    D1Admin --> D1[(Cloudflare D1)]
    D1Rules --> D1
    KVCache --> KVStore[(Cloudflare KV/R2)]
```

### 2.2 关键组件及其交互
*   **[`src/index.ts`](src/index.ts:0)**: Worker 的入口文件，初始化 Hono 应用，注册全局中间件和路由。
*   **Hono App**: 核心的 Web 应用实例，负责处理 HTTP 请求和响应。
*   **Middleware (`src/middleware`)**: 在请求处理链中执行特定任务的函数，如认证、配置检查。
*   **Routes (`src/routes`)**: 定义不同路径下的请求处理器。
    *   [`admin.ts`](src/routes/admin.ts:0): 处理所有 `/admin` 开头的请求，用于管理后台。
    *   [`proxy.ts`](src/routes/proxy.ts:0): 处理所有代理请求。
*   **Services (`src/services`)**:封装业务逻辑，被路由处理器调用。
*   **Database (`src/db`)**: 通过 `D1` ORM/client 与 Cloudflare D1 数据库交互。
*   **Views (`src/views`)**: React (JSX) 组件，构成管理后台的用户界面。

## 3. 核心模块详解

### 3.1 数据库 (`src/db`)
*   **[`src/db/index.ts`](src/db/index.ts:0)**: 数据库连接和查询的封装。
*   **[`src/db/schema.sql`](src/db/schema.sql:0)**: 定义数据库的表结构。

#### 3.1.1 D1 数据库使用
Gproxy-Js 使用 Cloudflare D1 作为其主要的持久化存储。D1 是一个构建在 SQLite 上的无服务器 SQL 数据库，专为 Cloudflare Workers 设计。所有配置数据（如代理规则、目标服务器、用户信息）以及运行日志都存储在 D1 数据库中。

#### 3.1.2 表结构概述
表结构定义在 [`src/db/schema.sql`](src/db/schema.sql:0) 文件中。主要可能包含以下表：
*   `users`: 存储管理后台用户信息 (用户名, 密码哈希等)。
*   `rules`: 存储代理规则 (匹配条件, 优先级, 目标 ID, 缓存策略等)。
*   `targets`: 存储目标服务器信息 (URL, 名称, 健康检查配置等)。
*   `cache_policies`: 缓存策略配置。
*   `async_policies`: 异步处理策略配置。
*   `logs`: 存储请求日志或系统事件日志。
*   `settings`: 存储全局配置项。
(具体表结构需参考 [`src/db/schema.sql`](src/db/schema.sql:0) 的实际内容)

#### 3.1.3 迁移管理方法
数据库迁移通过 Wrangler CLI 进行管理。迁移文件通常位于 `migrations/` 目录下 (相对于 `wrangler.jsonc` 或 `wrangler.toml` 中定义的 D1 绑定)。
*   **创建迁移**: `wrangler d1 migrations create <DB_BINDING_NAME> <MIGRATION_NAME>`
*   **应用迁移 (本地)**: `wrangler d1 migrations apply <DB_BINDING_NAME> --local`
*   **应用迁移 (生产)**: `wrangler d1 migrations apply <DB_BINDING_NAME>`

### 3.2 中间件 (`src/middleware`)
中间件是 Hono 应用处理请求的核心部分，按顺序执行。

#### 3.2.1 [`auth.ts`](src/middleware/auth.ts:0) (`authMiddleware`)
*   **功能**: 负责管理后台 (`/admin/*` 路径) 的用户认证和授权。
*   **用途**: 检查请求中是否包含有效的会话令牌或 API密钥。如果用户未认证，则重定向到登录页面或返回 401/403 错误。它通常会从 Cookie 或请求头中读取认证信息，并与数据库中的用户信息进行校验。

#### 3.2.2 [`config-check.ts`](src/middleware/config-check.ts:0) (`configCheckMiddleware`)
*   **功能**: 检查应用运行所需的关键配置是否已加载且有效。
*   **用途**: 在应用启动或处理请求前，确保所有必要的环境变量、数据库连接信息等已正确配置。如果配置缺失或无效，可能会阻止应用启动或返回错误页面，引导用户完成配置。

#### 3.2.3 [`setup-check.ts`](src/middleware/setup-check.ts:0) (`setupCheckMiddleware`)
*   **功能**: 检查应用是否已完成首次初始化设置。
*   **用途**: 对于首次部署的应用，可能需要进行一些初始化步骤（如创建管理员账户、设置基本参数）。此中间件会检查初始化状态，如果未完成，则可能将用户重定向到设置页面 (`/admin/setup`)。

### 3.3 路由 (`src/routes`)
路由定义了应用如何响应不同 URL 和 HTTP 方法的请求。

#### 3.3.1 `admin` 路由 ([`src/routes/admin.ts`](src/routes/admin.ts:0))
*   **结构**: 通常会包含针对管理后台各个功能的子路由，如用户管理、规则管理、目标管理、日志查看等。
*   **主要端点**:
    *   `GET /admin/login`: 显示登录页面。
    *   `POST /admin/login`: 处理登录请求。
    *   `GET /admin/logout`: 处理登出请求。
    *   `GET /admin/setup`: 显示初始化设置页面。
    *   `POST /admin/setup`: 处理初始化设置。
    *   `GET /admin/dashboard`: 显示仪表盘。
    *   `GET /admin/rules`: 获取规则列表/显示规则管理页面。
    *   `POST /admin/rules`: 创建新规则。
    *   `PUT /admin/rules/:id`: 更新指定规则。
    *   `DELETE /admin/rules/:id`: 删除指定规则。
    *   (类似地，还会有 `/admin/targets`, `/admin/cache-policies`, `/admin/async-policies`, `/admin/logs` 等端点)
    *   这些端点通常会调用 `adminService` 来处理业务逻辑，并使用 `src/views` 中的 React 组件渲染 HTML 响应。

#### 3.3.2 `proxy` 路由 ([`src/routes/proxy.ts`](src/routes/proxy.ts:0))
*   **结构**: 通常会有一个通配符路由 (e.g., `app.all('/proxy/*', ...)` 或 `app.all('*', ...)` 如果整个 worker 专注于代理) 来捕获所有需要代理的请求。
*   **主要端点**:
    *   `ALL /proxy/*` (或类似的通配符路径): 接收所有传入的代理请求。此端点会调用 `proxyService` 来执行核心的代理逻辑，包括规则匹配、请求修改、目标转发、响应处理和缓存。

### 3.4 服务 (`src/services`)
服务层封装了应用的业务逻辑，使路由处理器保持简洁。

#### 3.4.1 [`adminService.ts`](src/services/adminService.ts:0)
*   **功能**: 提供管理后台所需的所有业务逻辑。
*   **详细描述**:
    *   用户管理：处理用户注册（初始化设置时）、登录、登出、会话管理。
    *   配置管理：提供 CRUD (创建、读取、更新、删除) 操作接口，用于管理代理规则、目标服务器、缓存策略、异步处理策略等。
    *   数据校验：在保存配置前进行数据有效性验证。
    *   与数据库交互：调用 `src/db` 中的函数来持久化和检索数据。
    *   日志查询：提供查询和展示系统日志或请求日志的功能。

#### 3.4.2 [`asyncProcessor.ts`](src/services/asyncProcessor.ts:0)
*   **功能**: 处理不需要立即完成的后台任务，以避免阻塞主请求处理流程。
*   **详细描述**:
    *   日志批处理：将请求日志、错误日志等先收集起来，然后批量写入数据库或外部日志服务。
    *   Webhook 通知：当特定事件发生时（如规则匹配、错误发生），异步发送 Webhook 通知到配置的 URL。
    *   队列处理：可能与 Cloudflare Queues 集成，将任务放入队列，由另一个 Worker 或同一 Worker 的调度事件处理。
    *   确保任务的可靠执行，可能包含重试机制。

#### 3.4.3 [`cacheService.ts`](src/services/cacheService.ts:0)
*   **功能**: 管理代理响应的缓存。
*   **详细描述**:
    *   缓存读写：根据请求和缓存策略，从缓存（如 Cloudflare KV 或 R2）中读取响应，或将新的响应存入缓存。
    *   缓存键生成：根据请求的特征（URL, Headers等）生成唯一的缓存键。
    *   缓存策略执行：实现不同的缓存策略，如 TTL (Time To Live)、Stale-While-Revalidate 等。
    *   缓存清除：提供手动或自动清除缓存的接口（例如，当相关配置更新时）。
    *   与 Cloudflare Cache API 或 KV/R2 绑定进行交互。

#### 3.4.4 [`proxyService.ts`](src/services/proxyService.ts:0)
*   **功能**: 实现核心的请求代理和转发逻辑。
*   **详细描述**:
    *   请求接收与解析：接收来自客户端的 HTTP 请求，解析其头部、正文、查询参数等。
    *   规则匹配：调用 `ruleEngineService` 来找到与当前请求匹配的代理规则。
    *   请求转换/修改：根据匹配到的规则，可能需要修改请求的 URL、头部、方法或正文，然后再转发到目标服务器。
    *   目标选择与负载均衡：如果规则指向多个目标或一个目标组，则选择合适的目标服务器，并可能实现简单的负载均衡策略。
    *   请求转发：使用 `fetch` API 将修改后的请求发送到选定的目标服务器。
    *   响应处理：接收来自目标服务器的响应，并可能根据规则对其进行修改（如添加/删除头部）。
    *   缓存交互：在转发请求前检查缓存（调用 `cacheService`），在收到响应后存储缓存。
    *   错误处理：处理连接目标服务器失败、超时等错误，并返回适当的错误响应给客户端。
    *   日志记录：记录请求和响应的详细信息，可能通过 `asyncProcessorService`。

#### 3.4.5 [`ruleEngineService.ts`](src/services/ruleEngineService.ts:0)
*   **功能**: 负责加载、解析和匹配代理规则。
*   **详细描述**:
    *   规则加载：从数据库 (`D1`) 加载所有已定义的代理规则。
    *   规则评估：针对每个传入的请求，遍历规则列表，根据规则中定义的条件（如请求路径、方法、头部、查询参数、来源 IP 等）进行匹配。
    *   优先级处理：如果多条规则匹配，则根据规则的优先级确定最终应用的规则。
    *   条件逻辑：支持复杂的匹配条件，可能包括正则表达式、通配符、逻辑与/或等。
    *   返回匹配结果：向 `proxyService` 返回匹配到的规则（或无匹配结果），以及该规则关联的目标、缓存策略等信息。

### 3.5 视图/UI (`src/views`)
管理后台的用户界面由 React (JSX) 组件构成，这些组件在服务器端渲染 (SSR) 或通过 Hono 的 JSX 中间件直接返回给客户端。

#### 3.5.1 后台管理界面主要页面
*   **[`login.tsx`](src/views/admin/login.tsx:0)**: 用户登录表单。
*   **[`setup.tsx`](src/views/admin/setup.tsx:0)**: 应用首次初始化设置页面，如创建管理员账户。
*   **[`dashboard.tsx`](src/views/admin/dashboard.tsx:0)**: 登录后的主仪表盘，显示关键统计信息和导航。
*   **[`rules.tsx`](src/views/admin/rules.tsx:0)**: 代理规则列表、创建、编辑和删除规则的界面。
*   **[`targets.tsx`](src/views/admin/targets.tsx:0)**: 目标服务器列表、创建、编辑和删除目标的界面。
*   **[`cache.tsx`](src/views/admin/cache.tsx:0)**: 缓存策略配置、缓存管理（如清除缓存）的界面。
*   **[`async-policies.tsx`](src/views/admin/async-policies.tsx:0)**: 异步处理策略（如Webhook）配置界面。
*   **[`logs.tsx`](src/views/admin/logs.tsx:0)**: 查看和筛选请求日志或系统事件日志的界面。
*   **[`default.tsx`](src/views/layouts/default.tsx:0)**: 所有管理页面的通用布局组件，包含导航栏、页头、页脚等。

## 4. 核心流程

### 4.1 请求代理流程
1.  **接收请求**: 客户端请求到达 Cloudflare Worker 上的 Gproxy-Js 实例。
2.  **中间件处理**: 请求首先经过全局中间件（如 `setupCheck`, `configCheck`）。
3.  **路由匹配**: Hono 路由器将请求导向 `proxy` 路由处理器 ([`src/routes/proxy.ts`](src/routes/proxy.ts:0))。
4.  **`proxyService` 调用**: 路由处理器调用 [`proxyService.proxyRequest()`](src/services/proxyService.ts:0) (假设的方法名)。
5.  **规则匹配 (`ruleEngineService`)**:
    *   `proxyService` 调用 [`ruleEngineService.matchRule(request)`](src/services/ruleEngineService.ts:0)。
    *   `ruleEngineService` 从 D1 加载规则，并根据请求特征（URL、Headers等）进行匹配。
    *   返回最佳匹配规则或无匹配。
6.  **无匹配规则**: 如果没有规则匹配，`proxyService` 可能返回默认响应（如 404 或直接传递请求，取决于配置）。
7.  **规则匹配成功**:
    *   **缓存检查 (`cacheService`)**: `proxyService` 调用 [`cacheService.get(cacheKey, rule.cachePolicy)`](src/services/cacheService.ts:0)。
        *   如果命中有效缓存，`cacheService` 返回缓存的响应，`proxyService` 将其返回给客户端，流程结束。
    *   **请求修改**: `proxyService` 根据规则修改请求（如重写 URL、添加/修改 Headers）。
    *   **目标选择**: 根据规则确定目标服务器。
    *   **转发请求**: `proxyService` 使用 `fetch()` 将修改后的请求发送到目标服务器。
    *   **接收响应**: 从目标服务器接收响应。
    *   **响应修改**: `proxyService` 根据规则修改响应（如添加/修改 Headers）。
    *   **缓存存储 (`cacheService`)**: 如果规则允许缓存，`proxyService` 调用 [`cacheService.set(cacheKey, response, rule.cachePolicy)`](src/services/cacheService.ts:0) 将响应存入缓存。
    *   **异步处理 (`asyncProcessorService`)**: `proxyService` (可选) 调用 [`asyncProcessorService.logRequest(request, response, rule)`](src/services/asyncProcessor.ts:0) 或 [`asyncProcessorService.triggerEvent()`](src/services/asyncProcessor.ts:0)。
8.  **返回响应**: `proxyService` 将最终响应返回给客户端。

### 4.2 用户认证流程
1.  **访问管理页面**: 用户浏览器请求 `/admin/*` 下的受保护资源。
2.  **`authMiddleware` 拦截**: [`auth.ts`](src/middleware/auth.ts:0) 中间件处理请求。
3.  **检查会话**: 中间件检查请求中是否存在有效的会话 Cookie 或 Authorization Header。
    *   **会话有效**: 从会话中提取用户信息，将其附加到请求上下文 (`c.set('user', userInfo)`)，然后调用 `next()` 继续处理。
    *   **会话无效/不存在**:
        *   如果请求的是登录页面 (`/admin/login`) 或设置页面 (`/admin/setup` 且未设置)，则允许访问。
        *   否则，重定向到登录页面 (`/admin/login`) 或返回 401/403 错误。
4.  **登录操作**:
    *   用户在 [`login.tsx`](src/views/admin/login.tsx:0) 页面提交用户名和密码。
    *   请求发送到 `POST /admin/login` 端点。
    *   `admin` 路由调用 [`adminService.login(username, password)`](src/services/adminService.ts:0)。
    *   `adminService` 校验凭证（通常与 D1 数据库中的用户记录比较）。
    *   **验证成功**: 创建会话（如生成 JWT 并设置到 Cookie），重定向到管理后台仪表盘 (`/admin/dashboard`)。
    *   **验证失败**: 返回登录页面并显示错误信息。

### 4.3 管理后台各项功能的配置流程
以配置**代理规则**为例：
1.  **用户导航**: 管理员登录后，通过导航菜单访问“规则管理”页面 (e.g., `/admin/rules`)。
2.  **加载数据**:
    *   `GET /admin/rules` 请求由 [`admin.ts`](src/routes/admin.ts:0) 中的路由处理。
    *   路由调用 [`adminService.getRules()`](src/services/adminService.ts:0)。
    *   `adminService` 从 D1 数据库查询规则列表。
    *   数据传递给 [`rules.tsx`](src/views/admin/rules.tsx:0) 视图进行渲染。
3.  **用户操作 (创建/编辑)**:
    *   管理员点击“创建新规则”按钮或“编辑”现有规则。
    *   表单（可能在模态框或新页面中）显示，包含规则的各个字段（名称、匹配条件、目标、优先级、缓存策略等）。
4.  **提交配置**:
    *   管理员填写表单并提交。
    *   前端将表单数据通过 `POST /admin/rules` (创建) 或 `PUT /admin/rules/:id` (更新) 发送到后端。
5.  **后端处理**:
    *   [`admin.ts`](src/routes/admin.ts:0) 中的相应路由处理器接收请求。
    *   路由处理器调用 [`adminService.createRule(data)`](src/services/adminService.ts:0) 或 [`adminService.updateRule(id, data)`](src/services/adminService.ts:0)。
    *   `adminService`:
        *   验证输入数据的有效性。
        *   与 D1 数据库交互，创建或更新规则记录。
        *   可能需要清除相关缓存（如规则缓存，如果 `ruleEngineService` 做了内存缓存）。
    *   返回成功或失败的响应。
6.  **前端更新**: 页面刷新或通过 AJAX 更新规则列表，显示最新的配置。

其他配置（如目标、缓存策略等）遵循类似的流程。

## 5. 配置与部署

### 5.1 详细解释 `.env.example` 中的所有环境变量
`.env.example` 文件列出了项目运行所需的环境变量。在部署或本地开发时，应复制此文件为 `.env` 并填写真实值。
```ini
# .env.example (示例内容，具体请参考项目中的实际文件)

# 应用基本配置
APP_ENV="development" # 环境 (development, production)
APP_KEY="base64:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=" # 应用密钥, 用于加密等, Hono SecureCookie 可能需要
LOG_LEVEL="info" # 日志级别 (debug, info, warn, error)

# 数据库 (D1)
# D1 绑定名称在 wrangler.jsonc/wrangler.toml 中定义，并通过 c.env.DB 访问
# 通常不需要在此处直接配置 D1 连接字符串，除非有特殊用途

# 管理员账户 (用于首次设置)
INITIAL_ADMIN_USER="admin"
INITIAL_ADMIN_PASSWORD="changeme" # 强烈建议首次启动后修改

# JWT 或会话配置 (如果使用)
JWT_SECRET="your-very-strong-jwt-secret"
SESSION_SECRET="your-very-strong-session-secret"
SESSION_EXPIRY_SECONDS=3600

# Cloudflare KV Namespace (如果用于缓存或其他存储)
# KV 绑定名称在 wrangler.jsonc/wrangler.toml 中定义，并通过 c.env.KV_NAMESPACE 访问

# Cloudflare R2 Bucket (如果用于缓存或其他存储)
# R2 绑定名称在 wrangler.jsonc/wrangler.toml 中定义，并通过 c.env.R2_BUCKET 访问

# 其他服务特定配置
# EXAMPLE_API_KEY="xxxxxxxxxx"
```
**注意**: 上述内容为通用示例。请务必查阅项目中的实际 [` .env.example`](.env.example:0) 文件以获取准确的环境变量列表及其说明。

### 5.2 详细解释 [`wrangler.jsonc`](wrangler.jsonc) 中的配置项
[`wrangler.jsonc`](wrangler.jsonc) (或 `wrangler.toml`) 是 Cloudflare Workers 的配置文件，用于定义 Worker 的行为、构建方式以及绑定的服务。
```jsonc
// wrangler.jsonc (示例内容，具体请参考项目中的实际文件)
{
  "name": "gproxy-js", // Worker 的名称
  "main": "src/index.ts", // Worker 的入口文件
  "compatibility_date": "YYYY-MM-DD", // Workers 运行时的兼容性日期
  "compatibility_flags": [], // 启用的兼容性标志

  "account_id": "YOUR_ACCOUNT_ID", // 你的 Cloudflare 账户 ID (通常从环境变量或登录状态获取)
  "workers_dev": true, // 是否启用 *.workers.dev 子域进行快速预览

  "vars": { // 环境变量，会注入到 Worker 中，优先级低于 .env 文件
    "APP_ENV": "production"
  },

  "d1_databases": [ // D1 数据库绑定
    {
      "binding": "DB", // 在 Worker 代码中通过 c.env.DB 访问此数据库
      "database_name": "gproxy-js-db", // D1 控制台中显示的数据库名称
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // D1 数据库的唯一 ID
      "preview_database_id": "gproxy-js-db-preview", // (可选) 用于 wrangler dev --local 的预览数据库ID
      "migrations_table": "d1_migrations", // (可选) 存储迁移状态的表名
      "migrations_dir": "migrations" // (可选) 存放数据库迁移文件的目录
    }
  ],

  "kv_namespaces": [ // KV Namespace 绑定
    {
      "binding": "CACHE_KV", // 在 Worker 代码中通过 c.env.CACHE_KV 访问
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // KV Namespace ID
      "preview_id": "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" // (可选) 用于本地开发的预览 KV ID
    }
  ],

  "r2_buckets": [ // R2 Bucket 绑定
    {
      "binding": "LOG_BUCKET", // 在 Worker 代码中通过 c.env.LOG_BUCKET 访问
      "bucket_name": "gproxy-js-logs", // R2 Bucket 名称
      "preview_bucket_name": "gproxy-js-logs-preview" // (可选) 用于本地开发的预览 Bucket 名称
    }
  ],

  "triggers": { // (可选) Cron Triggers 用于调度任务
    "crons": ["0 * * * *"] // 每小时执行一次 (示例)
  },

  "build": { // 构建配置
    "command": "pnpm run build", // 构建 Worker 的命令 (如果需要自定义构建步骤)
    "upload": {
      "format": "service-worker" // Worker 的格式
    }
  },

  "dev": { // wrangler dev 的本地开发配置
    "ip": "127.0.0.1",
    "port": 8787,
    "local_protocol": "http",
    "persist_to": ".wrangler/state/v3" // 本地开发时持久化数据的路径
  }
}
```
**关键绑定解释**:
*   **`d1_databases`**: 将 D1 数据库实例绑定到 Worker。`binding` 属性定义了在代码中访问该数据库的变量名 (e.g., `c.env.DB`)。
*   **`kv_namespaces`**: 将 KV Namespace 绑定到 Worker，常用于缓存或简单键值存储。
*   **`r2_buckets`**: 将 R2 Bucket 绑定到 Worker，用于存储大对象如日志文件、媒体资源等。

### 5.3 部署到 Cloudflare Workers 的步骤
1.  **安装 Wrangler CLI**: 如果尚未安装，全局安装最新版的 Wrangler：
    ```bash
    npm install -g wrangler
    # 或者使用 pnpm
    pnpm add -g wrangler
    ```
2.  **登录 Wrangler**: 授权 Wrangler访问你的 Cloudflare 账户：
    ```bash
    wrangler login
    ```
3.  **安装项目依赖**:
    ```bash
    pnpm install
    ```
4.  **构建项目** (如果 `wrangler.jsonc` 中没有自动构建或需要特定步骤):
    通常 `package.json` 会有 `build` 脚本，例如:
    ```bash
    pnpm run build
    ```
    此步骤会将 TypeScript 编译为 JavaScript 并进行打包。
5.  **配置环境变量**:
    *   对于生产环境，可以在 Cloudflare Dashboard 的 Worker 设置中配置 Secrets 和 Variables。
    *   或者，在 `wrangler.jsonc` (或 `wrangler.toml`) 中定义 `vars`，但敏感信息应使用 Secrets。
6.  **运行数据库迁移 (首次部署或有新的迁移时)**:
    ```bash
    wrangler d1 migrations apply DB_BINDING_NAME --remote
    # 将 DB_BINDING_NAME 替换为 wrangler.jsonc 中定义的 D1 绑定名称，如 "DB"
    ```
7.  **部署 Worker**:
    ```bash
    wrangler deploy
    # 或者 wrangler publish (旧版命令，deploy 是推荐的)
    ```
    Wrangler 会将构建好的 Worker 代码上传到 Cloudflare 网络。成功后会显示 Worker 的 URL。

### 5.4 如何运行数据库迁移
数据库迁移用于管理数据库 schema 的版本控制和变更。
1.  **确保 `wrangler.jsonc` 中 D1 绑定配置了 `migrations_dir`**:
    例如: `"migrations_dir": "migrations"`
    并在项目根目录下创建 `migrations` 文件夹。
2.  **创建新的迁移文件**:
    当需要更改数据库 schema 时（如添加表、修改列），创建一个新的 SQL 迁移文件。
    ```bash
    wrangler d1 migrations create <DB_BINDING_NAME> <MIGRATION_DESCRIPTION>
    # 例如: wrangler d1 migrations create DB add_users_table
    ```
    这会在 `migrations` 目录下生成一个类似 `0000_add_users_table.sql` 的文件。编辑此文件写入 DDL 语句。
3.  **应用迁移到本地开发数据库**:
    在本地开发 (`wrangler dev --local`) 时，应用迁移到本地 D1 模拟数据库：
    ```bash
    wrangler d1 migrations apply <DB_BINDING_NAME> --local
    ```
4.  **应用迁移到生产/预览数据库**:
    部署到 Cloudflare 前或部署后，应用迁移到实际的 D1 数据库：
    ```bash
    wrangler d1 migrations apply <DB_BINDING_NAME> --remote
    # 或者 wrangler d1 migrations apply <DB_BINDING_NAME> (如果已配置默认环境)
    ```
    Wrangler 会记录已应用的迁移，确保每个迁移只执行一次。

## 6. 开发指南

### 6.1 如何设置本地开发环境
1.  **安装前提**:
    *   Node.js (推荐 LTS 版本)
    *   pnpm (项目使用的包管理器)
    *   Wrangler CLI (参见 5.3 节)
2.  **克隆项目**:
    ```bash
    git clone <repository_url>
    cd gproxy-js
    ```
3.  **安装依赖**:
    ```bash
    pnpm install
    ```
4.  **配置本地环境变量**:
    *   复制 `.env.example` 为 `.env`。
    *   编辑 `.env` 文件，填入本地开发所需的配置，特别是 `INITIAL_ADMIN_USER` 和 `INITIAL_ADMIN_PASSWORD` (如果适用)。
    *   对于 D1, KV, R2 等绑定，Wrangler 的本地开发模式 (`wrangler dev --local`) 会使用本地模拟或需要配置预览版 ID。确保 `wrangler.jsonc` 中有相应的 `preview_database_id`, `preview_id`, `preview_bucket_name` 或 Wrangler 会自动创建本地模拟。
5.  **运行本地数据库迁移** (如果项目刚克隆或有新的迁移):
    ```bash
    wrangler d1 migrations apply <DB_BINDING_NAME> --local
    ```
6.  **启动本地开发服务器**:
    ```bash
    pnpm run dev
    # 这通常会执行 wrangler dev --local src/index.ts (或 wrangler.jsonc 中定义的 main)
    ```
    Wrangler 会启动一个本地服务器 (默认为 `http://localhost:8787`)，模拟 Cloudflare Workers 环境。代码更改会自动重新加载。

### 6.2 编码规范（如果适用）
*   **TypeScript**: 遵循 TypeScript 的最佳实践，使用强类型。
*   **ESLint/Prettier**: 项目可能配置了 ESLint 和 Prettier 来强制代码风格和质量。
    *   运行 `pnpm run lint` 来检查代码。
    *   运行 `pnpm run format` 来格式化代码。
*   **命名约定**: 遵循通用的 JavaScript/TypeScript 命名约定 (e.g., camelCase for variables/functions, PascalCase for classes/types/interfaces/components)。
*   **注释**: 对复杂的逻辑或公共 API 进行清晰的注释。
*   **模块化**: 将代码组织成逻辑清晰的模块和服务。

### 6.3 如何添加新功能或模块
以添加一个新的管理页面和相关 API 为例：
1.  **定义需求**: 明确新功能的目标和范围。
2.  **数据库设计 (如果需要)**:
    *   如果新功能需要新的数据存储，更新 [`src/db/schema.sql`](src/db/schema.sql:0)。
    *   创建新的数据库迁移文件 (`wrangler d1 migrations create ...`) 并应用它。
3.  **创建服务 (`src/services`)**:
    *   在 `src/services` 目录下创建一个新的服务文件 (e.g., `newFeatureService.ts`)。
    *   实现新功能相关的业务逻辑，包括与数据库的交互。
4.  **创建路由 (`src/routes`)**:
    *   在 [`src/routes/admin.ts`](src/routes/admin.ts:0) (或新建路由文件) 中为新功能添加 API 端点。
    *   路由处理器应调用新创建的服务。
5.  **创建视图/UI (`src/views`)**:
    *   在 `src/views/admin` 目录下创建一个新的 JSX 文件 (e.g., `newFeaturePage.tsx`)。
    *   使用 React 组件构建新页面的 UI。
    *   确保页面可以与后端 API 交互以获取和提交数据。
    *   在 [`src/views/layouts/default.tsx`](src/views/layouts/default.tsx:0) 或其他导航组件中添加新页面的链接。
6.  **更新中间件 (如果需要)**: 如果新功能有特殊的认证或检查需求，可能需要调整现有中间件或添加新的中间件。
7.  **编写测试 (推荐)**: 为新的服务和 API 端点编写单元测试或集成测试。
8.  **文档更新**: 更新本文档 ([`PROJECT_DOCUMENTATION.md`](PROJECT_DOCUMENTATION.md)) 和其他相关文档，说明新功能的使用和配置。
9.  **本地测试**: 使用 `pnpm run dev` 彻底测试新功能。
10. **代码审查与合并**: 遵循项目的 Git 工作流进行代码审查和合并。

## 7. API 参考 (可选，或链接到 Swagger/Postman)

### 7.1 Admin API (主要端点示例)
所有端点均以 `/admin` 为前缀，并受 [`authMiddleware`](src/middleware/auth.ts:0) 保护 (除登录/设置外)。

*   **Auth**
    *   `GET /login`: 显示登录页。
    *   `POST /login`: { username, password } -> 登录成功或失败。
    *   `GET /logout`: 登出。
    *   `GET /setup`: 显示设置页 (如果未设置)。
    *   `POST /setup`: { adminUser, adminPassword, ...otherSettings } -> 完成初始化设置。
*   **Rules**
    *   `GET /rules`: 获取所有规则列表。
    *   `POST /rules`: { ruleData } -> 创建新规则。
    *   `GET /rules/:id`: 获取特定规则。
    *   `PUT /rules/:id`: { ruleData } -> 更新特定规则。
    *   `DELETE /rules/:id`: 删除特定规则。
*   **Targets**
    *   `GET /targets`: 获取所有目标列表。
    *   `POST /targets`: { targetData } -> 创建新目标。
    *   (类似 CRUD 端点)
*   **Cache Policies, Async Policies, Logs**
    *   (类似 CRUD 或查询端点)

### 7.2 Proxy API
*   `ALL /proxy/*` (或项目配置的代理根路径):
    *   接收任意 HTTP 方法和路径。
    *   根据匹配的规则将请求代理到目标服务器。
    *   请求头和正文会尽可能透传或根据规则修改。

(建议使用 Swagger/OpenAPI 规范来详细定义 API，并可以通过工具生成交互式文档。)

## 8. 故障排查

### 8.1 常见问题及解决方案
*   **问题: Worker 返回 500 错误或意外行为。**
    *   **解决方案**:
        1.  检查 Cloudflare Dashboard 中的 Worker 日志 (实时日志或历史日志)。
        2.  使用 `wrangler dev` 在本地复现问题，查看控制台输出和更详细的错误信息。
        3.  检查 `.env` 文件和 Cloudflare Worker 环境变量/Secrets 配置是否正确。
        4.  确认 D1 数据库、KV、R2 绑定是否正确，并且服务可用。
*   **问题: 管理后台无法登录。**
    *   **解决方案**:
        1.  确认 `INITIAL_ADMIN_USER` 和 `INITIAL_ADMIN_PASSWORD` 在首次设置时是否正确使用，或后续密码是否正确。
        2.  检查浏览器 Cookie 是否被禁用或清除。
        3.  查看 Worker 日志，寻找认证相关的错误信息。
        4.  如果忘记密码且没有密码重置功能，可能需要直接操作 D1 数据库 (需谨慎)。
*   **问题: 代理规则不生效或未按预期匹配。**
    *   **解决方案**:
        1.  仔细检查管理后台中规则的配置：匹配条件 (路径、Host、Headers等)、优先级、启用的状态。
        2.  使用 `wrangler dev` 并添加详细日志输出来观察 `ruleEngineService` 的匹配过程。
        3.  确保规则的正则表达式或通配符语法正确。
        4.  检查是否有其他更高优先级的规则意外匹配了请求。
*   **问题: 部署失败 (`wrangler deploy` 报错)。**
    *   **解决方案**:
        1.  仔细阅读 Wrangler CLI 输出的错误信息，通常会指明问题所在。
        2.  检查 `wrangler.jsonc` (或 `wrangler.toml`) 配置文件语法是否正确，`account_id` 是否设置。
        3.  确保网络连接正常，可以访问 Cloudflare API。
        4.  检查 Worker 代码大小是否超出限制 (免费版通常为 1MB 压缩后)。
*   **问题: 数据库迁移失败。**
    *   **解决方案**:
        1.  检查迁移 SQL 文件的语法是否正确。
        2.  确保 `<DB_BINDING_NAME>` 与 `wrangler.jsonc` 中的配置一致。
        3.  如果是在已存在数据的表上操作，确保迁移不会导致数据丢失或冲突 (除非有意为之)。
        4.  查看 Wrangler 输出的详细错误。
*   **问题: 本地开发 (`wrangler dev --local`) 时 D1/KV/R2 数据不一致或行为异常。**
    *   **解决方案**:
        1.  Wrangler 的本地模拟可能与云端环境存在细微差别。
        2.  确保 `wrangler.jsonc` 中为本地开发配置了正确的 `preview_database_id`, `preview_id`, `preview_bucket_name`，或者允许 Wrangler 使用其默认的本地持久化路径 (`.wrangler/state`)。
        3.  尝试清除本地持久化数据 (`rm -rf .wrangler/state`) 并重新运行迁移和开发服务器。

---
*文档末尾*