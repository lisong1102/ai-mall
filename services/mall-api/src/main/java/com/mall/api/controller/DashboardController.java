package com.mall.api.controller;

import com.mall.api.common.Result;
import com.mall.api.controller.dto.CategoryShareVO;
import com.mall.api.controller.dto.DailySalesVO;
import com.mall.api.controller.dto.DashboardSummaryVO;
import com.mall.api.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 仪表盘统计 RESTful 接口。
 * 路径约定：/api/dashboard + 具体统计视图；均为只读聚合查询。
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "仪表盘统计", description = "销售额/订单/客户/售后汇总与趋势")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    @Operation(summary = "汇总指标", description = "今日销售额/订单数/新增客户及昨日对照，外加待处理售后数")
    public Result<DashboardSummaryVO> summary() {
        return Result.ok(dashboardService.summary());
    }

    @GetMapping("/sales-trend")
    @Operation(summary = "销售趋势", description = "近 N 天每日销售额与成交单数（含今天，无成交日期补零）")
    public Result<List<DailySalesVO>> salesTrend(
            @Parameter(description = "天数，默认 7") @RequestParam(defaultValue = "7") int days) {
        return Result.ok(dashboardService.salesTrend(days));
    }

    @GetMapping("/category-share")
    @Operation(summary = "类目销售占比", description = "按类目聚合销售金额与件数，按金额降序")
    public Result<List<CategoryShareVO>> categoryShare() {
        return Result.ok(dashboardService.categoryShare());
    }
}
