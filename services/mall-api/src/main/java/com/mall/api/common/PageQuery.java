package com.mall.api.common;

import lombok.Data;

/**
 * 统一分页查询入参。所有列表接口的查询 DTO 可继承它复用 page/size 字段。
 * MyBatis-Plus 的 Page 对象下标从 1 开始，这里 page=1 表示第一页。
 */
@Data
public class PageQuery {

    /** 页码，从 1 开始；默认 1 */
    private Long page = 1L;

    /** 每页大小，默认 10，上限 100 */
    private Long size = 10L;

    /** 防止前端传入超大 size 拖垮数据库 */
    public Long getSize() {
        if (size == null || size < 1) return 10L;
        return Math.min(size, 100L);
    }

    public Long getPage() {
        if (page == null || page < 1) return 1L;
        return page;
    }
}
