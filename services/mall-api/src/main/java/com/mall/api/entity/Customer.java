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
 * 客户。记录姓名/手机/邮箱/地址等联系方式，被订单与售后单引用。
 */
@Data
@TableName("customer")
@Schema(description = "客户")
public class Customer {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000020")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 客户姓名 */
    @Schema(description = "客户姓名", example = "张三")
    private String name;

    /** 手机号 */
    @Schema(description = "手机号", example = "13800138000")
    private String phone;

    /** 邮箱 */
    @Schema(description = "邮箱", example = "zhangsan@example.com")
    private String email;

    /** 收货地址 */
    @Schema(description = "收货地址", example = "北京市朝阳区xx路xx号")
    private String address;

    /** 创建时间，自动填 */
    @Schema(description = "创建时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，insert 与 update 时自动填 */
    @Schema(description = "更新时间", example = "2026-09-10T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
