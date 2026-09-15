-- 后台管理员用户表（P1.8 简单登录）
-- 密码存 BCrypt 哈希（spring-security-crypto），默认 admin/admin123 由应用启动时 DataInitializer 播种
-- 时间列沿用 V2 约定：TIMESTAMP（无时区），时区由应用层 Asia/Shanghai 统一处理
CREATE TABLE admin_user (
    id          BIGINT       NOT NULL PRIMARY KEY,
    username    VARCHAR(64)  NOT NULL,
    password    VARCHAR(100) NOT NULL,
    nickname    VARCHAR(64)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uk_admin_user_username UNIQUE (username)
);
COMMENT ON TABLE  admin_user IS '后台管理员用户';
COMMENT ON COLUMN admin_user.password IS 'BCrypt 哈希后的密码';
