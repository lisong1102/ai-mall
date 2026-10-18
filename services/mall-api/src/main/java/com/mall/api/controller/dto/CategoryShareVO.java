package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 类目销售占比（按销售额降序）。
 * 由 order_item 快照金额（subtotal）按商品所属类目聚合，
 * 口径与销售额一致：仅统计 已付款/已发货/已完成 订单。
 */
@Data
@Schema(description = "类目销售占比")
public class CategoryShareVO {

    @Schema(description = "类目名", example = "手机数码")
    private String categoryName;

    @Schema(description = "销售金额", example = "4890.00")
    private BigDecimal amount;

    @Schema(description = "销售件数", example = "128")
    private long quantity;
}
