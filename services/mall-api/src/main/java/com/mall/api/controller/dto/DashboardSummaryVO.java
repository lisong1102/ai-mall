package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 仪表盘汇总指标。
 * 销售额口径：订单状态为 已付款/已发货/已完成（1/2/3）的 total_amount 汇总；
 * 订单数口径：当日创建的全部订单（不限状态），与销售额口径不同故分开返回。
 * 同时返回昨日对应值，由前端计算环比趋势。
 */
@Data
@Schema(description = "仪表盘汇总指标（今日 + 昨日对照）")
public class DashboardSummaryVO {

    @Schema(description = "今日销售额（已付款/已发货/已完成订单）", example = "12846.00")
    private BigDecimal todaySales;

    @Schema(description = "昨日销售额（同口径，用于环比）", example = "11420.00")
    private BigDecimal yesterdaySales;

    @Schema(description = "今日订单数（当日创建，不限状态）", example = "86")
    private long todayOrders;

    @Schema(description = "昨日订单数", example = "79")
    private long yesterdayOrders;

    @Schema(description = "今日新增客户数", example = "14")
    private long newCustomers;

    @Schema(description = "昨日新增客户数", example = "11")
    private long yesterdayNewCustomers;

    @Schema(description = "待处理售后数（申请中）", example = "2")
    private long pendingAfterSales;
}
