package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 新增/修改商品时的请求体。校验规则用 Jakarta Validation 注解，
 * 校验失败由 GlobalExceptionHandler 转成 Result.error(400, ...)。
 */
@Data
@Schema(description = "商品新增/修改请求")
public class ProductSaveReq {

    @Schema(description = "商品名", example = "iPhone 16 Pro")
    @NotBlank(message = "商品名不能为空")
    @Size(max = 128, message = "商品名长度不能超过 128")
    private String name;

    @Schema(description = "类目ID", example = "1890000000000000001")
    @NotNull(message = "类目ID不能为空")
    private Long categoryId;

    @Schema(description = "售价", example = "8999.00")
    @NotNull(message = "售价不能为空")
    @DecimalMin(value = "0.00", message = "售价不能为负数")
    private BigDecimal price;

    @Schema(description = "库存数量", example = "100")
    @Min(value = 0, message = "库存不能为负数")
    private Integer stock;

    @Schema(description = "上下架状态：1上架 0下架", example = "1")
    private Integer status;

    @Schema(description = "商品描述", example = "苹果手机")
    private String description;

    @Schema(description = "商品主图 URL", example = "https://example.com/cover.jpg")
    @Size(max = 255, message = "主图URL长度不能超过 255")
    private String coverImage;
}
