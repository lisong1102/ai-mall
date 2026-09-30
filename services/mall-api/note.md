# 1. springdoc 在项目中的作用

springdoc 是 Spring Boot 3 项目的 **API 文档自动生成工具**，运行时扫描 Spring MVC 的 Controller，自动生成 **OpenAPI 3 规范文档**，并提供可交互的 **Swagger UI 网页**用于查看和在线调试接口。

## 1.1 依赖引入

`services/mall-api/pom.xml` 中引入 `springdoc-openapi-starter-webmvc-ui`（当前版本 2.8.6）：

```xml
<!-- API 文档 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>${springdoc.version}</version>
</dependency>
```

- 该 starter 同时包含 OpenAPI 文档生成和 Swagger UI 界面。
- 使用 **OpenAPI 3 注解体系**（`io.swagger.v3.oas.annotations`），不是老旧的 Springfox/Swagger 2（Springfox 不支持 Spring Boot 3 的 Jakarta 命名空间）。
- 版本必须与 Spring Boot 对齐：Spring Boot 3.4.x 需要 springdoc 2.8+。

## 1.2 常用注解

| 注解                                    | 位置            | 作用                      |
| --------------------------------------- | --------------- | ------------------------- |
| `@Tag(name = "类目管理")`               | Controller 类   | 接口分组                  |
| `@Operation(summary = "分页查询类目")`  | Controller 方法 | 接口说明                  |
| `@Schema(description=..., example=...)` | 类/字段         | 数据模型及字段描述、示例  |
| `@ParameterObject`                      | 查询参数对象    | 把 POJO 平铺为 query 参数 |

## 1.3 配置与访问地址

`application.yml`：

```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
```

启动后可访问：

- **接口文档界面**：http://localhost:8080/swagger-ui.html （可在页面上填参数、发请求测试）
- **OpenAPI 原始 JSON**：http://localhost:8080/v3/api-docs （可导入 Apifox/Postman）

核心价值：接口文档随代码自动生成、永远与代码同步，无需手写维护。

# 2. springdoc 对不同参数类型的识别机制

`@ParameterObject` 不是每个接口都要加，springdoc 对不同参数类型有不同的自动识别机制。

## 2.1 `@ParameterObject` 只用于「查询参数对象」

当一个 POJO **没有** `@RequestBody`，靠 Spring MVC 把 URL 上的 `?page=1&size=10` 通过 setter 绑定进来时（如 `PageQuery`），springdoc 默认**不知道要把对象"拆开"成独立的 query 参数**，文档会显示成一个整体参数。加上 `@ParameterObject` 才会平铺成 query 参数：

```java
public Result<PageResult<Category>> page(@ParameterObject PageQuery query,
                                         @RequestParam(required = false) String name)
```

## 2.2 JSON 请求体（`@RequestBody`）自动识别

```java
public Result<Long> create(@Valid @RequestBody CategorySaveReq req)
```

springdoc 原生认识 `@RequestBody`，会**自动**：

1. 把该参数识别为 JSON body（文档中显示在 "Request body" 而非 "Parameters"）；
2. 反射读取类上的 `@Schema`，生成字段结构、描述和示例值；
3. 结合 Jakarta Validation 注解（`@NotBlank`、`@Size(max=64)`）自动标记字段必填、长度限制；
4. 嵌套对象递归展开。

**注意**：`@RequestBody` 参数上**不能**加 `@ParameterObject`，加了语义就错了（它只用于 query 参数）。

## 2.3 返回体完全自动（反射泛型）

返回类型不需要任何注解，springdoc 通过反射读取方法声明的**泛型返回类型**自动生成：

```
Result<Long>                → { code, message, data: integer }
Result<Category>            → { code, message, data: { id, name, parentId, ... } }
Result<PageResult<Category>>→ data 内再嵌套 records 数组和分页字段
```

泛型 `T` 会被真实类型替换，因此 `record Result<T>` 能被正确文档化。

