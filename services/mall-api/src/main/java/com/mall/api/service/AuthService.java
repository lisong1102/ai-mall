package com.mall.api.service;

import com.mall.api.controller.dto.LoginResp;
import com.mall.api.entity.AdminUser;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 认证服务：用户名密码登录换取 JWT、按 ID 查询当前登录用户。
 */
public interface AuthService {

    /** 校验账号密码，成功返回 token + 用户信息 */
    LoginResp login(String username, String password);

    /** 注册新用户 */
    void register(String username, String password);

    /** 退出登录，清除 JWT 中的 userId */
    Boolean logout(HttpServletRequest request);

    /** 根据 JWT 中的 userId 查询当前用户（不存在抛 IllegalArgumentException → 401/400） */
    AdminUser getCurrentUser(Long userId);
}
