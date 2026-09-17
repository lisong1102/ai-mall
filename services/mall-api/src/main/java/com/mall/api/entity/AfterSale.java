package com.mall.api.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 售后单。关联订单与客户，记录售后类型、原因与退款金额。
 * type：1仅退款 2退货退款。
 * status：0申请中 1审核通过 2已完成 3已拒绝。
 * 状态流转：申请(0) → 审核(1通过/3拒绝) → 完成(2)。
 */
@Data
@TableName("after_sale")
@Schema(description = "售后单")
public class AfterSale {


    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000040")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 关联订单ID */
    @Schema(description = "订单ID", example = "1890000000000000030")
    private Long orderId;

    /** 客户ID */
    @Schema(description = "客户ID", example = "1890000000000000020")
    private Long customerId;

    /** 售后类型：1仅退款 2退货退款 */
    @Schema(description = "售后类型：1仅退款 2退货退款", example = "1")
    private Integer type;

    /** 申请原因 */
    @Schema(description = "申请原因", example = "商品破损")
    private String reason;

    /** 状态：0申请中 1审核通过 2已完成 3已拒绝 */
    @Schema(description = "状态：0申请中 1审核通过 2已完成 3已拒绝", example = "0")
    private Integer status;

    /** 退款金额 */
    @Schema(description = "退款金额", example = "8999.00")
    private BigDecimal refundAmount;

    /** 创建时间，自动填 */
    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，insert 与 update 时自动填 */
    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
