# 构建进度跟踪

> 每完成一个阶段/任务就更新此表，作为回归对照与项目快速预览入口。
> 设计细节见 [specs/2026-09-07-ai-mall-design.md](superpowers/specs/2026-09-07-ai-mall-design.md)
> 变更记录：2026-09-07 主题由「智能校园」改为「电商」，目录 smart-campus → ai-mall
> 变更记录：2026-09-11 架构拆分——前端抽离为 apps/web（Vite + TanStack Router/Query 纯 SPA）；原 Next 应用改为 apps/ai 纯 AI API 服务（端口 3001）；商城流量前端直连 Java（dev Vite proxy / prod nginx），/api/mall 不再经 Next 转发；新增三端 Dockerfile + nginx + compose 全栈编排

## 阶段总览

| 阶段            | 状态      | 完成日期   | 验证方式                                                           | 备注 |
| --------------- | --------- | ---------- | ------------------------------------------------------------------ | ---- |
| P0 脚手架       | ✅ 完成   | 2026-09-07 | BFF /api/mall/health 返回 Java Result；首页显示"已连接 · mall-api" |      |
| P1 业务底座     | ⬜ 未开始 |            | Swagger 全接口可用 + 后台商品/订单 CRUD 页面                       |      |
| P2 AI 对话      | ⬜ 未开始 |            | 页面内多轮流式对话                                                 |      |
| P3 RAG 知识库   | ⬜ 未开始 |            | 政策/FAQ 问答带引用                                                |      |
| P4 Tool Calling | ⬜ 未开始 |            | 对话中查订单/物流/库存、创建售后                                   |      |
| P5 打磨         | ⬜ 未开始 |            | 测试通过 + 演示录屏                                                |      |

## 协作与学习约定

- P1 及后续阶段均拆分为多个**小步骤**，每步聚焦一个可独立验证的功能点，避免一次性大改动。
- 采用**交互式构建**：用户参与每一步的构建与学习，逐步推进；助手不在未经确认的情况下连续跨步实现。
- 每步「先以基础为准，后续再扩展完善」——优先跑通最小闭环，字段、校验、UI 细节可迭代补充。
- 每完成一步即更新本文件勾选状态，作为学习轨迹与回归对照。

## P0 任务清单

- [x] 设计文档与进度文档
- [x] monorepo 根结构（pnpm workspace、docker-compose、.env.example）
- [x] services/mall-api Spring Boot 骨架（含健康检查接口）
- [x] apps/web Next.js 骨架（含 AI SDK / LangChain.js 依赖）——2026-09-11 架构拆分后演变为 apps/ai（AI 服务）+ apps/web（Vite 前端）
- [x] 验证：pnpm install、Maven 编译、前后端启动互通

## P1 任务清单（业务底座）

> 目标：Java 商品/类目/客户/订单/售后 CRUD + Flyway + Swagger；前端登录 + 管理后台 CRUD（经 Vite proxy 直连 Java）。
> 每步独立可验证；步骤间可在用户确认后继续。

- [x] **P1.1 数据库建模**：Flyway 建表（category / product / customer / orders / order_item / after_sale），基础字段为主，外键约束
  - 迁移脚本：`services/mall-api/src/main/resources/db/migration/V1__init_mall_schema.sql`
  - 设计决策：主键 BIGINT 由应用层雪花算法生成；订单主表用 `orders`（`order` 是 PG 保留字）；订单明细存商品名/单价快照；`order_item` 跟随主订单级联删除
  - 验证：启动 mall-api 时 Flyway 自动建表成功（v1）；mall schema 下 6 张业务表 + flyway_schema_history 共 7 张表；6 条外键约束均生效
- [x] **P1.2 Java 通用层 + 类目 CRUD**：MyBatis-Plus 分页配置、统一分页查询入参；Category 实体/Mapper/Service/Controller 全链路 + Swagger 注解
  - 新增 11 个 Java 文件：`config/`（分页插件 + MetaObjectHandler 时间戳填充）、`common/`（PageQuery 入参 + PageResult 出参）、`entity/Category`、`mapper/CategoryMapper`、`service/CategoryService(Impl)`、`controller/CategoryController` + `controller/dto/CategorySaveReq`
  - 设计决策：主键 `@TableId(ASSIGN_ID)` 雪花算法；`createdAt/updatedAt` 用 `@TableField(fill=...)` + MetaObjectHandler 自动填充；`PageQuery.getSize()` 限 100 防拖垮 DB
  - 修复 2 个兼容性问题：
    1. **TIMESTAMPTZ → LocalDateTime 不兼容**：PG JDBC 驱动对带时区类型返回 `OffsetDateTime`，无法直接映射 `LocalDateTime`。新增 `V2__timestamptz_to_timestamp.sql` 把所有时间列改为 `TIMESTAMP`（时区由 Spring Jackson 的 Asia/Shanghai 统一处理）
    2. **springdoc 2.6.0 与 Spring Boot 3.4.1 不兼容**：`NoSuchMethodError: ControllerAdviceBean.<init>(Object)`（Spring Framework 6.2 改了构造方法签名）。升级 springdoc 到 2.8.6 修复
  - 验证：Category 全链路 CRUD（新增/分页/模糊查/详情/修改/删除/校验失败）curl 全部通过；Swagger UI `/swagger-ui/index.html` 与 `/v3/api-docs` 返回 200，列出 3 个路径 6 个接口
