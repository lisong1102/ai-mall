-- 订单状态新增退款中/已退款：申请售后 → 退款中(5)，售后审核通过 → 已退款(6)，拒绝 → 恢复已完成(3)
-- status 为 SMALLINT 无约束，仅同步列注释
COMMENT ON COLUMN orders.status IS '0待付款 1已付款 2已发货 3已完成 4已取消 5退款中 6已退款';
