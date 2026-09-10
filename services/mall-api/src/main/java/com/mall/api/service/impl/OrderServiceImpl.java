package com.mall.api.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.OrderItemReq;
import com.mall.api.controller.dto.OrderItemVO;
import com.mall.api.controller.dto.OrderSaveReq;
import com.mall.api.controller.dto.OrderVO;
import com.mall.api.entity.Order;
import com.mall.api.entity.OrderItem;
import com.mall.api.mapper.OrderMapper;
import com.mall.api.mapper.OrderItemMapper;
import com.mall.api.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Order Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById/removeById 等基础能力；
 * 列表/详情走 Mapper XML 联表查询，返回带 customerName 的 OrderVO。
 * createOrder 为事务化操作：先生成订单号与总金额，再分别插入订单主表与明细表。
 * 订单号格式：ORD + yyyyMMddHHmmssSSS + 3位随机数，保证业务可读与基本唯一性。
 */
@Service
@RequiredArgsConstructor
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements OrderService {

    private final OrderItemMapper orderItemMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long createOrder(OrderSaveReq req) {
        // 1. 生成订单号：ORD + 时间戳 + 随机数
        String orderNo = generateOrderNo();

        // 2. 计算订单总金额（明细小计汇总：subtotal = price * quantity）
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (OrderItemReq item : req.getItems()) {
            BigDecimal subtotal = item.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity()));
            totalAmount = totalAmount.add(subtotal);
        }

        // 3. 插入订单主表（状态默认 0 待付款）
        Order order = new Order();
        order.setOrderNo(orderNo);
        order.setCustomerId(req.getCustomerId());
        order.setTotalAmount(totalAmount);
        order.setStatus(0);
        order.setRemark(req.getRemark());
        baseMapper.insert(order);

        // 4. 插入订单明细（带回 orderId，保存商品名/单价快照）
        for (OrderItemReq item : req.getItems()) {
            OrderItem orderItem = new OrderItem();
            orderItem.setOrderId(order.getId());
            orderItem.setProductId(item.getProductId());
            orderItem.setProductName(item.getProductName());
            orderItem.setPrice(item.getPrice());
            orderItem.setQuantity(item.getQuantity());
            orderItem.setSubtotal(item.getPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantity())));
            orderItemMapper.insert(orderItem);
        }

        return order.getId();
    }

    @Override
    public PageResult<OrderVO> page(long page, long size, String orderNo, Long customerId, Integer status) {
        Page<OrderVO> p = new Page<>(page, size);
        return PageResult.of(baseMapper.selectOrderPage(p, orderNo, customerId, status));
    }

    @Override
    public OrderVO getVOById(Long id) {
        // 1. 联表查出订单 + 客户名
        OrderVO vo = baseMapper.selectOrderVOById(id);
        if (vo == null) {
            return null;
        }
        // 2. 单独查询明细并填充（避免列表页拉取明细，详情才需要）
        LambdaQueryWrapper<OrderItem> qw = new LambdaQueryWrapper<>();
        qw.eq(OrderItem::getOrderId, id).orderByAsc(OrderItem::getId);
        List<OrderItem> items = orderItemMapper.selectList(qw);
        vo.setItems(items.stream().map(this::toVO).toList());
        return vo;
    }

    @Override
    public void updateStatus(Long id, Integer status) {
        this.lambdaUpdate()
                .eq(Order::getId, id)
                .set(Order::getStatus, status)
                .update();
    }

    /** OrderItem 实体转 OrderItemVO */
    private OrderItemVO toVO(OrderItem item) {
        OrderItemVO vo = new OrderItemVO();
        vo.setId(item.getId());
        vo.setOrderId(item.getOrderId());
        vo.setProductId(item.getProductId());
        vo.setProductName(item.getProductName());
        vo.setPrice(item.getPrice());
        vo.setQuantity(item.getQuantity());
        vo.setSubtotal(item.getSubtotal());
        return vo;
    }

    /** 生成订单号：ORD + yyyyMMddHHmmssSSS + 3位随机数 */
    private String generateOrderNo() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
        int rand = ThreadLocalRandom.current().nextInt(100, 1000);
        return "ORD" + ts + rand;
    }
}
