package com.mall.api.security;

import com.mall.api.common.UnauthorizedException;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * JWT 认证拦截器：从 Authorization: Bearer xxx 取 token，
 * 校验通过后把 userId / username 存入 request attribute 供 Controller 使用。
 * 失败统一抛 {@link UnauthorizedException}，由 GlobalExceptionHandler 转 401。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USER_ID = "auth.userId";
    public static final String ATTR_USERNAME = "auth.username";

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new UnauthorizedException("未登录或登录已过期");
        }
        String token = header.substring(7).trim();
        try {
            Claims claims = jwtUtil.parse(token);
            request.setAttribute(ATTR_USER_ID, Long.valueOf(claims.getSubject()));
            request.setAttribute(ATTR_USERNAME, claims.get("username", String.class));
            return true;
        } catch (Exception e) {
            log.debug("JWT 校验失败: {}", e.getMessage());
            throw new UnauthorizedException("登录状态无效，请重新登录");
        }
    }
}
