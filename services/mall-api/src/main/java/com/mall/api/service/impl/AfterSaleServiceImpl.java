package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.common.enums.OrderStatusEnum;
import com.mall.api.controller.dto.AfterSaleSaveReq;
import com.mall.api.controller.dto.AfterSaleVO;
import com.mall.api.entity.AfterSale;
import com.mall.api.entity.Order;
import com.mall.api.mapper.AfterSaleMapper;
import com.mall.api.service.AfterSaleService;
import com.mall.api.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AfterSale Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById/removeById 等基础能力；
 * 列表/详情走 Mapper XML 联表查询，返回带 orderNo 与 customerName 的 AfterSaleVO。
 * 状态流转带校验：只能从「申请中」审核、从「审核通过」完成，非法流转抛 IllegalArgumentException。
 * 申请/审核联动订单状态：申请(0) → 订单「退款中」；通过(1) → 订单「已退款」；拒绝(3) → 订单恢复「已完成」。
 */
@Service
@RequiredArgsConstructor
public class AfterSaleServiceImpl extends ServiceImpl<AfterSaleMapper, AfterSale> implements AfterSaleService {

    private final OrderService orderService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long apply(AfterSaleSaveReq req) {
        // 1. 校验订单存在且已完成（售后入口仅对已完成订单开放）
        Order order = orderService.getById(req.getOrderId());
        if (order == null) {
            throw new IllegalArgumentException("订单不存在");
        }
        if (!OrderStatusEnum.COMPLETED.getCode().equals(order.getStatus())) {
            throw new IllegalArgumentException("仅已完成的订单可申请售后");
        }
        // 2. 防止重复申请：同一订单存在申请中的售后单时拒绝
        Long applying = baseMapper.selectCount(new LambdaQueryWrapper<AfterSale>()
                .eq(AfterSale::getOrderId, req.getOrderId())
                .eq(AfterSale::getStatus, 0));
        if (applying > 0) {
            throw new IllegalArgumentException("该订单已有申请中的售后单");
        }
        // 3. 创建售后单，订单置为退款中
        AfterSale afterSale = new AfterSale();
        afterSale.setOrderId(req.getOrderId());
        afterSale.setCustomerId(req.getCustomerId());
        afterSale.setType(req.getType());
        afterSale.setReason(req.getReason());
        afterSale.setRefundAmount(req.getRefundAmount());
        afterSale.setStatus(0); // 申请中
        baseMapper.insert(afterSale);
        orderService.updateStatus(order.getId(), OrderStatusEnum.REFUNDING.getCode());
        return afterSale.getId();
    }

    @Override
    public PageResult<AfterSaleVO> page(long page, long size, Long orderId, Long customerId, Integer status) {
        Page<AfterSaleVO> p = new Page<>(page, size);
        return PageResult.of(baseMapper.selectAfterSalePage(p, orderId, customerId, status));
    }

    @Override
    public AfterSaleVO getVOById(Long id) {
        return baseMapper.selectAfterSaleVOById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void review(Long id, boolean pass) {
        AfterSale afterSale = baseMapper.selectById(id);
        if (afterSale == null) {
            throw new IllegalArgumentException("售后单不存在");
        }
        if (afterSale.getStatus() != 0) {
            throw new IllegalArgumentException("只能审核申请中的售后单");
        }
        this.lambdaUpdate()
                .eq(AfterSale::getId, id)
                .set(AfterSale::getStatus, pass ? 1 : 3)
                .update();
        // 联动订单状态：通过 → 已退款；拒绝 → 恢复已完成（申请入口仅对已完成订单开放）
        orderService.updateStatus(afterSale.getOrderId(),
                pass ? OrderStatusEnum.REFUNDED.getCode() : OrderStatusEnum.COMPLETED.getCode());
    }

    @Override
    public void complete(Long id) {
        AfterSale afterSale = baseMapper.selectById(id);
        if (afterSale == null) {
            throw new IllegalArgumentException("售后单不存在");
        }
        if (afterSale.getStatus() != 1) {
            throw new IllegalArgumentException("只能完成审核通过的售后单");
        }
        this.lambdaUpdate()
                .eq(AfterSale::getId, id)
                .set(AfterSale::getStatus, 2)
                .update();
    }
}
