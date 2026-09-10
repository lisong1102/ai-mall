package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 申请售后时的请求体。必须关联已有订单与客户，并指定售后类型。
 * status 由 Service 层固定为 0（申请中），refund_amount 可选（审核时再核定）。
 */
@Data
@Schema(description = "售后申请请求")
public class AfterSaleSaveReq {

    @Schema(description = "订单ID", example = "1890000000000000030")
    @NotNull(message = "订单ID不能为空")
    private Long orderId;

    @Schema(description = "客户ID", example = "1890000000000000020")
    @NotNull(message = "客户ID不能为空")
    private Long customerId;

    @Schema(description = "售后类型：1仅退款 2退货退款", example = "1")
    @NotNull(message = "售后类型不能为空")
    private Integer type;

    @Schema(description = "申请原因", example = "商品破损")
    @Size(max = 255, message = "申请原因长度不能超过 255")
    private String reason;

    @Schema(description = "退款金额", example = "8999.00")
    @DecimalMin(value = "0.00", message = "退款金额不能为负数")
    private BigDecimal refundAmount;
}
