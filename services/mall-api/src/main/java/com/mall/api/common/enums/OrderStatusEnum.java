package com.mall.api.common.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 订单状态枚举，对应 orders.status 字段。
 * 前端通过 GET /api/enums?types=order_status 获取 label/color，不再写死状态文案；
 * 后端代码内一律使用本枚举而非魔法数字。
 */
@Getter
@AllArgsConstructor
public enum OrderStatusEnum implements BaseEnum {

    PENDING_PAYMENT(0, "待付款", "gold"),
    PAID(1, "已付款", "blue"),
    SHIPPED(2, "已发货", "cyan"),
    COMPLETED(3, "已完成", "green"),
    CANCELLED(4, "已取消", "default"),
    REFUNDING(5, "退款中", "orange"),
    REFUNDED(6, "已退款", "purple");

    private final Integer code;
    private final String label;
    private final String color;

    /** 按落库 code 反查枚举，非法值抛 IllegalArgumentException（由全局异常处理转 400） */
    public static OrderStatusEnum of(Integer code) {
        for (OrderStatusEnum e : values()) {
            if (e.code.equals(code)) {
                return e;
            }
        }
        throw new IllegalArgumentException("非法的订单状态: " + code);
    }
}
