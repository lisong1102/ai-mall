package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 创建订单时的明细请求体。下单时保存商品名与单价的快照，
 * 确保商品后续改价不影响历史订单数据。
 * productName 由前端传入（可从商品详情取），price 为下单时的成交单价。
 */
@Data
@Schema(description = "订单明细请求")
public class OrderItemReq {

    @Schema(description = "商品ID", example = "1890000000000000010")
    @NotNull(message = "商品ID不能为空")
    private Long productId;

    @Schema(description = "商品名快照", example = "iPhone 16 Pro")
    @NotBlank(message = "商品名不能为空")
    private String productName;

    @Schema(description = "单价快照", example = "8999.00")
    @NotNull(message = "单价不能为空")
    @DecimalMin(value = "0.00", message = "单价不能为负数")
    private BigDecimal price;

    @Schema(description = "购买数量", example = "2")
    @NotNull(message = "购买数量不能为空")
    @Min(value = 1, message = "购买数量至少为 1")
    private Integer quantity;
}
