package com.mall.api.common.enums;

import com.mall.api.controller.dto.EnumOptionVO;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 枚举类型注册表：对外的类型名 → 枚举类。
 * 新增需要下发的枚举时，实现 BaseEnum 后在 REGISTRY 加一行即可，
 * EnumController 无需改动。类型名用下划线风格（如 order_status），避免暴露包结构。
 */
public final class EnumRegistry {

    private static final Map<String, Class<? extends BaseEnum>> REGISTRY = Map.of(
            "order_status", OrderStatusEnum.class);

    private EnumRegistry() {
    }

    /** 按类型名取枚举选项列表，未注册的类型抛 IllegalArgumentException（由全局异常处理转 400） */
    public static List<EnumOptionVO> optionsOf(String type) {
        Class<? extends BaseEnum> enumClass = REGISTRY.get(type);
        if (enumClass == null) {
            throw new IllegalArgumentException("未知的枚举类型: " + type);
        }
        return Arrays.stream(enumClass.getEnumConstants())
                .map(e -> new EnumOptionVO(e.getCode(), e.getLabel(), e.getColor()))
                .toList();
    }
}
