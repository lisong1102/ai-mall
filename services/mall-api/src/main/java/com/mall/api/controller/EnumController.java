package com.mall.api.controller;

import com.mall.api.common.Result;
import com.mall.api.common.enums.EnumRegistry;
import com.mall.api.controller.dto.EnumOptionVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 通用枚举（字典）下发接口。
 * 批量设计：前端一次请求拉取所需全部枚举，配合长期缓存避免反复请求；
 * 可选类型由 EnumRegistry 维护，新增枚举类型无需改动本类。
 */
@RestController
@RequestMapping("/api/enums")
@Tag(name = "通用枚举", description = "业务枚举字典批量下发")
public class EnumController {

    @GetMapping
    @Operation(summary = "批量获取枚举选项", description = "按类型名批量返回枚举的 code/label/color，如 ?types=order_status")
    public Result<Map<String, List<EnumOptionVO>>> list(
            @Parameter(description = "枚举类型名列表，如 order_status", required = true) @RequestParam List<String> types) {
        return Result.ok(types.stream()
                .distinct()
                .collect(Collectors.toMap(Function.identity(), EnumRegistry::optionsOf)));
    }
}
