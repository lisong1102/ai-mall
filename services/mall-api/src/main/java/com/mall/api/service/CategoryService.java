package com.mall.api.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.CategoryTreeNode;
import com.mall.api.entity.Category;

import java.util.List;

/**
 * Category 业务接口。继承 IService 可直接复用 save/updateById/removeById 等方法；
 * 本接口声明本项目自定义的分页查询，实现里用 LambdaQueryWrapper 做模糊检索。
 */
public interface CategoryService extends IService<Category> {

    /**
     * 分页查询类目，可按名称模糊搜索。
     *
     * @param page  页码（从 1 开始）
     * @param size  每页条数
     * @param name  名称模糊关键字，可空
     */
    PageResult<Category> page(long page, long size, String name);

    /**
     * 新增类目，处理 code 业务编码：
     * 
     
     * @param category 入参，至少包含 name；id/createdAt/updatedAt 由框架填充
     * @return 已落库的 Category（含生成的 code 与 id）
     */
    Category createCategory(Category category);

    /**
     * 查询类目树，包含所有子类目。
     * @return 类目树，每个节点包含所有子类目
     */
    List<CategoryTreeNode> tree();
}
