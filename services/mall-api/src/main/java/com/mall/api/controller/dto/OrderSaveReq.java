package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 创建订单时的请求体。包含客户ID、备注与至少一条明细。
 * 明细列表用 @Valid 触发级联校验，每个 OrderItemReq 的字段都会被校验。
 * totalAmount 与 orderNo 由 Service 层计算生成，无需前端传入。
 */
@Data
@Schema(description = "订单创建请求")
public class OrderSaveReq {

    @Schema(description = "客户ID", example = "1890000000000000020")
    @NotNull(message = "客户ID不能为空")
    private Long customerId;

    @Schema(description = "备注", example = "尽快发货")
    @Size(max = 255, message = "备注长度不能超过 255")
    private String remark;

    @Schema(description = "订单明细列表，至少一条")
    @NotEmpty(message = "订单明细不能为空")
    @Valid
    private List<OrderItemReq> items;
}
