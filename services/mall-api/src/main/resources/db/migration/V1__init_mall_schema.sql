-- ai-mall 业务表初始化（mall schema，由 Java/Flyway 管理）
-- 约定：主键 BIGINT 由应用层（MyBatis-Plus 雪花算法）生成，非 DB 自增
--       created_at / updated_at 由 DB 默认 now() 维护
-- 注意：PostgreSQL 中 order 是保留字，订单主表命名为 orders

-- ============================================================
-- 1. 类目 category
-- ============================================================
CREATE TABLE category (
    id          BIGINT       NOT NULL PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL,
    parent_id   BIGINT       NOT NULL DEFAULT 0,
    sort        INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE  category IS '商品类目';
COMMENT ON COLUMN category.parent_id IS '父类目ID，0 表示根类目';
COMMENT ON COLUMN category.sort     IS '排序，数值小在前';

-- ============================================================
-- 2. 商品 product
-- ============================================================
CREATE TABLE product (
    id           BIGINT        NOT NULL PRIMARY KEY,
    name         VARCHAR(128)  NOT NULL,
    category_id  BIGINT        NOT NULL,
    price        DECIMAL(10,2) NOT NULL,
    stock        INT           NOT NULL DEFAULT 0,
    status       SMALLINT      NOT NULL DEFAULT 1,
    description  TEXT,
    cover_image  VARCHAR(255),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES category(id)
);
COMMENT ON TABLE  product IS '商品';
COMMENT ON COLUMN product.price        IS '售价';
COMMENT ON COLUMN product.stock        IS '库存数量';
COMMENT ON COLUMN product.status       IS '上下架状态：1上架 0下架';
COMMENT ON COLUMN product.cover_image  IS '商品主图 URL';

-- ============================================================
-- 3. 客户 customer
-- ============================================================
CREATE TABLE customer (
    id         BIGINT       NOT NULL PRIMARY KEY,
    name       VARCHAR(64)  NOT NULL,
    phone      VARCHAR(20),
    email      VARCHAR(128),
    address    VARCHAR(255),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE customer IS '客户';

-- ============================================================
-- 4. 订单主表 orders（order 是 PG 保留字，故用 orders）
-- ============================================================
CREATE TABLE orders (
    id           BIGINT        NOT NULL PRIMARY KEY,
    order_no     VARCHAR(32)  NOT NULL,
    customer_id  BIGINT       NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status       SMALLINT     NOT NULL DEFAULT 0,
    remark       VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_orders_order_no  UNIQUE (order_no),
    CONSTRAINT fk_orders_customer  FOREIGN KEY (customer_id) REFERENCES customer(id)
);
COMMENT ON TABLE  orders IS '订单主表';
COMMENT ON COLUMN orders.order_no     IS '订单号（业务可读）';
COMMENT ON COLUMN orders.total_amount IS '订单总金额';
COMMENT ON COLUMN orders.status       IS '0待付款 1已付款 2已发货 3已完成 4已取消';

-- ============================================================
-- 5. 订单明细 order_item（跟随主订单级联删除）
-- ============================================================
CREATE TABLE order_item (
    id           BIGINT         NOT NULL PRIMARY KEY,
    order_id     BIGINT         NOT NULL,
    product_id   BIGINT         NOT NULL,
    product_name VARCHAR(128)  NOT NULL,
    price        DECIMAL(10,2)  NOT NULL,
    quantity     INT           NOT NULL,
    subtotal     DECIMAL(10,2)  NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders(id)  ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES product(id)
);
COMMENT ON TABLE  order_item IS '订单明细';
COMMENT ON COLUMN order_item.product_name IS '下单时商品名快照';
COMMENT ON COLUMN order_item.price        IS '下单时单价快照';
COMMENT ON COLUMN order_item.subtotal     IS '小计金额 = price * quantity';

-- ============================================================
-- 6. 售后 after_sale
-- ============================================================
CREATE TABLE after_sale (
    id             BIGINT        NOT NULL PRIMARY KEY,
    order_id       BIGINT        NOT NULL,
    customer_id    BIGINT        NOT NULL,
    type           SMALLINT      NOT NULL,
    reason         VARCHAR(255),
    status         SMALLINT      NOT NULL DEFAULT 0,
    refund_amount  DECIMAL(10,2),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT fk_after_sale_order    FOREIGN KEY (order_id)    REFERENCES orders(id),
    CONSTRAINT fk_after_sale_customer FOREIGN KEY (customer_id) REFERENCES customer(id)
);
COMMENT ON TABLE  after_sale IS '售后单';
COMMENT ON COLUMN after_sale.type           IS '1仅退款 2退货退款';
COMMENT ON COLUMN after_sale.status         IS '0申请中 1审核通过 2已完成 3已拒绝';
COMMENT ON COLUMN after_sale.refund_amount  IS '退款金额';