## 2.4 各类参数对照表

| 参数类型       | 例子                                   | 是否自动生成文档               | 需要的注解                 |
| -------------- | -------------------------------------- | ------------------------------ | -------------------------- |
| JSON 请求体    | `@RequestBody CategorySaveReq`         | ✅ 自动读 `@Schema` + 校验注解 | 不需要 `@ParameterObject`  |
| URL query 对象 | `PageQuery query`（无 `@RequestBody`） | ⚠️ 需手动声明                  | `@ParameterObject`         |
| 路径参数       | `@PathVariable Long id`                | ✅ 自动                        | 无                         |
| 返回体         | `Result<Category>`                     | ✅ 自动反射泛型                | 无（字段描述靠 `@Schema`） |

## 2.5 注意：Javadoc 注释不会进文档

实体/DTO 上的 `/** 类目名 */` 注释在编译后不进字节码，**springdoc 默认读不到**。字段要在文档中显示中文说明，必须加 `@Schema` 注解；或引入 `springdoc-openapi-javadoc` 扩展 + 配置 Maven javadoc 插件自动读注释（较重，本项目不采用）。

# 3. `@Schema` 注解应该写在哪里

`@Schema` 是 **API 文档注解**，描述"接口文档中的数据模型"，与"实体类"概念没有绑定。判断标准只有一条：**这个类有没有出现在 Controller 的请求体或响应体里**。

## 3.1 两种做法

**做法一：直接在实体类上加 `@Schema`（本项目采用）**

当实体字段全部适合暴露给前端（如 `Category`，无敏感字段）时，直接在实体上标注：

```java
@Data
@TableName("category")
@Schema(description = "商品类目")
public class Category {

    @Schema(description = "主键ID", example = "1890000000000000001")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    @Schema(description = "类目名", example = "手机")
    private String name;

    @Schema(description = "父类目ID，0 表示根类目", example = "0")
    private Long parentId;

    @Schema(description = "排序值，数值小在前", example = "0")
    private Integer sort;

    @Schema(description = "创建时间", example = "2026-09-09T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-09-09T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
```

- 优点：简单，不用新建类，符合学习项目"架构简洁"的约定。
- 注解顺序建议：`@Schema` 等文档注解放在 MyBatis-Plus 注解（`@TableId`/`@TableField`）之前，文档注解与持久层注解分开，可读性更好。

**做法二：新建响应 VO，实体与接口解耦（规范做法）**

Controller 返回 `Result<XxxVO>`，`@Schema` 加在 VO 上，实体保持纯净。

- 优点：持久层（表结构）与接口层彻底分开。实体常含**不该暴露给前端的字段**（逻辑删除标记、内部状态、密码等），实体直出会泄露；表结构变动也不影响接口契约。
- 代价：每个资源多一个类，实体 ↔ VO 需要转换。

## 3.2 选型原则

- 实体字段全部适合对外、项目追求简洁 → **直接在实体上加 `@Schema`**。
- 实体含敏感/内部字段（如用户实体的 password）→ **改用独立 VO 返回**，不要用 `@Schema(hidden = true)` 逐个藏字段。
- 约定：以后新增实体，只要会直接作为接口返回值，就补上 `@Schema`；请求 DTO（如 `CategorySaveReq`）同样需要 `@Schema`。

# 4. MyBatis-Plus 自定义接口的三种方式

本项目数据访问层继承链：`Controller → Service(IService) → ServiceImpl(ServiceImpl) → Mapper(BaseMapper)`。`BaseMapper` 自带 `insert/selectById/updateById/deleteById`，`IService` 自带 `save/getById/page` 等方法，**自定义接口按查询复杂度分三档**，优先用简单的：

## 4.1 方式一：LambdaQueryWrapper 条件构造（单表查询，不改 Mapper）

