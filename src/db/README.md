# 数据库模块 (`src/db`)

此目录包含项目与数据库交互的核心逻辑，以及使用 D1 数据库的模式定义。

## 主要文件和目录结构

*   **[`index.ts`](./index.ts:1)**: 该文件是数据库模块的入口点。它通常导出数据库表的类型定义以及用于执行创建 (Create)、读取 (Read)、更新 (Update) 和删除 (Delete) 操作的 CRUD 函数。
*   **[`schema.sql`](./schema.sql:1)**: 此文件包含数据库的 SQL 模式定义，用于初始化或更新数据库结构。

## 数据库迁移 (Migrations)

数据库迁移是管理数据库模式演变的过程。通常，会有一个专门的 `migrations` 文件夹（可能位于项目根目录或此 `db` 目录下）来存放迁移脚本。这些脚本按顺序应用，以确保数据库结构与应用程序代码保持同步。

**在当前项目中：**
目前看来，项目根目录或 `src/db` 目录下没有名为 `migrations` 的专用文件夹。数据库模式的变更可能通过直接修改 [`schema.sql`](./schema.sql:1) 并使用 Cloudflare Wrangler 的 `d1 execute` 命令来应用，或者通过其他项目特定的方式进行管理。

## 如何添加新的表或修改现有表结构

1.  **定义/修改表结构**:
    *   在 [`schema.sql`](./schema.sql:1) 文件中添加新的 `CREATE TABLE` 语句或使用 `ALTER TABLE` 修改现有表。
    *   确保更新相关的类型定义（通常在 [`index.ts`](./index.ts:1) 或专门的类型文件中）。

2.  **编写 CRUD 操作**:
    *   在 [`index.ts`](./index.ts:1) 或相关的服务文件中，为新表添加相应的 CRUD (创建, 读取, 更新, 删除) 函数。
    *   如果修改了现有表，请更新相关的 CRUD 函数以反映更改。

3.  **应用更改**:
    *   使用 Cloudflare Wrangler CLI 将模式更改应用到 D1 数据库。例如：
        ```bash
        npx wrangler d1 execute <YOUR_DB_NAME> --file ./src/db/schema.sql
        ```
    *   或者，如果项目使用迁移工具，则创建并运行新的迁移脚本。

4.  **测试**:
    *   确保对新的或修改后的数据库交互逻辑进行充分测试。