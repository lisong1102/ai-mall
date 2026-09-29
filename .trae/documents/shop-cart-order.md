# 商品展示页 + 加入购物车 + 生成订单 实现计划

## Context

当前 `apps/web` 前端只有后台管理（商品/订单/客户的 CRUD 管理），但缺少"代客下单"动线：管理员无法在后台浏览商品、加入购物车、选客户一键生成订单。后端订单创建接口（`POST /api/orders`）已就绪，接收 `customerId + items[]`，但前端没有对应的下单入口；同时后端无购物车模块。

本次新增"商城"模块：在 `_admin` 布局下新增商品展示页（列表+详情），用前端本地购物车（React Context + localStorage，零依赖）承载加购状态，通过下单弹窗选择客户后调用已有 `createOrder` 接口生成订单。复用现有 `pageProducts`/`getProduct`/`pageCustomers`/`createOrder` API 与 `ProductVO`/`OrderSaveReq`/`OrderItemReq` 类型，不新增后端接口、不新增依赖。

## 文件清单

### 新建（5 个）
- `apps/web/src/lib/cart.tsx` — CartProvider + useCart + CartItem 类型 + localStorage 持久化
- `apps/web/src/components/shop/cart-drawer.tsx` — 购物车抽屉（列表、改数量、删除、去结算）
- `apps/web/src/components/shop/checkout-modal.tsx` — 结算弹窗（远程搜客户、备注、提交 createOrder）
- `apps/web/src/routes/_admin/shop.tsx` — 商品列表页（卡片网格 + 搜索 + 分页）
- `apps/web/src/routes/_admin/shop.$id.tsx` — 商品详情页（动态路由）

### 修改（4 个）
- `apps/web/src/routes/__root.tsx` — AuthProvider 内包一层 CartProvider
- `apps/web/src/components/layout/admin-layout.tsx` — titleMap 加 `/shop`+`/shop/:id`（详情页用 startsWith 兜底）；main 区末尾挂 `<CartDrawer />`
- `apps/web/src/components/layout/topbar.tsx` — 通知按钮左加购物车图标 + Badge 角标（count=totalCount）
- `apps/web/src/components/layout/sidebar.tsx` — 交易中心组首项加"商城"菜单（ShopOutlined）

## 关键设计

### 1. 购物车状态（cart.tsx）

```ts
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  coverImage: string | null;
  stock: number;
  quantity: number;
}
```

Context value：
```ts
{
  items: CartItem[];
  addItem: (p: ProductVO, qty?: number) => void;   // 同 productId 累加，不超 stock
  updateQty: (id: string, qty: number) => void;    // qty<=0 则移除
  removeItem: (id: string) => void;
  clear: () => void;
  totalCount: number;       // sum(quantity)
  totalAmount: number;      // sum(price*quantity)
  drawerOpen: boolean;       // 抽屉开闭也放 Context，topbar/drawer/checkout 三方共用
  setDrawerOpen: (v: boolean) => void;
}
```

- localStorage key：`ai-mall:cart`，value=JSON(items)。`useEffect` 监听 items 写入；初始化用 `lazyInit` 从 localStorage 读，try/catch 容错。
- CartItem 类型放本文件内 export（纯前端态，不污染 `types.ts`——后者严格对齐 Java 后端模型）。
- 放 `__root.tsx`（AuthProvider 内）：覆盖整个 _admin 子树，topbar/抽屉/页面都能用。

### 2. 路由

- `shop.tsx` → `createFileRoute("/_admin/shop")`，path=`/shop`
- `shop.$id.tsx` → `createFileRoute("/_admin/shop/$id")`，path=`/shop/:id`，用 `useParams({ from: "/_admin/shop/$id" })` 取 id
- 与现有 products.tsx 一致用 useQuery，不用 loader 预取。routeTree.gen.ts 由插件自动重生，勿手改。

### 3. 购物车抽屉全局化

- `<CartDrawer />` 在 `admin-layout.tsx` 的 `<main>` 区末尾挂载一次（紧邻 Outlet 后）。
- open 状态走 CartProvider 的 `drawerOpen`，topbar 图标只需 `const { setDrawerOpen, totalCount } = useCart()`。
- topbar 改造最小：通知按钮左侧加一个 `<Badge count={totalCount} showZero offset={[-2,2]}>` 包裹的购物车按钮，`onClick={()=>setDrawerOpen(true)}`，复用现有 38x38/borderRadius:12 样式，图标用 `ShoppingCartOutlined`。

