package com.mall.api.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 后台管理员用户。password 列存 BCrypt 哈希，永不返回给前端。
 */
@Data
@TableName("admin_user")
@Schema(description = "后台管理员用户")
public class AdminUser {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 登录用户名，唯一 */
    @Schema(description = "登录用户名")
    private String username;

    /** BCrypt 哈希密码 */
    @Schema(hidden = true)
    private String password;

    /** 昵称（展示用） */
    @Schema(description = "昵称")
    private String nickname;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
