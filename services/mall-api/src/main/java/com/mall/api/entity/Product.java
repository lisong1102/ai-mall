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
 * 商品。关联 category_id，价格/库存/上下架状态/描述/主图。
 * status：1 上架 0 下架。
 */
@Data
@TableName("product")
@Schema(description = "商品")
public class Product {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000010")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 商品名 */
    @Schema(description = "商品名", example = "iPhone 16 Pro")
    private String name;

    /** 所属类目ID */
    @Schema(description = "类目ID", example = "1890000000000000001")
    private Long categoryId;

    /** 售价 */
    @Schema(description = "售价", example = "8999.00")
    private BigDecimal price;

    /** 库存数量 */
    @Schema(description = "库存数量", example = "100")
    private Integer stock;

    /** 上下架状态：1 上架 0 下架 */
    @Schema(description = "上下架状态：1上架 0下架", example = "1")
    private Integer status;

    /** 商品描述 */
    @Schema(description = "商品描述", example = "苹果手机")
    private String description;

    /** 商品主图 URL */
    @Schema(description = "商品主图 URL", example = "https://example.com/cover.jpg")
    private String coverImage;

    /** 创建时间，自动填 */
    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，insert 与 update 时自动填 */
    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
