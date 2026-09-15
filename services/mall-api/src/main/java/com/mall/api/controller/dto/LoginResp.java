package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 登录成功响应：JWT + 过期时长 + 当前用户信息（不含密码）。
 */
@Schema(description = "登录响应")
public record LoginResp(
        @Schema(description = "JWT 访问令牌") String token,
        @Schema(description = "令牌类型") String tokenType,
        @Schema(description = "有效期（秒）") long expiresIn,
        UserInfo user
) {

    @Schema(description = "登录用户信息")
    public record UserInfo(
            @Schema(description = "用户ID") String id,
            @Schema(description = "用户名") String username,
            @Schema(description = "昵称") String nickname
    ) {
    }
}
