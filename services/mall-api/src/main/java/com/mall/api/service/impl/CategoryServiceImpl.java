package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.entity.Category;
import com.mall.api.mapper.CategoryMapper;
import com.mall.api.service.CategoryService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Category Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById 等基础能力；
 * IService 接口里声明的业务方法在这里用 LambdaQueryWrapper 写查询条件，类型安全。
 */
@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @Override
    public PageResult<Category> page(long page, long size, String name) {
        Page<Category> p = new Page<>(page, size);
        LambdaQueryWrapper<Category> qw = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(name)) {
            qw.like(Category::getName, name);
        }
        // 按 sort 升序、id 升序，保证类目顺序稳定
        qw.orderByAsc(Category::getSort).orderByAsc(Category::getId);
        return PageResult.of(this.page(p, qw));//这里的this.page()调用的MybatisPlus的分页查询方法，返回的是IPage对象
    }
}
