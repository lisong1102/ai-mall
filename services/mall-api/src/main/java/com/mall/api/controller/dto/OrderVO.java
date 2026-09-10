package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 订单视图对象（View Object）。
 * 在 Order 实体字段基础上额外携带 customerName，用于前端列表/详情展示，
 * 避免前端拿到 customerId 后再发 N 次请求查客户名。
 * items 仅在详情接口填充，列表接口为 null 以减少传输量。
 * 由 OrderMapper.xml 的联表查询直接填充 customerName。
 */
@Data
@Schema(description = "订单视图（含客户名，详情另含明细）")
public class OrderVO {

    @Schema(description = "主键ID", example = "1890000000000000030")
    private Long id;

    @Schema(description = "订单号", example = "ORD20260910120000123")
    private String orderNo;

    @Schema(description = "客户ID", example = "1890000000000000020")
    private Long customerId;

    @Schema(description = "客户名（联表查出）", example = "张三")
    private String customerName;

    @Schema(description = "订单总金额", example = "17998.00")
    private BigDecimal totalAmount;

    @Schema(description = "订单状态：0待付款 1已付款 2已发货 3已完成 4已取消", example = "0")
    private Integer status;

    @Schema(description = "备注", example = "尽快发货")
    private String remark;

    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    private LocalDateTime updatedAt;

    /** 订单明细列表，仅详情接口填充 */
    @Schema(description = "订单明细列表（详情接口返回）")
    private List<OrderItemVO> items;
}
