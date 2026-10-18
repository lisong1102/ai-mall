package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 单日销售数据（销售趋势图用）。
 * date 为 yyyy-MM-dd 字符串；无成交的日期由 Service 层补零后返回，保证天数连续。
 */
@Data
@Schema(description = "单日销售数据")
public class DailySalesVO {

    @Schema(description = "日期（yyyy-MM-dd）", example = "2026-10-17")
    private String date;

    @Schema(description = "当日销售额（已付款/已发货/已完成订单）", example = "2399.00")
    private BigDecimal amount;

    @Schema(description = "当日成交订单数（同销售额口径）", example = "12")
    private long orderCount;
}
