package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 商品视图对象（View Object）。
 * 在 Product 实体字段基础上额外携带 categoryName，用于前端列表/详情展示，
 * 避免前端拿到 categoryId 后再发 N 次请求查类目名。
 * 由 ProductMapper.xml 的联表查询直接填充。
 */
@Data
@Schema(description = "商品视图（含类目名）")
public class ProductVO {

    @Schema(description = "主键ID", example = "1890000000000000010")
    private Long id;

    @Schema(description = "商品名", example = "iPhone 16 Pro")
    private String name;

    @Schema(description = "类目ID", example = "1890000000000000001")
    private Long categoryId;

    @Schema(description = "类目名（联表查出）", example = "手机")
    private String categoryName;

    @Schema(description = "售价", example = "8999.00")
    private BigDecimal price;

    @Schema(description = "库存数量", example = "100")
    private Integer stock;

    @Schema(description = "上下架状态：1上架 0下架", example = "1")
    private Integer status;

    @Schema(description = "商品描述", example = "苹果手机")
    private String description;

    @Schema(description = "商品主图 URL", example = "https://example.com/cover.jpg")
    private String coverImage;

    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    private LocalDateTime createdAt;

    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    private LocalDateTime updatedAt;
}
