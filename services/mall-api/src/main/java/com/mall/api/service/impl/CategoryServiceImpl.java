package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.CategoryTreeNode;
import com.mall.api.entity.Category;
import com.mall.api.mapper.CategoryMapper;
import com.mall.api.service.CategoryService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

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
        return PageResult.of(this.page(p, qw));// 这里的this.page()调用的MybatisPlus的分页查询方法，返回的是IPage对象
    }

    @Override
    public Category createCategory(Category category) {
        // 根据parentId是否存在来设置level的值
        if (category.getParentId() == 0L || category.getParentId() == null) {
            category.setLevel(1);
        } else {
            Category parentCategory = this.getById(category.getParentId());
            if (parentCategory == null) {
                throw new IllegalArgumentException("父类目不存在");
            }
            category.setLevel(parentCategory.getLevel() != null ? parentCategory.getLevel() + 1 : 1);
        }
        // 设置sort,默认值为0，根据sort降序查询，取最后一个的sort值+1
        LambdaQueryWrapper<Category> queryWrapper = new LambdaQueryWrapper<>();
        Category last = this.getOne(
                queryWrapper.orderByDesc(Category::getSort)
                        .last("LIMIT 1"));
        category.setSort(last != null ? last.getSort() + 1 : 0);
        this.save(category);
        return category;
    }

    /**
     * (non-Javadoc)
     * 复杂度：O(n^2)
     * 
     * @param parentId   父类目ID，null 表示根类目
     * @param categories 所有类目
     * @return 类目树，每个节点包含所有子类目
     * @see com.mall.api.service.CategoryService#tree()
     */
    // @Override
    // public List<CategoryTreeNode> tree() {
    // // 查询所有的类目
    // List<Category> categories = this.lambdaQuery()
    // .orderByAsc(Category::getSort)
    // .orderByAsc(Category::getId)
    // .list();

    // buildTree(null, categories);
    // }

    @Override
    public List<CategoryTreeNode> tree() {
        // 查询所有的类目
        List<Category> categories = this.lambdaQuery()
                .orderByAsc(Category::getSort)
                .orderByAsc(Category::getId)
                .list();

        Map<Long, List<Category>> byParent = categories.stream()
                .collect(Collectors.groupingBy(Category::getParentId));

        CategoryTreeNode root = new CategoryTreeNode();
        root.setId(0L);
        root.setName("根类目");
        root.setParentId(0L);
        root.setChildren(buildChildren(0L, byParent));
        return List.of(root);

    }

    /**
     * 递归构建类目树。
     * 复杂度：O(n^2)
     * 
     * @param parentId   父类目ID，null 表示根类目
     * @param categories 所有类目
     * @return 类目树，每个节点包含所有子类目
     */
    public List<CategoryTreeNode> buildTree(Long parentId, List<Category> categories) {
        List<CategoryTreeNode> result = new ArrayList<>();
        CategoryTreeNode node;
        if (parentId == null) {
            node = new CategoryTreeNode();
            node.setId(0L);
            node.setName("根类目");
            node.setParentId(0L);
            node.setChildren(buildTree(0L, categories));
            result.add(node);
        }
        for (Category category : categories) {
            if (Objects.equals(category.getParentId(), parentId)) {
                node = CategoryTreeNode.fromCategory(category);
                List<CategoryTreeNode> children = buildTree(category.getId(), categories);
                if (!children.isEmpty()) {
                    node.setChildren(children);
                }
                result.add(node);
            }
        }
        return result;
    }

    /**
     * 递归构建子类目节点。
     * 复杂度：O(n)
     * 
     * @param parentId 父类目ID
     * @param byParent 所有类目，按父类目ID分组
     * @return 子类目节点列表
     */
    private List<CategoryTreeNode> buildChildren(Long parentId, Map<Long, List<Category>> byParent) {
        List<Category> children = byParent.getOrDefault(parentId, List.of());
        List<CategoryTreeNode> nodes = new ArrayList<>(children.size());
        for (Category c : children) {
            CategoryTreeNode node = CategoryTreeNode.fromCategory(c);
            List<CategoryTreeNode> grand = buildChildren(c.getId(), byParent);
            if (!grand.isEmpty()) {
                node.setChildren(grand);
            }
            nodes.add(node);
        }
        return nodes;
    }
}