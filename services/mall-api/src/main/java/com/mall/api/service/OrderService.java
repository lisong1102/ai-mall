package com.mall.api.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.OrderSaveReq;
import com.mall.api.controller.dto.OrderVO;
import com.mall.api.entity.Order;

/**
 * Order 业务接口。继承 IService 可直接复用 getById/removeById 等方法；
 * 列表/详情返回 OrderVO（含客户名），由 Mapper XML 联表查询填充。
 * 创建订单为事务化操作：同时插入订单主表与明细表。
 */
public interface OrderService extends IService<Order> {

    /**
     * 事务化创建订单：生成订单号、计算总金额、插入订单主表与明细表。
     *
     * @param req 订单创建请求（客户ID + 备注 + 明细列表）
     * @return 新订单ID
     */
    Long createOrder(OrderSaveReq req);

    /**
     * 分页查询订单（联表带出客户名），可按订单号模糊搜索、按客户与状态精确过滤。
     */
    PageResult<OrderVO> page(long page, long size, String orderNo, Long customerId, Integer status);

    /**
     * 查询订单详情（联表带出客户名 + 明细列表）。
     */
    OrderVO getVOById(Long id);

    /**
     * 切换订单状态。
     *
     * @param id     订单ID
     * @param status 目标状态：0待付款 1已付款 2已发货 3已完成 4已取消
     */
    void updateStatus(Long id, Integer status);
}