单表动态条件查询，直接在 ServiceImpl 里用 `LambdaQueryWrapper`，**不需要在 Mapper 里加任何方法**。项目现有分页就是范例：

```java
// Service 接口声明
PageResult<Category> page(long page, long size, String name);

// ServiceImpl 实现
LambdaQueryWrapper<Category> qw = new LambdaQueryWrapper<>();
if (StringUtils.hasText(name)) {
    qw.like(Category::getName, name);    // 模糊匹配
}
qw.eq(Category::getParentId, 0L)         // 等值
  .orderByAsc(Category::getSort);
Page<Category> p = new Page<>(page, size);
return PageResult.of(this.page(p, qw)); // 分页插件自动拼 LIMIT
```

常用 API：`eq / ne / like / in / between / isNull / orderByAsc / select(指定字段)`。类型安全（字段写 `Category::getName`，改名编译期就能发现），**90% 单表场景用这种**。

## 4.2 方式二：Mapper 自定义方法 + 注解 SQL（简单手写 SQL）

Wrapper 表达不了（聚合、特定函数）时，在 Mapper 接口**显式声明方法**，用 `@Select`/`@Update` 注解写 SQL：

```java
public interface CategoryMapper extends BaseMapper<Category> {

    @Select("SELECT COUNT(*) FROM category WHERE parent_id = #{parentId}")
    long countByParentId(@Param("parentId") Long parentId);
}
```

然后 Service 里通过 `baseMapper.countByParentId(parentId)` 调用（ServiceImpl 内置 `baseMapper` 字段）。

注意：

- **自定义方法必须在 Mapper 接口显式声明**，不能在 Service 里凭空调用（会直接编译失败）；
- 表名写 `category` 即可，不用加 `mall.` 前缀——连接串已配置 `currentSchema=mall`。

## 4.3 方式三：Mapper 方法 + XML（多表 Join、聚合、动态 SQL、嵌套结果集）

复杂场景（多表关联、`<resultMap>` 嵌套）用 XML。最简配置：

**Mapper 接口声明：**

```java
public interface CategoryMapper extends BaseMapper<Category> {
    // 自定义分页：第一个参数必须是 IPage，插件自动改写 SQL 加 LIMIT
    IPage<CategoryProductVO> pageWithProductCount(Page<?> page, @Param("name") String name);
}
```

