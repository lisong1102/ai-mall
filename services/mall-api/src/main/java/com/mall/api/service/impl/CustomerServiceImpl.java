package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.entity.Customer;
import com.mall.api.mapper.CustomerMapper;
import com.mall.api.service.CustomerService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Customer Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById 等基础能力；
 * 模糊查关键字同时匹配姓名与手机号（OR），按创建时间倒序（新客户在前）。
 */
@Service
public class CustomerServiceImpl extends ServiceImpl<CustomerMapper, Customer> implements CustomerService {

    @Override
    public PageResult<Customer> page(long page, long size, String name) {
        Page<Customer> p = new Page<>(page, size);
        LambdaQueryWrapper<Customer> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(name)) {
            qw.and(w -> w.like(Customer::getName, name).or().like(Customer::getPhone, name));
        }
        qw.orderByDesc(Customer::getCreatedAt).orderByDesc(Customer::getId);
        return PageResult.of(this.page(p, qw));
    }
}
