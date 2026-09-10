package com.mall.api.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.ProductVO;
import com.mall.api.entity.Product;

/**
 * Product 业务接口。继承 IService 可直接复用 save/updateById/removeById 等方法；
 * 列表/详情返回 ProductVO（含类目名），由 Mapper XML 联表查询填充。
 */
public interface ProductService extends IService<Product> {

    /**
     * 分页查询商品（联表带出类目名），可按名称模糊搜索、按类目与上下架状态精确过滤。
     *
     * @param page       页码（从 1 开始）
     * @param size       每页条数
     * @param name       商品名模糊关键字，可空
     * @param categoryId 类目ID，可空
     * @param status     上下架状态（1上架 0下架），可空
     */
    PageResult<ProductVO> page(long page, long size, String name, Long categoryId, Integer status);

    /**
     * 查询商品详情（联表带出类目名）。
     */
    ProductVO getVOById(Long id);

    /**
     * 切换商品上下架状态。
     *
     * @param id     商品ID
     * @param status 目标状态：1上架 0下架
     */
    void updateStatus(Long id, Integer status);
}
