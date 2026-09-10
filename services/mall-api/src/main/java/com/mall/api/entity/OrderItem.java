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
 * 订单明细。跟随主订单级联删除。
 * 下单时保存商品名与单价的快照，确保商品后续改价不影响历史订单数据。
 * subtotal = price * quantity，由应用层计算后落库。
 */
@Data
@TableName("order_item")
@Schema(description = "订单明细")
public class OrderItem {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000031")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 所属订单ID */
    @Schema(description = "订单ID", example = "1890000000000000030")
    private Long orderId;

    /** 商品ID */
    @Schema(description = "商品ID", example = "1890000000000000010")
    private Long productId;

    /** 下单时商品名快照 */
    @Schema(description = "商品名快照", example = "iPhone 16 Pro")
    private String productName;

    /** 下单时单价快照 */
    @Schema(description = "单价快照", example = "8999.00")
    private BigDecimal price;

    /** 购买数量 */
    @Schema(description = "购买数量", example = "2")
    private Integer quantity;

    /** 小计金额 = price * quantity */
    @Schema(description = "小计金额", example = "17998.00")
    private BigDecimal subtotal;

    /** 创建时间，自动填（明细无 updated_at） */
    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
