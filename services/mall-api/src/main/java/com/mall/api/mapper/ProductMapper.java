package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mall.api.entity.Product;

/**
 * Product Mapper。继承 BaseMapper 即获得 insert/updateById/deleteById/selectById 等基础方法。
 * MyBatis-Plus 在启动时扫描 @MapperScan("com.mall.api.mapper") 自动生成实现代理。
 */
public interface ProductMapper extends BaseMapper<Product> {
}
