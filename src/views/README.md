# 视图模块 (`src/views`)

此目录包含项目的所有视图组件，主要用于构建管理后台的用户界面 (UI)。本项目使用 Hono 的 JSX 功能来创建这些视图组件，允许开发者使用类似 React 的语法来定义 UI 结构和逻辑。

## 目录结构

*   **`layouts/`**:
    *   **作用**: 此子目录包含布局组件。布局组件定义了页面的通用结构，例如页眉、页脚、导航栏等，其他具体的页面视图可以嵌入到这些布局中。
    *   **[`default.tsx`](./layouts/default.tsx:1)**: 通常是主要的布局文件，定义了管理后台所有页面的基本框架。它可能包含全局样式、脚本引用以及一个用于渲染特定页面内容的主内容区域。

*   **`admin/`**:
    *   **作用**: 此子目录包含构成管理后台各个页面的具体视图组件。每个 `.tsx` 文件通常对应管理后台的一个特定页面或功能区域。
    *   **主要管理页面示例**:
        *   **[`dashboard.tsx`](./admin/dashboard.tsx:1)**: 管理后台的仪表盘或首页，通常显示关键信息和统计数据。
        *   **[`targets.tsx`](./admin/targets.tsx:1)**: 用于管理代理目标的页面，允许用户添加、编辑、删除目标服务器。
        *   **[`rules.tsx`](./admin/rules.tsx:1)**: 用于管理代理规则的页面，允许用户定义请求如何被路由和处理。
        *   **[`cache.tsx`](./admin/cache.tsx:1)**: 用于管理缓存的页面，可能提供查看缓存状态、清除缓存等功能。
        *   **[`logs.tsx`](./admin/logs.tsx:1)**: 用于显示应用程序日志或访问日志的页面。
        *   **[`login.tsx`](./admin/login.tsx:1)**: 用户登录页面。
        *   **[`setup.tsx`](./admin/setup.tsx:1)**: 应用程序的初始设置页面。
        *   **[`async-policies.tsx`](./admin/async-policies.tsx:1)**: (如果适用) 管理异步策略或任务的页面。

## 如何创建新的视图组件

1.  **确定位置**:
    *   如果是一个通用的布局元素，应放在 `layouts/` 目录下。
    *   如果是一个属于管理后台特定功能的页面或组件，应放在 `admin/` 目录下，或者根据需要创建新的子目录。

2.  **创建 `.tsx` 文件**:
    *   在选定的目录下创建一个新的 `.tsx` 文件（例如 `my-new-page.tsx`）。

3.  **编写 JSX 组件**:
    *   使用 JSX 语法定义你的组件。Hono JSX 组件通常是一个返回 JSX 元素的函数。
        ```typescript
        import { html } from 'hono/html';
        import DefaultLayout from '../layouts/default'; // 导入布局组件

        // 定义页面特定的 props (如果需要)
        type MyNewPageProps = {
          title: string;
          data: string[];
        };

        const MyNewPageContent = (props: MyNewPageProps) => {
          return (
            <div>
              <h1>{props.title}</h1>
              <ul>
                {props.data.map(item => <li>{item}</li>)}
              </ul>
              <p>This is a new page!</p>
            </div>
          );
        };

        // 主页面组件，通常会使用布局
        const MyNewPage = (props: MyNewPageProps) => {
          return (
            <DefaultLayout title={props.title}>
              <MyNewPageContent {...props} />
            </DefaultLayout>
          );
        };

        export default MyNewPage;
        ```
    *   你可以使用标准的 HTML 标签以及自定义的 JSX 组件。
    *   Hono 提供了 `html` 模板文字标签，可以帮助处理 HTML 转义等问题，但对于复杂的组件结构，直接使用 JSX 更为常见。

4.  **在路由中使用视图**:
    *   在相关的路由文件（通常是 [`src/routes/admin.ts`](../routes/admin.ts:1)）中导入新的视图组件。
    *   在路由处理程序中，渲染该组件并将其作为响应返回。
        ```typescript
        // 在 src/routes/admin.ts 中
        import { Hono } from 'hono';
        import MyNewPage from '../views/admin/my-new-page'; // 调整路径

        const adminApp = new Hono();

        adminApp.get('/my-new-page', (c) => {
          const pageProps = {
            title: 'My New Awesome Page',
            data: ['Item 1', 'Item 2', 'Item 3'],
          };
          return c.html(<MyNewPage {...pageProps} />);
        });

        export default adminApp;
        ```

5.  **样式和脚本**:
    *   样式可以通过 `<style>` 标签直接内联在 JSX 中，或者通过链接外部 CSS 文件（通常在布局组件中定义）。
    *   客户端脚本可以通过 `<script>` 标签添加。

6.  **测试**:
    *   在浏览器中访问新创建的页面，确保其按预期渲染并且交互正常。