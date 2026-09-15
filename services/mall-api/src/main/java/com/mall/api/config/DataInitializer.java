package com.mall.api.config;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.mall.api.entity.AdminUser;
import com.mall.api.mapper.AdminUserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 启动播种：admin_user 表为空时插入默认管理员 admin/admin123（BCrypt 哈希）。
 * 仅首次启动执行；生产环境应在登录后立即修改密码。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminUserMapper adminUserMapper;

    @Value("${app.init.admin-username:admin}")
    private String defaultUsername;

    @Value("${app.init.admin-password:admin123}")
    private String defaultPassword;

    @Override
    public void run(String... args) {
        Long count = adminUserMapper.selectCount(
                Wrappers.<AdminUser>lambdaQuery().eq(AdminUser::getUsername, defaultUsername));
        if (count != null && count > 0) {
            return;
        }
        PasswordEncoder encoder = new BCryptPasswordEncoder();
        AdminUser admin = new AdminUser();
        admin.setUsername(defaultUsername);
        admin.setPassword(encoder.encode(defaultPassword));
        admin.setNickname("管理员");
        adminUserMapper.insert(admin);
        log.info("已播种默认管理员账号: {}（请尽快修改默认密码）", defaultUsername);
    }
}
