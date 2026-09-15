package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/**
 * 登录请求入参。
 */
@Schema(description = "登录请求")
public record LoginReq(
        @Schema(description = "用户名", example = "admin")
        @NotBlank(message = "用户名不能为空")
        String username,

        @Schema(description = "密码", example = "admin123")
        @NotBlank(message = "密码不能为空")
        String password
) {
}
