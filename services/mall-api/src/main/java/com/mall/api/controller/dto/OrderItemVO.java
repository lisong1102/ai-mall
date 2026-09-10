package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单明细视图对象。展示下单时的商品快照与金额。
 */
@Data
@Schema(description = "订单明细视图")
public class OrderItemVO {

    @Schema(description = "明细ID", example = "1890000000000000031")
    private Long id;

    @Schema(description = "订单ID", example = "1890000000000000030")
    private Long orderId;

    @Schema(description = "商品ID", example = "1890000000000000010")
    private Long productId;

    @Schema(description = "商品名快照", example = "iPhone 16 Pro")
    private String productName;

    @Schema(description = "单价快照", example = "8999.00")
    private BigDecimal price;

    @Schema(description = "购买数量", example = "2")
    private Integer quantity;

    @Schema(description = "小计金额", example = "17998.00")
    private BigDecimal subtotal;
}
