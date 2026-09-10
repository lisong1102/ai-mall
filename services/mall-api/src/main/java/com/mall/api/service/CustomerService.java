package com.mall.api.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.api.common.PageResult;
import com.mall.api.entity.Customer;

/**
 * Customer 业务接口。继承 IService 可直接复用 save/updateById/removeById 等方法；
 * 分页查询支持按姓名或手机号模糊搜索。
 */
public interface CustomerService extends IService<Customer> {

    /**
     * 分页查询客户，可按姓名或手机号模糊搜索。
     *
     * @param page 页码（从 1 开始）
     * @param size 每页条数
     * @param name 姓名或手机号模糊关键字，可空
     */
    PageResult<Customer> page(long page, long size, String name);
}
