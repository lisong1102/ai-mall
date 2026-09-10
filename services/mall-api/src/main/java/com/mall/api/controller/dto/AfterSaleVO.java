package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 售后视图对象（View Object）。
 * 在 AfterSale 实体字段基础上额外携带 orderNo 与 customerName，
 * 用于前端列表/详情展示，避免前端发 N 次请求查订单号与客户名。
 * 由 AfterSaleMapper.xml 的联表查询直接填充。
 */
@Data
@Schema(description = "售后视图（含订单号与客户名）")
public class AfterSaleVO {

    @Schema(description = "主键ID", example = "1890000000000000040")
    private Long id;

    @Schema(description = "订单ID", example = "1890000000000000030")
    private Long orderId;

    @Schema(description = "订单号（联表查出）", example = "ORD20260910120000123")
    private String orderNo;

    @Schema(description = "客户ID", example = "1890000000000000020")
    private Long customerId;

    @Schema(description = "客户名（联表查出）", example = "张三")
    private String customerName;

    @Schema(description = "售后类型：1仅退款 2退货退款", example = "1")
    private Integer type;

    @Schema(description = "申请原因", example = "商品破损")
    private String reason;

    @Schema(description = "状态：0申请中 1审核通过 2已完成 3已拒绝", example = "0")
    private Integer status;

    @Schema(description = "退款金额", example = "8999.00")
    private BigDecimal refundAmount;

    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    private LocalDateTime updatedAt;
}
