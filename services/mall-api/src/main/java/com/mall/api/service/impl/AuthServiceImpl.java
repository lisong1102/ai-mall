package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.mall.api.controller.dto.LoginResp;
import com.mall.api.entity.AdminUser;
import com.mall.api.mapper.AdminUserMapper;
import com.mall.api.security.JwtUtil;
import com.mall.api.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 认证服务实现：BCrypt 校验密码（恒定慢哈希，防时序/彩虹表），jjwt 签发 token。
 * 用户不存在与密码错误返回相同文案，避免账号被枚举。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AdminUserMapper adminUserMapper;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public LoginResp login(String username, String password) {
        AdminUser user = adminUserMapper.selectOne(
                Wrappers.<AdminUser>lambdaQuery().eq(AdminUser::getUsername, username));
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        String token = jwtUtil.generate(user.getId(), user.getUsername());
        return new LoginResp(
                token,
                "Bearer",
                jwtUtil.getExpiration() / 1000,
                new LoginResp.UserInfo(
                        String.valueOf(user.getId()),
                        user.getUsername(),
                        user.getNickname()
                )
        );
    }

    @Override
    public AdminUser getCurrentUser(Long userId) {
        AdminUser user = adminUserMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }
        return user;
    }
}
