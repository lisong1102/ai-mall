package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.mall.api.common.enums.OrderStatusEnum;
import com.mall.api.controller.dto.CategoryShareVO;
import com.mall.api.controller.dto.DailySalesVO;
import com.mall.api.controller.dto.DashboardSummaryVO;
import com.mall.api.entity.AfterSale;
import com.mall.api.entity.Customer;
import com.mall.api.entity.Order;
import com.mall.api.mapper.AfterSaleMapper;
import com.mall.api.mapper.CustomerMapper;
import com.mall.api.mapper.DashboardMapper;
import com.mall.api.mapper.OrderMapper;
import com.mall.api.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 仪表盘统计实现。
 * 销售额口径：已付款/已发货/已完成（待付款未收款、取消/退款不计入）；
 * 简单计数走各 BaseMapper + LambdaQueryWrapper，聚合/联表走 DashboardMapper XML。
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    /** 计入销售额的订单状态 */
    private static final List<Integer> SALES_STATUSES = List.of(
            OrderStatusEnum.PAID.getCode(),
            OrderStatusEnum.SHIPPED.getCode(),
            OrderStatusEnum.COMPLETED.getCode());

    /** 售后状态：申请中（待审核），无独立枚举类，随 after_sale 表约定 */
    private static final int AFTER_SALE_PENDING = 0;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final DashboardMapper dashboardMapper;
    private final OrderMapper orderMapper;
    private final CustomerMapper customerMapper;
    private final AfterSaleMapper afterSaleMapper;

    @Override
    public DashboardSummaryVO summary() {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime tomorrowStart = today.plusDays(1).atStartOfDay();
        LocalDateTime yesterdayStart = today.minusDays(1).atStartOfDay();

        DashboardSummaryVO vo = new DashboardSummaryVO();
        vo.setTodaySales(dashboardMapper.sumSales(SALES_STATUSES, todayStart, tomorrowStart));
        vo.setYesterdaySales(dashboardMapper.sumSales(SALES_STATUSES, yesterdayStart, todayStart));
        vo.setTodayOrders(countOrders(todayStart, tomorrowStart));
        vo.setYesterdayOrders(countOrders(yesterdayStart, todayStart));
        vo.setNewCustomers(countCustomers(todayStart, tomorrowStart));
        vo.setYesterdayNewCustomers(countCustomers(yesterdayStart, todayStart));
        vo.setPendingAfterSales(afterSaleMapper.selectCount(
                new LambdaQueryWrapper<AfterSale>().eq(AfterSale::getStatus, AFTER_SALE_PENDING)));
        return vo;
    }

    @Override
    public List<DailySalesVO> salesTrend(int days) {
        if (days <= 0) {
            days = 7;
        }
        LocalDate startDate = LocalDate.now().minusDays(days - 1L);
        Map<String, DailySalesVO> byDate = dashboardMapper
                .selectDailySales(SALES_STATUSES, startDate.atStartOfDay())
                .stream()
                .collect(Collectors.toMap(DailySalesVO::getDate, Function.identity()));
        // 无成交的日期补零，保证返回连续 days 天
        List<DailySalesVO> result = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            String date = startDate.plusDays(i).format(DATE_FMT);
            result.add(byDate.getOrDefault(date, zeroDay(date)));
        }
        return result;
    }

    @Override
    public List<CategoryShareVO> categoryShare() {
        return dashboardMapper.selectCategoryShare(SALES_STATUSES);
    }

    /** 统计时间段内创建的订单数（不限状态） */
    private Long countOrders(LocalDateTime start, LocalDateTime end) {
        return orderMapper.selectCount(new LambdaQueryWrapper<Order>()
                .ge(Order::getCreatedAt, start)
                .lt(Order::getCreatedAt, end));
    }

    /** 统计时间段内新增客户数 */
    private Long countCustomers(LocalDateTime start, LocalDateTime end) {
        return customerMapper.selectCount(new LambdaQueryWrapper<Customer>()
                .ge(Customer::getCreatedAt, start)
                .lt(Customer::getCreatedAt, end));
    }

    private DailySalesVO zeroDay(String date) {
        DailySalesVO vo = new DailySalesVO();
        vo.setDate(date);
        vo.setAmount(BigDecimal.ZERO);
        vo.setOrderCount(0L);
        return vo;
    }
}
