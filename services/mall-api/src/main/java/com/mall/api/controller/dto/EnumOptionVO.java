package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 枚举选项（字典项），由 GET /api/enums 批量下发。
 * color 为前端标签色等展示提示，可能为 null。
 */
@Schema(description = "枚举选项")
public record EnumOptionVO(
        @Schema(description = "状态码（落库值）", example = "0") Integer code,
        @Schema(description = "展示文案", example = "待付款") String label,
        @Schema(description = "展示提示（antd Tag 颜色）", example = "gold") String color) {
}