- [x] **P1.3 Java 商品 CRUD**：Product 实体（关联 category_id）、分页查询、上下架状态；Swagger
  - 新增 7 个文件：`entity/Product`（price=BigDecimal、stock、status 1上架/0下架、description、coverImage）、`mapper/ProductMapper` + `mapper/ProductMapper.xml`、`service/ProductService(Impl)`、`controller/ProductController` + `controller/dto/ProductSaveReq` + `controller/dto/ProductVO`
  - 设计决策：沿用 P1.2 的 Category 全链路模式（ServiceImpl 继承 ServiceImpl<Mapper,Entity>、PageResult、MetaObjectHandler 自动填充时间）；商品名模糊查 + 类目/状态精确过滤；上下架走独立的 `PUT /api/products/{id}/status` 接口（progress.md 明确要求"上下架状态"）；上下架用 `lambdaUpdate().set()` 链式更新只改 status 字段；排序按 createdAt/id 倒序（新上架在前）
  - **类目名联表查询（方案 B）**：列表/详情返回 `ProductVO`（Product 字段 + `categoryName`），避免前端 N+1 请求查类目名。实现走 `resources/mapper/ProductMapper.xml` 的 `LEFT JOIN category c ON p.category_id = c.id` + `<where>` 动态条件（`<if>` 拼 name/categoryId/status），列别名 `category_name` 配合 `map-underscore-to-camel-case=true` 自动映射 VO；分页方法首参为 `IPage<ProductVO>`，分页插件自动追加 LIMIT/OFFSET/COUNT
  - 验证：Product 全链路 CRUD（新增/分页/模糊查/详情/修改/下架切换/状态过滤/类目过滤/删除）curl 全部通过；列表与详情均返回 `categoryName` 字段（值为「手机」）；校验失败（空名+负库存→合并报错、缺 categoryId→400）通过；updatedAt 自动更新证明 MetaObjectHandler 生效；Swagger UI 200，api-docs 收录 3 个商品路径共 7 个接口
- [x] **P1.4 Java 客户 CRUD**：Customer 实体全链路 CRUD
  - 新增 6 个 Java 文件：`entity/Customer`（name/phone/email/address）、`mapper/CustomerMapper`、`service/CustomerService(Impl)`、`controller/CustomerController` + `controller/dto/CustomerSaveReq`
  - 设计决策：沿用 P1.2 的 Category 单表模式（ServiceImpl 继承 + LambdaQueryWrapper）；模糊查关键字同时匹配姓名与手机号（OR），按 createdAt 倒序（新客户在前）；邮箱用 `@Email` 校验格式
  - 验证：`./mvnw compile` BUILD SUCCESS，Customer/Controller/DTO 等类均生成
- [x] **P1.5 Java 订单 CRUD**：Order + OrderItem（一对多）事务化创建、订单状态字段
  - 新增 12 个文件：`entity/Order`（@TableName("orders")，order 为 PG 保留字；status 0待付款/1已付款/2已发货/3已完成/4已取消）、`entity/OrderItem`（仅 createdAt，无 updated_at；保存商品名/单价快照）、`mapper/OrderMapper` + `mapper/OrderItemMapper` + `mapper/OrderMapper.xml`、`service/OrderService(Impl)`、`controller/OrderController` + `controller/dto/{OrderVO,OrderItemVO,OrderSaveReq,OrderItemReq}`
  - 设计决策：createOrder 用 `@Transactional(rollbackFor=Exception.class)` 包裹，先生成订单号 `ORD+yyyyMMddHHmmssSSS+3位随机`、再汇总明细小计得 totalAmount、再插主表+明细；OrderMapper.xml 联表 customer 取 customerName（列表与详情均带），明细在详情接口单独查并填充（避免列表拉取明细）；状态切换走独立 `PUT /api/orders/{id}/status`；明细通过外键 `ON DELETE CASCADE` 跟随主订单级联删除；OrderSaveReq 用 `@Valid + @NotEmpty` 触发明细级联校验
  - 验证：`./mvnw compile` BUILD SUCCESS，Order/OrderItem/VO/DTO 等类均生成
