package com.mall.api.service;

import com.mall.api.controller.dto.CategoryShareVO;
import com.mall.api.controller.dto.DailySalesVO;
import com.mall.api.controller.dto.DashboardSummaryVO;

import java.util.List;

/**
 * 仪表盘统计 Service。
 * 汇总接口同时返回今日与昨日值，环比趋势由前端计算。
 */
public interface DashboardService {

    /** 汇总指标：今日销售额/订单数/新增客户 + 昨日对照 + 待处理售后数 */
    DashboardSummaryVO summary();

    /** 近 days 天销售趋势（含今天，无成交日期补零，按日期升序） */
    List<DailySalesVO> salesTrend(int days);

    /** 类目销售占比（按销售额降序） */
    List<CategoryShareVO> categoryShare();
}
