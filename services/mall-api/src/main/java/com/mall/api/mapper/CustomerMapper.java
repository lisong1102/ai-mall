package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.mall.api.entity.Customer;

/**
 * Customer Mapper。继承 BaseMapper 即获得 insert/updateById/deleteById/selectById 等基础方法。
 * 客户为单表查询，无需 XML 联表，分页与模糊查走 LambdaQueryWrapper。
 */
public interface CustomerMapper extends BaseMapper<Customer> {
}
