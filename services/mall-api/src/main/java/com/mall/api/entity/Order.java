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
 * 订单主表。PG 中 order 是保留字，故表名为 orders。
 * status：0待付款 1已付款 2已发货 3已完成 4已取消。
 * total_amount 由订单明细小计汇总得出，创建时计算并落库。
 */
@Data
@TableName("orders")
@Schema(description = "订单")
public class Order {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000030")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 订单号（业务可读），由应用层生成 */
    @Schema(description = "订单号", example = "ORD20260910120000123")
    private String orderNo;

    /** 客户ID */
    @Schema(description = "客户ID", example = "1890000000000000020")
    private Long customerId;

    /** 订单总金额（明细小计汇总） */
    @Schema(description = "订单总金额", example = "17998.00")
    private BigDecimal totalAmount;

    /** 订单状态：0待付款 1已付款 2已发货 3已完成 4已取消 */
    @Schema(description = "订单状态：0待付款 1已付款 2已发货 3已完成 4已取消", example = "0")
    private Integer status;

    /** 备注 */
    @Schema(description = "备注", example = "尽快发货")
    private String remark;

    /** 创建时间，自动填 */
    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，insert 与 update 时自动填 */
    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

}
