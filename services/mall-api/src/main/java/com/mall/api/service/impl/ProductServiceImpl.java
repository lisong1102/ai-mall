package com.mall.api.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.ProductVO;
import com.mall.api.entity.Product;
import com.mall.api.mapper.ProductMapper;
import com.mall.api.service.ProductService;
import org.springframework.stereotype.Service;

/**
 * Product Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById 等基础能力；
 * 列表/详情走 Mapper XML 联表查询，返回带 categoryName 的 ProductVO，避免前端 N+1 请求。
 * 上下架切换用 lambdaUpdate 链式更新，只更新 status 字段。
 */
@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements ProductService {

    @Override
    public PageResult<ProductVO> page(long page, long size, String name, Long categoryId, Integer status) {
        // 首参为 Page，分页插件自动对 XML SQL 追加 LIMIT/OFFSET 与 COUNT
        Page<ProductVO> p = new Page<>(page, size);
        return PageResult.of(baseMapper.selectProductPage(p, name, categoryId, status));
    }

    @Override
    public ProductVO getVOById(Long id) {
        return baseMapper.selectProductVOById(id);
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        this.lambdaUpdate()
                .eq(Product::getId, id)
                .set(Product::getStatus, status)
                .update();
    }
}
