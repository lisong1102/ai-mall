package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mall.api.entity.OrderItem;

/**
 * OrderItem Mapper。继承 BaseMapper 即获得 insert/selectById 等基础方法。
 * 明细为单表查询，按 orderId 查询走 LambdaQueryWrapper，无需 XML。
 */
public interface OrderItemMapper extends BaseMapper<OrderItem> {
}
