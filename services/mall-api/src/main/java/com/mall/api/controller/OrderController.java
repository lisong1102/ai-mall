package com.mall.api.controller;

import com.mall.api.common.PageQuery;
import com.mall.api.common.PageResult;
import com.mall.api.common.Result;
import com.mall.api.controller.dto.OrderSaveReq;
import com.mall.api.controller.dto.OrderVO;
import com.mall.api.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

/**
 * 订单管理 RESTful 接口。
 * 路径约定：/api/orders（复数 + 资源名，order 为 PG 保留字故用 orders）+ HTTP 动词区分动作。
 * 订单状态流转走 PUT /api/orders/{id}/status。
 * 创建订单为事务化操作，同时落库主表与明细表。
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "订单管理", description = "订单 CRUD 与状态流转")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "分页查询订单", description = "可按订单号模糊搜索、按客户与状态精确过滤，联表返回客户名")
    public Result<PageResult<OrderVO>> page(@ParameterObject PageQuery query,
                                            @Parameter(description = "订单号模糊关键字") @RequestParam(required = false) String orderNo,
                                            @Parameter(description = "客户ID") @RequestParam(required = false) Long customerId,
                                            @Parameter(description = "订单状态：0待付款 1已付款 2已发货 3已完成 4已取消") @RequestParam(required = false) Integer status) {
        return Result.ok(orderService.page(query.getPage(), query.getSize(), orderNo, customerId, status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询订单详情", description = "联表返回客户名，并返回订单明细列表")
    public Result<OrderVO> get(@PathVariable Long id) {
        return Result.ok(orderService.getVOById(id));
    }

    @PostMapping
    @Operation(summary = "创建订单", description = "事务化创建：生成订单号、计算总金额、同时插入订单主表与明细表")
    public Result<Long> create(@Valid @RequestBody OrderSaveReq req) {
        return Result.ok(orderService.createOrder(req));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "切换订单状态", description = "status=0待付款 1已付款 2已发货 3已完成 4已取消")
    public Result<Void> updateStatus(@PathVariable Long id,
                                     @Parameter(description = "目标状态：0待付款 1已付款 2已发货 3已完成 4已取消", required = true)
                                     @RequestParam Integer status) {
        orderService.updateStatus(id, status);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除订单", description = "订单明细通过外键 ON DELETE CASCADE 级联删除")
    public Result<Void> delete(@PathVariable Long id) {
        orderService.removeById(id);
        return Result.ok(null);
    }
}
