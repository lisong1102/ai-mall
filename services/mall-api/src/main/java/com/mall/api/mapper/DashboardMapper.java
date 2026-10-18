package com.mall.api.mapper;

import com.mall.api.controller.dto.CategoryShareVO;
import com.mall.api.controller.dto.DailySalesVO;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 仪表盘聚合查询 Mapper。
 * 均为跨表/聚合查询，SQL 写在 resources/mapper/DashboardMapper.xml；
 * 简单计数（订单数、新增客户、待审售后）不走这里，由 Service 用各 BaseMapper 完成。
 */
public interface DashboardMapper {

    /** 指定时间段内、指定状态集合的销售额汇总（无记录返回 0） */
    BigDecimal sumSales(@Param("statuses") List<Integer> statuses,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    /** 自 start 起按日聚合销售额与成交单数（只包含有成交的日期，缺省日期由 Service 补零） */
    List<DailySalesVO> selectDailySales(@Param("statuses") List<Integer> statuses,
            @Param("start") LocalDateTime start);

    /** 按类目聚合销售金额与件数（订单明细快照金额，按金额降序） */
    List<CategoryShareVO> selectCategoryShare(@Param("statuses") List<Integer> statuses);
}
