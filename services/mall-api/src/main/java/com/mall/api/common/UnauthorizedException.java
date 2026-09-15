package com.mall.api.common;

/**
 * 未认证/认证失败：缺失或非法 JWT。由全局异常处理器转为 HTTP 401。
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
