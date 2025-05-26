# 中间件模块 (`src/middleware`)

此目录包含项目所使用的 Hono 中间件。中间件是在请求处理管道中按顺序执行的函数，用于在请求到达最终处理程序之前或响应发送回客户端之前执行各种任务，如身份验证、日志记录、数据校验等。

## 现有中间件

以下是当前项目中定义的中间件及其功能：

*   **[`auth.ts`](./auth.ts:1)**:
    *   **功能**: 处理用户身份验证。它可能检查请求中是否存在有效的会话令牌或 API 密钥，并验证用户是否有权访问受保护的路由。
    *   **用途**: 通常用于保护管理后台接口或其他需要用户登录才能访问的资源。

*   **[`config-check.ts`](./config-check.ts:1)**:
    *   **功能**: 检查应用程序的核心配置是否已正确设置。例如，它可能验证必要的环境变量或配置文件中的关键参数是否存在且有效。
    *   **用途**: 确保应用程序在启动或处理请求前具备运行所需的基本配置，如果配置不完整或不正确，可能会重定向到设置页面或返回错误。

*   **[`setup-check.ts`](./setup-check.ts:1)**:
    *   **功能**: 检查应用程序是否已完成初始设置流程。这对于首次运行应用程序时需要用户进行配置的场景非常有用。
    *   **用途**: 如果应用程序尚未完成设置（例如，管理员账户未创建），此中间件可能会将用户重定向到设置页面，以引导完成必要的初始化步骤。

## 如何创建和集成新的中间件

1.  **创建中间件文件**:
    *   在 `src/middleware` 目录下创建一个新的 TypeScript 文件（例如 `my-new-middleware.ts`）。
    *   在该文件中，导出一个 Hono 中间件函数。一个基本的中间件函数结构如下：
        ```typescript
        import { Context, Next } from 'hono';

        export const myNewMiddleware = async (c: Context, next: Next) => {
          // 在请求到达路由处理程序之前执行的逻辑
          console.log(`[${c.req.method}] ${c.req.url} - My New Middleware Pre-processing`);

          // 调用 next() 将控制权传递给下一个中间件或路由处理程序
          await next();

          // 在响应发送回客户端之前执行的逻辑
          console.log(`[${c.req.method}] ${c.req.url} - My New Middleware Post-processing`);
          c.res.headers.append('X-My-New-Middleware', 'processed');
        };
        ```

2.  **集成中间件**:
    *   在你的路由定义文件（通常在 `src/routes` 目录下，例如 [`admin.ts`](../routes/admin.ts:1) 或 [`proxy.ts`](../routes/proxy.ts:1)）中导入新的中间件。
    *   使用 `.use()` 方法将中间件应用于特定的路由组或单个路由。
        ```typescript
        import { Hono } from 'hono';
        import { myNewMiddleware } from '../middleware/my-new-middleware'; // 调整路径

        const app = new Hono();

        // 应用于所有以 /admin 开头的路由
        app.use('/admin/*', myNewMiddleware);

        // 应用于特定的路由
        app.get('/specific-route', myNewMiddleware, (c) => {
          return c.text('This route uses myNewMiddleware');
        });

        export default app;
        ```
    *   中间件的应用顺序很重要。它们将按照 `.use()` 调用的顺序执行。

3.  **测试**:
    *   确保对新的中间件及其集成的路由进行充分测试，以验证其行为是否符合预期。