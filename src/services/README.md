# 服务模块 (`src/services`)

此目录包含项目的核心业务逻辑服务。服务层封装了应用程序的主要功能和复杂操作，充当路由处理程序和数据访问层（如 `src/db`）之间的桥梁。每个服务通常关注特定的业务领域或功能集。

## 现有服务

以下是当前项目中定义的服务及其主要功能：

*   **[`adminService.ts`](./adminService.ts:1)**:
    *   **功能**: 提供与管理后台相关的业务逻辑。
    *   **主要方法及其作用**:
        *   `login(credentials)`: 处理管理员登录验证。
        *   `getDashboardData()`: 获取仪表盘所需的数据统计。
        *   `manageUsers()`: 管理用户账户（如果适用）。
        *   `getSettings()`, `updateSettings()`: 读取和更新应用程序的配置。
        *   （可能还包括管理目标、规则、缓存、日志等的具体业务逻辑方法）

*   **[`asyncProcessor.ts`](./asyncProcessor.ts:1)**:
    *   **功能**: 处理异步任务和后台作业。这可能涉及到队列处理、长时间运行的操作或不适合在同步请求/响应周期中完成的任务。
    *   **主要方法及其作用**:
        *   `enqueueTask(taskDetails)`: 将任务添加到异步处理队列。
        *   `processTask(taskId)`: 执行特定的异步任务。
        *   `getTaskStatus(taskId)`: 查询异步任务的当前状态。
        *   （具体方法取决于项目中的异步需求，例如异步策略应用、数据同步等）

*   **[`cacheService.ts`](./cacheService.ts:1)**:
    *   **功能**: 提供缓存管理功能，用于存储和检索常用数据，以提高性能和减少对后端服务的请求。
    *   **主要方法及其作用**:
        *   `get(key)`: 从缓存中检索数据。
        *   `set(key, value, ttl)`: 将数据存入缓存，并可设置生存时间 (TTL)。
        *   `delete(key)`: 从缓存中删除数据。
        *   `clear()`: 清除所有缓存。
        *   `getCacheStats()`: 获取缓存使用情况的统计信息。

*   **[`proxyService.ts`](./proxyService.ts:1)**:
    *   **功能**: 实现核心的代理逻辑。接收传入请求，根据规则引擎的决策，将请求转发到目标后端服务，并处理响应。
    *   **主要方法及其作用**:
        *   `handleProxyRequest(request, env, ctx)`: 处理代理请求的核心方法，包括规则匹配、目标选择、请求转发、响应处理等。
        *   `applyRequestTransforms(request, rule)`: 根据规则对请求进行转换。
        *   `applyResponseTransforms(response, rule)`: 根据规则对响应进行转换。
        *   `fetchFromTarget(request, targetUrl)`: 向目标服务器发起请求。

*   **[`ruleEngineService.ts`](./ruleEngineService.ts:1)**:
    *   **功能**: 实现规则引擎，用于评估传入请求并根据定义的规则集确定如何处理该请求（例如，选择哪个目标、是否应用转换、是否缓存等）。
    *   **主要方法及其作用**:
        *   `evaluate(request)`: 根据请求评估所有适用规则，并返回匹配的规则或处理指令。
        *   `getMatchingRule(requestContext)`: 查找与当前请求上下文匹配的最佳规则。
        *   `loadRules()`: 从数据库或配置文件加载和编译规则。
        *   `addRule(ruleDefinition)`, `updateRule(ruleId, ruleDefinition)`, `deleteRule(ruleId)`: 管理规则的增删改查。

## 如何创建和使用新的服务

1.  **创建服务文件**:
    *   在 `src/services` 目录下创建一个新的 TypeScript 文件（例如 `my-new-service.ts`）。
    *   在该文件中，定义一个类或一组函数来封装相关的业务逻辑。
        ```typescript
        // 示例：使用类定义服务
        import { db } from '../db'; // 假设从 db 模块导入数据库实例或函数

        export class MyNewService {
          async getFeatureData(id: string) {
            // 业务逻辑，可能与数据库交互
            // const item = await db.table('my_table').where({ id }).first();
            // return item;
            return { id, message: 'Data from MyNewService' };
          }

          async createFeature(data: any) {
            // 业务逻辑
            // const [newId] = await db.table('my_table').insert(data);
            // return { id: newId, ...data };
            return { success: true, data };
          }
        }

        // 或者，使用函数导出
        export const getAnotherFeature = async (param: string) => {
          return `Another feature with ${param}`;
        };
        ```

2.  **实现业务逻辑**:
    *   在服务的方法中实现具体的业务逻辑。这可能包括数据验证、与数据库的交互（通过 `src/db`）、调用其他服务、与外部 API 通信等。

3.  **使用服务**:
    *   在路由处理程序（`src/routes`）或其他服务中导入并使用新的服务。
        ```typescript
        // 在 src/routes/someRoute.ts 中
        import { Hono } from 'hono';
        import { MyNewService, getAnotherFeature } from '../services/my-new-service'; // 调整路径

        const app = new Hono();
        const myNewService = new MyNewService(); // 如果是类，则实例化

        app.get('/my-feature/:id', async (c) => {
          const id = c.req.param('id');
          const data = await myNewService.getFeatureData(id);
          return c.json(data);
        });

        app.get('/another-feature', async (c) => {
          const result = await getAnotherFeature('test');
          return c.text(result);
        });

        export default app;
        ```

4.  **依赖注入 (可选但推荐)**:
    *   对于更复杂的应用程序，考虑使用依赖注入 (DI) 模式来管理服务实例及其依赖关系。这可以使代码更易于测试和维护。Hono 本身不直接提供 DI 容器，但可以集成第三方库或手动实现。

5.  **测试**:
    *   为新的服务编写单元测试和集成测试，以确保其业务逻辑正确无误。