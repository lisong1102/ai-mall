package com.mall.api.controller;

import com.mall.api.common.PageQuery;
import com.mall.api.common.PageResult;
import com.mall.api.common.Result;
import com.mall.api.controller.dto.AfterSaleSaveReq;
import com.mall.api.controller.dto.AfterSaleVO;
import com.mall.api.service.AfterSaleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

/**
 * 售后管理 RESTful 接口。
 * 路径约定：/api/after-sales（复数 + 资源名）+ HTTP 动词区分动作。
 * 状态流转走 PUT /api/after-sales/{id}/review（审核）与 PUT /api/after-sales/{id}/complete（完成）。
 */
@RestController
@RequestMapping("/api/after-sales")
@RequiredArgsConstructor
@Tag(name = "售后管理", description = "售后 CRUD 与状态流转（申请/审核/完成）")
public class AfterSaleController {

    private final AfterSaleService afterSaleService;

    @GetMapping
    @Operation(summary = "分页查询售后", description = "可按订单、客户与状态精确过滤，联表返回订单号与客户名")
    public Result<PageResult<AfterSaleVO>> page(@ParameterObject PageQuery query,
                                                @Parameter(description = "订单ID") @RequestParam(required = false) Long orderId,
                                                @Parameter(description = "客户ID") @RequestParam(required = false) Long customerId,
                                                @Parameter(description = "售后状态：0申请中 1审核通过 2已完成 3已拒绝") @RequestParam(required = false) Integer status) {
        return Result.ok(afterSaleService.page(query.getPage(), query.getSize(), orderId, customerId, status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询售后详情", description = "联表返回订单号与客户名")
    public Result<AfterSaleVO> get(@PathVariable Long id) {
        return Result.ok(afterSaleService.getVOById(id));
    }

    @PostMapping
    @Operation(summary = "申请售后", description = "创建售后单（状态固定为 0 申请中），并将订单置为 5 退款中；仅已完成订单可申请")
    public Result<Long> apply(@Valid @RequestBody AfterSaleSaveReq req) {
        return Result.ok(afterSaleService.apply(req));
    }

    @PutMapping("/{id}/review")
    @Operation(summary = "审核售后", description = "pass=true 审核通过(1)且订单置为 6 已退款，pass=false 拒绝(3)且订单恢复 3 已完成；仅申请中(0)的可审核")
    public Result<Void> review(@PathVariable Long id,
                               @Parameter(description = "是否通过：true通过 false拒绝", required = true)
                               @RequestParam boolean pass) {
        afterSaleService.review(id, pass);
        return Result.ok(null);
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "完成售后", description = "仅审核通过(1)的可完成，状态置为 2 已完成")
    public Result<Void> complete(@PathVariable Long id) {
        afterSaleService.complete(id);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除售后单")
    public Result<Void> delete(@PathVariable Long id) {
        afterSaleService.removeById(id);
        return Result.ok(null);
    }
}
