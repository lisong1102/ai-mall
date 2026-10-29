-- ai-mall 业务演示数据（mall schema）
-- 用法（本地一行导入远程）：
--   cat scripts/seed.sql | ssh root@39.107.89.142 "docker exec -i ai-mall-postgres psql -U mall -d ai_mall"
-- 说明：
--   1. 主键应用层雪花生成；此处手动指定 1xxx~5xxx 小号段，不会与雪花 ID 冲突
--   2. ON CONFLICT DO NOTHING，可重复执行
--   3. created_at 用相对表达式，订单分布在最近 30 天，仪表盘趋势有数据

\set ON_ERROR_STOP on
BEGIN;

-- ============================================================
-- 1. 类目（level: 1 根类目 2 子类目）
-- ============================================================
INSERT INTO category (id, name, parent_id, level, sort) VALUES
  (1001, '手机数码', 0,    1, 0),
  (1002, '电脑办公', 0,    1, 1),
  (1003, '家用电器', 0,    1, 2),
  (1004, '手机',     1001, 2, 0),
  (1005, '耳机音箱', 1001, 2, 1),
  (1006, '笔记本',   1002, 2, 0),
  (1007, '显示器',   1002, 2, 1),
  (1008, '冰箱',     1003, 2, 0),
  (1009, '洗衣机',   1003, 2, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. 商品（status: 1 上架）
-- ============================================================
INSERT INTO product (id, name, category_id, price, stock, status, description, cover_image) VALUES
  (2001, 'iPhone 16 Pro',          1004,  8999.00, 50,  1, '苹果最新旗舰手机，A18 Pro 芯片，钛金属机身',          'https://picsum.photos/seed/iphone16pro/400/400'),
  (2002, '小米 15',                1004,  4499.00, 120, 1, '骁龙 8 至尊版，徕卡光学镜头，小屏旗舰',              'https://picsum.photos/seed/xiaomi15/400/400'),
  (2003, '华为 Mate 70 Pro',       1004,  6499.00, 80,  1, '麒麟芯片回归，红枫原色影像，卫星通信',                'https://picsum.photos/seed/mate70/400/400'),
  (2004, 'AirPods Pro 2',          1005,  1899.00, 200, 1, '主动降噪无线耳机，H2 芯片，自适应通透模式',          'https://picsum.photos/seed/airpodspro2/400/400'),
  (2005, '索尼 WH-1000XM5',        1005,  2499.00, 60,  1, '头戴式降噪耳机，30 小时续航，LDAC 高解析音质',       'https://picsum.photos/seed/sonywh1000xm5/400/400'),
  (2006, '小米小爱音箱 Pro',       1005,   299.00, 300, 1, '智能家居中控，红外遥控，Hi-Fi 级音质',               'https://picsum.photos/seed/mispeaker/400/400'),
  (2007, 'MacBook Pro 14',         1006, 14999.00, 30,  1, 'M4 Pro 芯片，Liquid 视网膜 XDR 屏，专业创作本',      'https://picsum.photos/seed/mbp14/400/400'),
  (2008, 'ThinkPad X1 Carbon',     1006, 10999.00, 45,  1, '轻薄商务本标杆，碳纤维机身，军工品质',               'https://picsum.photos/seed/thinkpadx1/400/400'),
  (2009, 'RedmiBook Pro 16',       1006,  4599.00, 90,  1, '16 英寸 3.2K 高刷屏，性价比生产力工具',              'https://picsum.photos/seed/redmibook16/400/400'),
  (2010, 'LG 27UP850 4K 显示器',   1007,  2499.00, 70,  1, '27 英寸 4K IPS 屏，96W Type-C 反向供电',             'https://picsum.photos/seed/lg27up850/400/400'),
  (2011, '小米 34 英寸曲面显示器', 1007,  1599.00, 85,  1, '34 英寸 21:9 带鱼屏，144Hz 高刷，办公游戏两相宜',    'https://picsum.photos/seed/mimonitor34/400/400'),
  (2012, '海尔 501L 对开门冰箱',   1008,  3999.00, 25,  1, '一级能效风冷无霜，干湿分储，智能变频',               'https://picsum.photos/seed/haier501/400/400'),
  (2013, '美的三门冰箱 231L',      1008,  2299.00, 40,  1, '小户型优选，中门变温室，节能静音',                   'https://picsum.photos/seed/midea231/400/400'),
  (2014, '小天鹅滚筒洗衣机 10kg',  1009,  2799.00, 35,  1, 'BLDC 变频电机，95℃ 高温煮洗，除菌除螨',              'https://picsum.photos/seed/littleswan10/400/400'),
  (2015, '西门子洗烘一体机',       1009,  5999.00, 20,  1, '10kg 洗 7kg 烘，智能除渍，热风清新',                 'https://picsum.photos/seed/siemenswd/400/400')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. 客户
-- ============================================================
INSERT INTO customer (id, name, phone, email, address) VALUES
  (1001, '张伟', '13800001111', 'zhangwei@example.com', '北京市朝阳区望京 SOHO T1 座 1801'),
  (1002, '李娜', '13900002222', 'lina@example.com',     '上海市浦东新区张江高科技园区博云路 2 号'),
  (1003, '王强', '13700003333', 'wangqiang@example.com','深圳市南山区科技园南区 R2-B 栋 5 楼'),
  (1004, '刘洋', '13600004444', 'liuyang@example.com',  '杭州市西湖区文三路 90 号东部软件园'),
  (1005, '陈静', '13500005555', 'chenjing@example.com', '成都市高新区天府软件园 C 区 12 栋')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. 订单（status: 0待付款 1已付款 2已发货 3已完成 4已取消 5退款中）
--    created_at 分布在最近 30 天，total_amount 与明细小计一致
-- ============================================================
INSERT INTO orders (id, order_no, customer_id, total_amount, status, remark, created_at, updated_at) VALUES
  (3001, 'M2026091800001', 1001,  8999.00, 3, '老客户回购，优先发货',   now() - interval '30 days', now() - interval '29 days'),
  (3002, 'M2026092300001', 1002,  2497.00, 3, NULL,                     now() - interval '25 days', now() - interval '24 days'),
  (3003, 'M2026093000001', 1003, 14999.00, 2, '公司采购，需开专票',     now() - interval '18 days', now() - interval '17 days'),
  (3004, 'M2026100600001', 1001,  4499.00, 1, NULL,                     now() - interval '12 days', now() - interval '12 days'),
  (3005, 'M2026101100001', 1004,  3999.00, 4, '客户主动取消，未付款',   now() - interval '7 days',  now() - interval '6 days'),
  (3006, 'M2026101500001', 1005,  2499.00, 0, NULL,                     now() - interval '3 days',  now() - interval '3 days'),
  (3007, 'M2026101700001', 1002,  2499.00, 5, '客户申请仅退款，待审核', now() - interval '1 day',   now() - interval '12 hours'),
  (3008, 'M2026101800001', 1003,  6198.00, 1, '两件商品一起发',         now(),                      now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. 订单明细（product_name/price 为下单时快照）
-- ============================================================
INSERT INTO order_item (id, order_id, product_id, product_name, price, quantity, subtotal, created_at) VALUES
  (4001, 3001, 2001, 'iPhone 16 Pro',          8999.00, 1,  8999.00, now() - interval '30 days'),
  (4002, 3002, 2004, 'AirPods Pro 2',          1899.00, 1,  1899.00, now() - interval '25 days'),
  (4003, 3002, 2006, '小米小爱音箱 Pro',        299.00, 2,   598.00, now() - interval '25 days'),
  (4004, 3003, 2007, 'MacBook Pro 14',        14999.00, 1, 14999.00, now() - interval '18 days'),
  (4005, 3004, 2002, '小米 15',                4499.00, 1,  4499.00, now() - interval '12 days'),
  (4006, 3005, 2012, '海尔 501L 对开门冰箱',   3999.00, 1,  3999.00, now() - interval '7 days'),
  (4007, 3006, 2010, 'LG 27UP850 4K 显示器',   2499.00, 1,  2499.00, now() - interval '3 days'),
  (4008, 3007, 2005, '索尼 WH-1000XM5',        2499.00, 1,  2499.00, now() - interval '1 day'),
  (4009, 3008, 2009, 'RedmiBook Pro 16',       4599.00, 1,  4599.00, now()),
  (4010, 3008, 2011, '小米 34 英寸曲面显示器', 1599.00, 1,  1599.00, now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. 售后单（与 3007「退款中」订单对应，type: 1仅退款 status: 0申请中）
-- ============================================================
INSERT INTO after_sale (id, order_id, customer_id, type, reason, status, refund_amount, created_at, updated_at) VALUES
  (5001, 3007, 1002, 1, '耳机左耳有电流杂音，申请仅退款', 0, 2499.00, now() - interval '12 hours', now() - interval '12 hours')
ON CONFLICT DO NOTHING;

COMMIT;

-- 验证
SELECT 'category'   AS table_name, count(*) FROM category
UNION ALL SELECT 'product',    count(*) FROM product
UNION ALL SELECT 'customer',   count(*) FROM customer
UNION ALL SELECT 'orders',     count(*) FROM orders
UNION ALL SELECT 'order_item', count(*) FROM order_item
UNION ALL SELECT 'after_sale', count(*) FROM after_sale;
