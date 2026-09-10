package com.mall.api.common;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

/**
 * 统一分页返回结构。前端按 records/total/current/size 四字段渲染列表与分页器。
 */
@Data
@AllArgsConstructor
public class PageResult<T> {
    private List<T> records;
    private long total;
    private long current;
    private long size;

    /** 从 MyBatis-Plus 的 IPage 直接转换 */
    public static <T> PageResult<T> of(IPage<T> page) {
        return new PageResult<>(page.getRecords(), page.getTotal(), page.getCurrent(), page.getSize());
    }
}
