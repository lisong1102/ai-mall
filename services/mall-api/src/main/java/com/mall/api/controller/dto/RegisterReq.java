package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "注册请求")
public record RegisterReq(
        @Schema(description = "用户名", example = "admin") @Size(min = 4, max = 16, message = "用户名长度必须在4到16之间") @NotBlank(message = "用户名不能为空") String username,
        @Schema(description = "密码", example = "admin123") @Size(min = 6, max = 20, message = "密码长度必须在6到20之间") @NotBlank(message = "密码不能为空") String password) {

}
