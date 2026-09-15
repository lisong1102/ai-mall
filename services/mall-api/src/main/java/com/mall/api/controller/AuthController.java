package com.mall.api.controller;

import com.mall.api.common.Result;
import com.mall.api.common.UnauthorizedException;
import com.mall.api.controller.dto.LoginReq;
import com.mall.api.controller.dto.LoginResp;
import com.mall.api.entity.AdminUser;
import com.mall.api.security.JwtAuthInterceptor;
import com.mall.api.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口：登录（放行）、获取当前登录用户（需带 token）。
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "后台登录与当前用户")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "用户名密码登录，返回 JWT")
    public Result<LoginResp> login(@Valid @RequestBody LoginReq req) {
        return Result.ok(authService.login(req.username(), req.password()));
    }

    @GetMapping("/me")
    @Operation(summary = "获取当前登录用户")
    public Result<LoginResp.UserInfo> me(HttpServletRequest request) {
        Long userId = (Long) request.getAttribute(JwtAuthInterceptor.ATTR_USER_ID);
        if (userId == null) {
            throw new UnauthorizedException("未登录");
        }
        AdminUser user = authService.getCurrentUser(userId);
        return Result.ok(new LoginResp.UserInfo(
                String.valueOf(user.getId()),
                user.getUsername(),
                user.getNickname()
        ));
    }
}