### 4. 商品列表页（shop.tsx）

- 页头 `<h2>商城 · 代客下单</h2>` + 副标题
- 搜索栏：Input 关键词（onChange 重置 page=1）+ 查询/重置按钮
- `useQuery({ queryKey:["shop-products",page,size,searchName], queryFn:()=>pageProducts({page,size,name:searchName||undefined,status:1}), placeholderData:keepPreviousData })` — **硬编码 status:1 只查在售**
- 卡片网格：`gridTemplateColumns: repeat(auto-fill,minmax(220px,1fr))`，每张 Card：封面图（无图用首字渐变色块，复用 products.tsx getThumb 逻辑内联）、商品名、类目 Tag、价格、库存、`<InputNumber>` 数量（默认1,max=stock）、`加入购物车` 按钮（jade 主调，调 addItem(p, qty)）
- 分页：antd Pagination，pageSize=12

### 5. 商品详情页（shop.$id.tsx）

- 顶部面包屑 + 返回按钮（`navigate({to:"/shop"})`）
- 左大图（无图用渐变色块）、右信息：名称、类目 Tag、价格大字、库存、描述、数量 InputNumber、`加入购物车` + `立即购买`（立即购买=addItem 后 setDrawerOpen(true)）

### 6. 结算弹窗（checkout-modal.tsx）

- 由 CartDrawer 内"去结算"按钮触发，open state 在 CartDrawer 内 useState，传给 CheckoutModal props
- 客户选择：`<Select showSearch filterOption={false} onSearch={fetchCustomers}>`，onSearch 调 `pageCustomers({name,size:20})`，useQuery key 含搜索词，debounce 用 `useDeferredValue`（项目未装 lodash）
- 备注：`<Input.TextArea rows={2}>`
- 提交 `useMutation` 调 createOrder，items 映射：
  ```ts
  items: items.map(c => ({ productId:c.productId, productName:c.name, price:c.price, quantity:c.quantity }))
  ```
  onSuccess: `message.success(下单成功 ${id})` → `clear()` → `setDrawerOpen(false)` → `setCheckoutOpen(false)` → `navigate({to:"/orders"})`
- 校验：购物车空禁用提交；客户必选（Form rules）；提交前 `items.some(c=>c.quantity>c.stock)` 兜底报错

### 7. 菜单与标题

- sidebar.tsx：交易中心组（g3）首项加 `{key:"/shop", icon:<ShopOutlined/>, label:"商城"}`，放订单管理前（先选货再下单动线）
- admin-layout.tsx titleMap 加 `"/shop":"商城 · 代客下单"`，解析处加 `path.startsWith("/shop/")?"商品详情":...` 兜底

## 复用清单

- API：`pageProducts`/`getProduct`（product.ts）、`createOrder`（order.ts）、`pageCustomers`（customer.ts）— 均在 `api/mall/index.ts` barrel 导出
- 类型：`ProductVO`、`OrderSaveReq`、`OrderItemReq`、`Customer`（types.ts）
- UI 风格：圆角 11/`var(--radius-lg)`、jade 主调 `var(--color-jade-deep)`、Tag borderRadius:999、Card styles.body.padding:20
- 工具：`dayjs`（时间）、`keepPreviousData`（分页）、`message`（反馈）

## 实施顺序

1. `cart.tsx`（基础）
2. `__root.tsx`（挂 CartProvider）
3. `topbar.tsx` + `sidebar.tsx` + `admin-layout.tsx`（布局接线 + 挂 CartDrawer）
4. `shop.tsx`（列表页）
5. `shop.$id.tsx`（详情页）
6. `cart-drawer.tsx`（抽屉）
7. `checkout-modal.tsx`（结算弹窗）

## 验证

1. `pnpm --filter web dev` 启动，浏览器开 http://localhost:5173，admin 登录
2. 侧栏点"商城" → 卡片网格、分页、搜索生效
3. 点"加入购物车" → topbar 角标 +1，刷新页面角标保留（localStorage）
4. 点 topbar 购物车图标 → 抽屉打开，改数量/删除生效
5. 点"去结算" → 选客户（搜索）、填备注、提交 → message 成功 + 跳订单管理页
6. 边界：购物车空时"去结算"禁用；数量超库存 addItem 截断；未登录访问 `/shop` 被 beforeLoad 踢回登录
