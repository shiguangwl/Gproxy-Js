# 路由模块 (`src/routes`)

此目录包含项目的所有路由定义。路由负责将传入的 HTTP 请求映射到相应的处理程序函数，这些函数通常位于服务层 (`src/services`)。本项目使用 Hono 框架来定义和管理路由。

## 主要路由文件

*   **[`admin.ts`](./admin.ts:1)**:
    *   **主要职责**: 定义与管理后台相关的所有路由。这包括用户登录、仪表盘、目标管理、规则配置、缓存管理、日志查看等功能的 API 端点和页面路由。
    *   **处理的 URL 路径**: 通常处理以 `/admin` 或类似前缀开头的路径，例如：
        *   `/admin/login`
        *   `/admin/dashboard`
        *   `/admin/targets`
        *   `/admin/api/rules`

*   **[`proxy.ts`](./proxy.ts:1)**:
    *   **主要职责**: 定义核心的代理路由。这些路由接收外部请求，并根据配置的规则和目标，将请求转发到相应的后端服务。它还可能处理响应转换、缓存等逻辑。
    *   **处理的 URL 路径**: 通常处理项目的主要访问路径，例如根路径 `/` 或其他配置为代理入口的路径。具体的路径模式取决于代理规则的配置。

## 如何添加新的路由或修改现有路由

1.  **确定路由文件**:
    *   根据新路由的功能，确定它应该添加到哪个路由文件。例如，管理后台相关的新路由应添加到 [`admin.ts`](./admin.ts:1)，而新的代理逻辑可能需要修改 [`proxy.ts`](./proxy.ts:1)。
    *   如果新路由属于一个全新的功能模块，可以考虑创建一个新的路由文件。

2.  **定义路由**:
    *   在选定的路由文件中，使用 Hono 提供的 HTTP 方法函数（如 `app.get()`, `app.post()`, `app.put()`, `app.delete()` 等）来定义新的路由。
    *   指定路由的路径和处理函数。处理函数通常是一个 `Context` 对象作为参数的异步函数。
        ```typescript
        import { Hono } from 'hono';
        import { someServiceFunction } from '../services/someService'; // 导入服务函数

        const app = new Hono();

        // 添加一个新的 GET 路由
        app.get('/new-feature/:id', async (c) => {
          const id = c.req.param('id');
          const data = await someServiceFunction(id);
          if (!data) {
            return c.json({ error: 'Not found' }, 404);
          }
          return c.json(data);
        });

        // 修改现有路由 (示例)
        // 假设有一个旧的路由 app.get('/old-path', oldHandler);
        // 你可以注释掉或删除它，然后添加新的定义
        // app.get('/new-path-for-old-feature', newHandler);

        export default app;
        ```

3.  **集成中间件 (如果需要)**:
    *   如果新路由需要特定的中间件（如身份验证、数据校验），可以使用 `.use()` 方法或在路由定义中直接传入中间件函数。
        ```typescript
        import { authMiddleware } from '../middleware/auth'; // 导入中间件

        // ... 其他代码 ...

        // 对特定路由使用中间件
        app.post('/admin/secure-data', authMiddleware, async (c) => {
          // ... 处理逻辑 ...
          return c.json({ message: 'Secure data processed' });
        });
        ```

4.  **组织和导出**:
    *   确保路由文件导出一个 Hono 实例或路由组。
    *   在主应用程序文件（通常是 [`src/index.ts`](../index.ts:1)）中，正确地挂载这些路由。
        ```typescript
        // 在 src/index.ts 中
        import { Hono } from 'hono';
        import adminRoutes from './routes/admin';
        import proxyRoutes from './routes/proxy';

        const app = new Hono();

        app.route('/admin', adminRoutes); // 挂载管理路由
        app.route('/', proxyRoutes);     // 挂载代理路由

        export default app;
        ```

5.  **测试**:
    *   使用 Postman、curl 或编写自动化测试来验证新路由或修改后的路由是否按预期工作，包括路径匹配、参数处理、请求方法、响应状态码和内容。