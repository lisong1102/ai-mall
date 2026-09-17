package com.mall.api.controller;

import com.mall.api.common.PageQuery;
import com.mall.api.common.PageResult;
import com.mall.api.common.Result;
import com.mall.api.controller.dto.CategorySaveReq;
import com.mall.api.controller.dto.CategoryTreeNode;
import com.mall.api.entity.Category;
import com.mall.api.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 类目管理 RESTful 接口。
 * 路径约定：/api/categories（复数 + 资源名）+ HTTP 动词区分动作。
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "类目管理", description = "商品类目 CRUD")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "分页查询类目")
    public Result<PageResult<Category>> page(@ParameterObject PageQuery query,
            @RequestParam(required = false) String name) {
        return Result.ok(categoryService.page(query.getPage(), query.getSize(), name));
    }

    @GetMapping("/tree")
    @Operation(summary = "查询类目树")
    public Result<List<CategoryTreeNode>> tree() {
        return Result.ok(categoryService.tree());
    }

    @PostMapping
    @Operation(summary = "新增类目")
    public Result<Long> create(@Valid @RequestBody CategorySaveReq req) {
        Category category = new Category();
        category.setName(req.getName());
        category.setParentId(req.getParentId() != null ? req.getParentId() : 0L);
        category.setSort(req.getSort() != null ? req.getSort() : 0);
        categoryService.createCategory(category);
        return Result.ok(category.getId());
    }

    @PutMapping("/{id}")
    @Operation(summary = "修改类目")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody CategorySaveReq req) {
        Category category = new Category();
        category.setId(id);
        category.setName(req.getName());
        category.setParentId(req.getParentId() != null ? req.getParentId() : 0L);
        category.setSort(req.getSort() != null ? req.getSort() : 0);
        // code 一经创建不可修改，update 忽略 req.code
        categoryService.updateById(category);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除类目")
    public Result<Void> delete(@PathVariable Long id) {
        categoryService.removeById(id);
        return Result.ok(null);
    }
}