- [x] **P1.6 Java 售后 CRUD**：AfterSale（关联 order_id）、基础状态流转（申请/审核/完成）
  - 新增 8 个文件：`entity/AfterSale`（type 1仅退款/2退货退款；status 0申请中/1审核通过/2已完成/3已拒绝）、`mapper/AfterSaleMapper` + `mapper/AfterSaleMapper.xml`、`service/AfterSaleService(Impl)`、`controller/AfterSaleController` + `controller/dto/{AfterSaleVO,AfterSaleSaveReq}`；另在 `GlobalExceptionHandler` 增 `IllegalArgumentException` 处理（业务校验失败返回 400）
  - 设计决策：AfterSaleMapper.xml 联表 orders（取 order_no）+ customer（取 customer_name）；状态流转带校验——`review(id,pass)` 仅 status=0 可调用（pass=true→1 通过，false→3 拒绝），`complete(id)` 仅 status=1 可调用（→2 完成），非法流转抛 IllegalArgumentException 由全局处理器转 400；申请接口 `POST /api/after-sales` 固定 status=0；状态流转走 `PUT /api/after-sales/{id}/review` 与 `PUT /api/after-sales/{id}/complete`
  - 验证：`./mvnw compile` BUILD SUCCESS，AfterSale/VO/DTO 等类均生成
- [x] **P1.7 数据请求层 + 联调验证**：axios 实例 + 逐接口 API 层、TanStack Query 基础封装
  - 文件结构：`src/api/http.ts`（axios 实例工厂：mallHttp=/api/mall、aiHttp=/api/ai；请求拦截注入 JWT、响应拦截解包 Result/统一错误文案）、`src/api/mall/`（types + category/product/customer/order/after-sale/health 逐接口函数 + barrel index）、`src/api/ai/`（health）
  - 设计决策：选型 axios 而非 fetch——P1.8 JWT 登录需要拦截器注入 token 与统一 401 处理；Result 解包放响应拦截器，调用方拿到纯净 data；商城流量由 Vite proxy / nginx 直连 Java，原 Next BFF /api/mall/\* 代理删除；QueryClient 默认 options 在根路由组件集中配置
  - **修复雪花 ID 精度丢失**：Java Long ID（如 2097601223567945729）超 JS Number.MAX_SAFE_INTEGER，JSON.parse 会丢精度。新增 `JacksonConfig` 全局把包装类型 Long 序列化为字符串（基本类型 long 不受影响，PageResult.total 等仍是数字）；前端类型 id 一律 string
  - 验证：`pnpm --filter web build` 与 `tsc --noEmit` 通过；curl 经 Vite proxy 完成 GET /api/mall/health、GET /api/mall/categories；/api/ai/health 经 Vite proxy 命中 AI 服务；新实例 curl 验证 id 输出为字符串、total 为数字
- [ ] **P1.8 前端登录 + 管理后台布局**：简单登录（Java 侧 JWT）、TanStack Router 侧边栏布局骨架
- [ ] **P1.9 商品/类目管理页**：列表 + 新增/编辑（react-hook-form + zod）
- [ ] **P1.10 订单/售后/客户页**：列表 + 详情查看
- [ ] **P1.11 联调冒烟 + 进度更新**：Swagger 全接口可用、前端直连 Java 调通、管理后台 CRUD 跑通；更新本表

## 环境要求（新机器快速预览）

- Node 22+ / pnpm 10+
- Java 17（无需本地装 Maven，用 `./mvnw`）
- Docker（PostgreSQL 16 + pgvector）
- 环境变量：复制 `.env.example` 为 `.env`，填入 `DEEPSEEK_API_KEY`、`ZHIPU_API_KEY`

## 常用命令

```bash
docker compose up -d postgres   # 仅启动数据库（本地开发）
docker compose up -d --build    # 全栈容器化：postgres + mall-api + ai-service + web(nginx :80)
pnpm dev                        # 同时拉起 Vite(5173)、Next AI(3001)、Spring Boot(8080)
pnpm --filter web build         # 构建前端（Vite）
pnpm --filter ai build          # 构建 AI 服务（Next standalone）
cd services/mall-api && ./mvnw spring-boot:run   # 单独起 Java
```
