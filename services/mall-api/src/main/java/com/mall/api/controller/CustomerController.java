package com.mall.api.controller;

import com.mall.api.common.PageQuery;
import com.mall.api.common.PageResult;
import com.mall.api.common.Result;
import com.mall.api.controller.dto.CustomerSaveReq;
import com.mall.api.entity.Customer;
import com.mall.api.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

/**
 * 客户管理 RESTful 接口。
 * 路径约定：/api/customers（复数 + 资源名）+ HTTP 动词区分动作。
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Tag(name = "客户管理", description = "客户 CRUD")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "分页查询客户", description = "可按姓名或手机号模糊搜索")
    public Result<PageResult<Customer>> page(@ParameterObject PageQuery query,
                                             @Parameter(description = "姓名或手机号模糊关键字") @RequestParam(required = false) String name) {
        return Result.ok(customerService.page(query.getPage(), query.getSize(), name));
    }

    @GetMapping("/{id}")
    @Operation(summary = "查询客户详情")
    public Result<Customer> get(@PathVariable Long id) {
        return Result.ok(customerService.getById(id));
    }

    @PostMapping
    @Operation(summary = "新增客户")
    public Result<Long> create(@Valid @RequestBody CustomerSaveReq req) {
        Customer customer = new Customer();
        customer.setName(req.getName());
        customer.setPhone(req.getPhone());
        customer.setEmail(req.getEmail());
        customer.setAddress(req.getAddress());
        customerService.save(customer);
        return Result.ok(customer.getId());
    }

    @PutMapping("/{id}")
    @Operation(summary = "修改客户")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody CustomerSaveReq req) {
        Customer customer = new Customer();
        customer.setId(id);
        customer.setName(req.getName());
        customer.setPhone(req.getPhone());
        customer.setEmail(req.getEmail());
        customer.setAddress(req.getAddress());
        customerService.updateById(customer);
        return Result.ok(null);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "删除客户")
    public Result<Void> delete(@PathVariable Long id) {
        customerService.removeById(id);
        return Result.ok(null);
    }
}
