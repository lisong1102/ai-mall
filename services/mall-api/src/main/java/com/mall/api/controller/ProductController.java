package com.mall.api.controller;

import com.mall.api.common.PageQuery;
import com.mall.api.common.PageResult;
import com.mall.api.common.Result;
import com.mall.api.controller.dto.ProductSaveReq;
import com.mall.api.entity.Product;
import com.mall.api.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

/**
 * 商品管理 RESTful 接口。
 * 路径约定：/api/products（复数 + 资源名）+ HTTP 动词区分动作。
 * 上下架状态切换走 /api/products/{id}/status。
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "商品管理", description = "商品 CRUD 与上下架")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "分页查询商品", description = "可按名称模糊搜索、按类目与上下架状态精确过滤")
    public Result<PageResult<Product>> page(@ParameterObject PageQuery query,
                                            @Parameter(description = "商品名模糊关键字") @RequestParam(required = false) String name,
                                            @Parameter(description = "类目ID") @RequestParam(required = false) Long categoryId,
                                            @Parameter(description = "上下架状态：1上架 0下架") @RequestParam(required = false) Integer status) {
        return Result.ok(productService.page(query.getPage(), query.getSize(), name, categoryId, status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询商品详情")
    public Result<Product> get(@PathVariable Long id) {
        return Result.ok(productService.getById(id));
    }

    @PostMapping
    @Operation(summary = "新增商品")
    public Result<Long> create(@Valid @RequestBody ProductSaveReq req) {
        Product product = new Product();
        product.setName(req.getName());
        product.setCategoryId(req.getCategoryId());
        product.setPrice(req.getPrice());
        product.setStock(req.getStock() != null ? req.getStock() : 0);
        product.setStatus(req.getStatus() != null ? req.getStatus() : 1);
        product.setDescription(req.getDescription());
        product.setCoverImage(req.getCoverImage());
        productService.save(product);
        return Result.ok(product.getId());
    }

    @PutMapping("/{id}")
    @Operation(summary = "修改商品")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody ProductSaveReq req) {
        Product product = new Product();
        product.setId(id);
        product.setName(req.getName());
        product.setCategoryId(req.getCategoryId());
        product.setPrice(req.getPrice());
        product.setStock(req.getStock());
        product.setStatus(req.getStatus());
        product.setDescription(req.getDescription());
        product.setCoverImage(req.getCoverImage());
        productService.updateById(product);
        return Result.ok(null);
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "切换商品上下架状态", description = "status=1上架 0下架")
    public Result<Void> updateStatus(@PathVariable Long id,
                                     @Parameter(description = "目标状态：1上架 0下架", required = true)
                                     @RequestParam Integer status) {
        productService.updateStatus(id, status);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除商品")
    public Result<Void> delete(@PathVariable Long id) {
        productService.removeById(id);
        return Result.ok(null);
    }
}
