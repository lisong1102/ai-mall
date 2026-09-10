package com.mall.api.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 新增/修改客户时的请求体。校验规则用 Jakarta Validation 注解，
 * 校验失败由 GlobalExceptionHandler 转成 Result.error(400, ...)。
 */
@Data
@Schema(description = "客户新增/修改请求")
public class CustomerSaveReq {

    @Schema(description = "客户姓名", example = "张三")
    @NotBlank(message = "客户姓名不能为空")
    @Size(max = 64, message = "客户姓名长度不能超过 64")
    private String name;

    @Schema(description = "手机号", example = "13800138000")
    @Size(max = 20, message = "手机号长度不能超过 20")
    private String phone;

    @Schema(description = "邮箱", example = "zhangsan@example.com")
    @Email(message = "邮箱格式不正确")
    @Size(max = 128, message = "邮箱长度不能超过 128")
    private String email;

    @Schema(description = "收货地址", example = "北京市朝阳区xx路xx号")
    @Size(max = 255, message = "地址长度不能超过 255")
    private String address;
}
