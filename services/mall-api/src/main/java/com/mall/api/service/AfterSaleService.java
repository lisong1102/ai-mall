package com.mall.api.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.AfterSaleSaveReq;
import com.mall.api.controller.dto.AfterSaleVO;
import com.mall.api.entity.AfterSale;

/**
 * AfterSale 业务接口。继承 IService 可直接复用 getById/removeById 等方法；
 * 列表/详情返回 AfterSaleVO（含订单号与客户名），由 Mapper XML 联表查询填充。
 * 状态流转：申请(0) → 审核(1通过/3拒绝) → 完成(2)。
 */
public interface AfterSaleService extends IService<AfterSale> {

    /**
     * 申请售后：创建售后单，状态固定为 0 申请中。
     */
    Long apply(AfterSaleSaveReq req);

    /**
     * 分页查询售后（联表带出订单号与客户名），可按订单、客户与状态过滤。
     */
    PageResult<AfterSaleVO> page(long page, long size, Long orderId, Long customerId, Integer status);

    /**
     * 查询售后详情（联表带出订单号与客户名）。
     */
    AfterSaleVO getVOById(Long id);

    /**
     * 审核售后单。仅状态为 0（申请中）的可审核。
     *
     * @param id     售后单ID
     * @param pass   true=审核通过(1)，false=拒绝(3)
     */
    void review(Long id, boolean pass);

    /**
     * 完成售后。仅状态为 1（审核通过）的可完成。
     *
     * @param id 售后单ID
     */
    void complete(Long id);
}
