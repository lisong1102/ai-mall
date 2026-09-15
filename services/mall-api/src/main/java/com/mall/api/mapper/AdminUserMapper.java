package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mall.api.entity.AdminUser;

/**
 * 管理员用户 Mapper。单表 CRUD 走 BaseMapper，用户名查询用 LambdaQueryWrapper。
 */
public interface AdminUserMapper extends BaseMapper<AdminUser> {
}
