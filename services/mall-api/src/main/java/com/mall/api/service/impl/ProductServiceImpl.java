package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.entity.Product;
import com.mall.api.mapper.ProductMapper;
import com.mall.api.service.ProductService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Objects;

/**
 * Product Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById 等基础能力；
 * IService 接口里声明的业务方法在这里用 LambdaQueryWrapper 写查询条件，类型安全。
 * 上下架切换用 lambdaUpdate 链式更新，只更新 status 字段。
 */
@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements ProductService {

    @Override
    public PageResult<Product> page(long page, long size, String name, Long categoryId, Integer status) {
        Page<Product> p = new Page<>(page, size);
        LambdaQueryWrapper<Product> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(name)) {
            qw.like(Product::getName, name);
        }
        if (Objects.nonNull(categoryId)) {
            qw.eq(Product::getCategoryId, categoryId);
        }
        if (Objects.nonNull(status)) {
            qw.eq(Product::getStatus, status);
        }
        // 按创建时间倒序、id 倒序，保证新上架商品在前
        qw.orderByDesc(Product::getCreatedAt).orderByDesc(Product::getId);
        return PageResult.of(this.page(p, qw));
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        this.lambdaUpdate()
                .eq(Product::getId, id)
                .set(Product::getStatus, status)
                .update();
    }
}
