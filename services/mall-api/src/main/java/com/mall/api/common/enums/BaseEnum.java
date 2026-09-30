package com.mall.api.common.enums;

/**
 * 业务枚举统一契约。
 * 所有需要对前端暴露（字典下发）或需要在代码内语义化使用的枚举都实现本接口，
 * 由 EnumRegistry 注册后即可通过 GET /api/enums?types=xxx 批量下发给前端。
 * code 为落库值（Integer），label 为展示文案，color 为前端标签色等展示提示（无展示需求时返回 null）。
 */
public interface BaseEnum {

    /** 落库/传输用的状态码 */
    Integer getCode();

    /** 展示文案 */
    String getLabel();

    /** 展示提示（如 antd Tag 颜色），无展示需求的枚举保持默认 null */
    default String getColor() {
        return null;
    }
}
