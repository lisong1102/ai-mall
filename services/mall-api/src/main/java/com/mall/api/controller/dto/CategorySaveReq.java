package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 新增/修改类目时的请求体。校验规则用 Jakarta Validation 注解，
 * 校验失败由 GlobalExceptionHandler 转成 Result.error(400, ...)。
 */
@Data
@Schema(description = "类目新增/修改请求")
public class CategorySaveReq {

    @Schema(description = "类目名", example = "手机")
    @NotBlank(message = "类目名不能为空")
    @Size(max = 64, message = "类目名长度不能超过 64")
    private String name;

    @Schema(description = "父类目ID，0 或不传表示根类目", example = "0")
    private Long parentId;

    @Schema(description = "排序值，数值小在前", example = "0")
    private Integer sort;
}