**XML 文件**（放 `src/main/resources/mapper/CategoryMapper.xml`）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.mall.api.mapper.CategoryMapper">

    <select id="pageWithProductCount" resultType="com.mall.api.controller.dto.CategoryProductVO">
        SELECT c.id, c.name, COUNT(p.id) AS product_count
        FROM category c
        LEFT JOIN product p ON p.category_id = c.id
        <where>
            <if test="name != null and name != ''">
                AND c.name LIKE CONCAT('%', #{name}, '%')
            </if>
        </where>
        GROUP BY c.id, c.name
    </select>
</mapper>
```

关键约束（缺一不可，否则运行期报 `Invalid bound statement`）：

- XML 的 `namespace` = Mapper 接口**全限定名**；
- `<select id>` = Mapper 接口方法名，**完全一致**；
- 返回自定义 DTO/VO 时用 `resultType` 指到 VO 类，字段靠 `map-underscore-to-camel-case` 自动映射；
- 自定义分页方法**第一个参数必须是 `Page`/`IPage`**，分页插件（已配置 PostgreSQL 方言）会自动拦截追加 `LIMIT`，XML 里**不用手写分页**。

## 4.4 新增自定义接口的完整链路

1. Mapper（方式二/三）加方法声明；
2. Service 接口加业务方法声明；
3. ServiceImpl 实现，内部用 Wrapper 或调用 `baseMapper.xxx(...)`；
4. Controller 加端点，返回统一包装 `Result.ok(...)`，分页用 `PageResult.of(...)`。

## 4.5 本项目特有注意点

- **主键**：实体用 `@TableId(type = IdType.ASSIGN_ID)` 雪花算法，新增后 `category.getId()` 直接能拿到 ID，不要依赖数据库自增；
- **时间字段**：`createdAt`/`updatedAt` 由 `MyMetaObjectHandler` 自动填充，自定义 insert/update SQL 时注意手动处理或沿用 MP 方法；
- **扫描**：Mapper 必须在 `com.mall.api.mapper` 包下，启动类 `@MapperScan` 只扫这个包；
- **选型原则**：单表条件 → 方式一；简单 SQL/聚合 → 方式二；多表 join/动态 SQL/嵌套结果 → 方式三，不要一上来就写 XML。

# 5. MyBatis-Plus XML 方式是否需要在 yml 配置 mapper-locations

## 5.1 默认行为：不需要

MyBatis-Plus 的 `mapper-locations` 默认值是：

```yaml
mybatis-plus:
  mapper-locations: classpath*:/mapper/**/*.xml
```

只要 XML 放在 **`src/main/resources/mapper/`** 目录下（不管有没有子目录），**即使不配 yml 也能被扫到**。当前项目的 yml 里没有配置 `mapper-locations`，但直接往 `resources/mapper/` 放 XML 就能生效。

## 5.2 什么时候才需要显式配置

只有当你想把 XML 放到**非默认位置**时才需要加：

```yaml
# 情况 1：想改目录名（比如叫 sql/ 而不是 mapper/）
mybatis-plus:
  mapper-locations: classpath*:sql/**/*.xml

# 情况 2：想和 Java 源码放一起（不推荐）
# src/main/java/com/mall/api/mapper/CategoryMapper.java
# src/main/java/com/mall/api/mapper/CategoryMapper.xml
mybatis-plus:
  mapper-locations:
    - classpath*:mapper/**/*.xml
    - classpath*:com/mall/api/mapper/**/*.xml
```

第二种做法（XML 跟 Java 放一起）要特别注意：Maven 默认**只打 `src/main/resources` 到 classpath**，放在 `src/main/java` 里的 XML 会被编译时漏掉，需要额外在 `pom.xml` 里加 `<resources>` 配置才能打进去。**老老实实放 `resources/mapper/` 下是最佳实践**。

## 5.3 结论

本项目用方式三（XML）的最简步骤：

1. Mapper 接口加方法声明；
2. 在 `src/main/resources/mapper/` 下新建 XML，`namespace` 和 `id` 对上；
3. **yml 不用改**——默认就扫 `classpath*:/mapper/**/*.xml`。

# 6. Spring 依赖注入的三种方式与本项目约定

依赖注入（DI）是 Spring 的核心：对象不自己 new 依赖，而是由 Spring 容器在创建 Bean 时把依赖「喂」进来。注入方式有三种，本项目统一采用**构造器注入（Lombok 代劳）**。

## 6.1 三种注入方式对比

| 方式                 | 写法                                                   | 本项目采用       |
| -------------------- | ------------------------------------------------------ | ---------------- |
| 字段注入             | `@Autowired private CategoryService categoryService;`  | ❌               |
| 构造器注入（手写）   | 手写构造器，参数为依赖                                 | ❌（样板代码多） |
| 构造器注入（Lombok） | 类上 `@RequiredArgsConstructor` + 字段 `private final` | ✅               |

本项目 Controller/ServiceImpl 的标准写法（见 `CategoryController`）：

```java
@RestController
@RequiredArgsConstructor   // Lombok：编译期为所有 final 字段生成构造器
public class CategoryController {

    private final CategoryService categoryService;  // final 字段 → 进构造器
    ...
}
```

`@RequiredArgsConstructor` 在**编译期**自动生成等价构造器，Spring 通过该构造器注入 Bean：

```java
// Lombok 自动生成，无需手写
public CategoryController(CategoryService categoryService) {
    this.categoryService = categoryService;
}
```

注意：只有 `final` 字段（和 `@NonNull` 字段）会进构造器；非 final 字段不会被注入，想注入就必须加 `final`。

## 6.2 为什么推荐构造器注入而非 @Autowired 字段注入

| 对比项     | `@Autowired` 字段注入      | `final` + 构造器注入                       |
| ---------- | -------------------------- | ------------------------------------------ |
| 可变性     | 字段可被重新赋值           | `final` 保证注入后不可变                   |
| 循环依赖   | 能绕过去，但埋下隐患       | 启动直接报错，问题早暴露                   |
| 单元测试   | 依赖反射或 Spring 容器     | 直接 `new XxxController(mockService)` 即可 |
| 依赖显式性 | 看字段分不清哪些是必须依赖 | 构造器参数一目了然                         |
| 空指针风险 | 可能注入到 null            | 对象构造完成依赖就一定存在                 |

Spring 官方自 4.x 起也明确推荐构造器注入；字段注入 `@Autowired` 如今主要见于老代码。

## 6.3 本项目约定

- Controller、ServiceImpl 等需要注入 Service/Mapper 的类，统一用 **`@RequiredArgsConstructor` + `private final`**；
- 不要写 `@Autowired` 字段注入，也不要手写构造器（交给 Lombok）；
- ServiceImpl 继承 `ServiceImpl<Mapper, Entity>` 后，内置 `baseMapper` 字段可直接用，无需再自行注入 Mapper。

# 7. MyBatis-Plus 的 Lambda 链式操作

`ServiceImpl` 继承自 MyBatis-Plus，除内置 `baseMapper`、`save/updateById/getById` 等基础方法外，还提供一整套 **Lambda 链式 API**，用方法引用 `Entity::getXxx` 替代硬编码字段名，单表条件查询/更新/删除都能不开 Mapper 直接落库。

## 7.1 链式方法族一览

| 入口方法                               | 返回类型                      | 终结调用                                | 用途                     |
| -------------------------------------- | ----------------------------- | --------------------------------------- | ------------------------ |
| `this.lambdaQuery()`                   | `LambdaQueryChainWrapper<T>`  | `.list() / .one() / .count() / .page()` | 链式条件查询             |
| `this.lambdaUpdate()`                  | `LambdaUpdateChainWrapper<T>` | `.update()`                             | 链式条件更新（部分字段） |
| `this.lambdaUpdate().eq(...).remove()` | —                             | `.remove()`                             | 链式条件删除             |

关键点：**前面的 `.eq/.set/.like` 只是在拼装 wrapper 条件，不会执行 SQL**；只有调用末尾的 `.update() / .list() / .remove()` 等终结方法才会真正提交 SQL。

## 7.2 链式更新（本项目 `OrderServiceImpl.updateStatus`）

`OrderServiceImpl` 里只更新 status 列、不动其他字段的写法：

```java
@Override
public void updateStatus(Long id, Integer status) {
    // of() 校验非法状态码，非法值抛 IllegalArgumentException 转 400
    this.lambdaUpdate()
            .eq(Order::getId, id)
            .set(Order::getStatus, OrderStatusEnum.of(status).getCode())
            .update();
}
```

等价 SQL：

```sql
UPDATE mall_order SET status = ? WHERE id = ?
```

要点：

1. **`this.lambdaUpdate()`**：`this` 是 `ServiceImpl<OrderMapper, Order>`，直接拿到 `LambdaUpdateChainWrapper<Order>`，无需注入额外 mapper；
2. **`.eq(Order::getId, id)`**：拼 `WHERE id = ?`，字段名用 lambda 方法引用，重命名编译期就能发现；
3. **`.set(Order::getStatus, ...)`**：拼 `SET status = ?`，**只更新指定列**，不会把其他列置为 null；
4. **`.update()`**：触发执行，底层走 `baseMapper.update(entity, wrapper)`，返回 boolean。

## 7.3 常见链式写法对照

**多字段更新**

```java
this.lambdaUpdate()
        .eq(Order::getId, id)
        .set(Order::getStatus, newStatus)
        .set(Order::getRemark, "已处理")
        .update();
```

**条件删除**

```java
this.lambdaUpdate()
        .eq(Order::getCustomerId, customerId)
        .eq(Order::getStatus, 0)   // 待付款
        .remove();
```

**链式查询单条 / 计数 / 分页**

```java
Order one = this.lambdaQuery().eq(Order::getOrderNo, "ORD001").one();
long cnt = this.lambdaQuery().eq(Order::getStatus, 1).count();
```

**链式查询等价于手写 `LambdaQueryWrapper`**

```java
// 现有写法（注入了 mapper，直接用 wrapper）
LambdaQueryWrapper<OrderItem> qw = new LambdaQueryWrapper<>();
qw.in(OrderItem::getOrderId, orderIds);
List<OrderItem> items = orderItemMapper.selectList(qw);

// 改成走 Service 的链式等价写法（需要注入 orderItemService）
List<OrderItem> items = orderItemService.lambdaQuery()
        .in(OrderItem::getOrderId, orderIds)
        .list();
```

两种写法效果一致；本项目因为注入的是 `orderItemMapper` 而非 service，直接用 wrapper 更顺，不必为了链式再造一层 service。

## 7.4 `ServiceImpl` 直接继承的现成方法

不想用链式时，`ServiceImpl` 还挂了一批基础 CRUD 方法，单表简单场景最省心：

```java
this.save(order);          // INSERT
this.updateById(order);    // UPDATE BY id（按实体整体更新）
this.removeById(id);       // DELETE BY id
this.getById(id);          // SELECT BY id
this.list();               // SELECT 全表
this.saveBatch(list);      // 批量 INSERT
this.saveOrUpdate(order);   // 有 id 更新，无 id 插入
this.count();
```

## 7.5 链式更新 vs `updateById` 的选型

| 写法                           | 行为                                           | 适用场景                       |
| ------------------------------ | ---------------------------------------------- | ------------------------------ |
| `this.lambdaUpdate().set(...)` | **只更新 set 指定字段**，其他列不动            | 只改某几个字段（最安全）       |
| `this.updateById(order)`       | 按 `@TableField` 策略整体更新（null 可能覆盖） | 整体回写一个已加载好的实体对象 |

本项目 `updateStatus` 选 `lambdaUpdate` 是对的——只想改 status，不想动 remark、totalAmount 等其他列。

## 7.6 与本项目其他写法的对照

- [OrderServiceImpl.java:64](file:///Users/lixiang/Documents/project/ai/ai-mall/services/mall-api/src/main/java/com/mall/api/service/impl/OrderServiceImpl.java#L64) `baseMapper.insert(order)`：等价于 `this.save(order)`，差别不大，习惯问题；
- [OrderServiceImpl.java:89-91](file:///Users/lixiang/Documents/project/ai/ai-mall/services/mall-api/src/main/java/com/mall/api/service/impl/OrderServiceImpl.java#L89-L91) `LambdaQueryWrapper + orderItemMapper.selectList`：因为注入的是 mapper 不是 service，直接用 wrapper 更顺；
- [OrderServiceImpl.java:109-112](file:///Users/lixiang/Documents/project/ai/ai-mall/services/mall-api/src/main/java/com/mall/api/service/impl/OrderServiceImpl.java#L109-L112) 链式更新：只更新 status 列的安全写法。

## 7.7 选型原则

- 单表按 id 增删改查 → `save/updateById/getById/removeById`；
- 单表条件查询/更新/删除 → `lambdaQuery() / lambdaUpdate()`；
- 单表只改几个字段 → **`lambdaUpdate().set(...).update()`（最安全）**；
- 多表 JOIN、聚合、嵌套 resultMap → 走 `baseMapper` + XML（如本项目 `selectOrderPage` / `selectOrderVOById`）。
