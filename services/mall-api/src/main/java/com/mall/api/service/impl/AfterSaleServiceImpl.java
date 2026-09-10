package com.mall.api.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.mall.api.common.PageResult;
import com.mall.api.controller.dto.AfterSaleSaveReq;
import com.mall.api.controller.dto.AfterSaleVO;
import com.mall.api.entity.AfterSale;
import com.mall.api.mapper.AfterSaleMapper;
import com.mall.api.service.AfterSaleService;
import org.springframework.stereotype.Service;

/**
 * AfterSale Service 实现。
 * 继承 ServiceImpl<Mapper, Entity> 自动获得 save/getById/updateById/removeById 等基础能力；
 * 列表/详情走 Mapper XML 联表查询，返回带 orderNo 与 customerName 的 AfterSaleVO。
 * 状态流转带校验：只能从「申请中」审核、从「审核通过」完成，非法流转抛 IllegalArgumentException。
 */
@Service
public class AfterSaleServiceImpl extends ServiceImpl<AfterSaleMapper, AfterSale> implements AfterSaleService {

    @Override
    public Long apply(AfterSaleSaveReq req) {
        AfterSale afterSale = new AfterSale();
        afterSale.setOrderId(req.getOrderId());
        afterSale.setCustomerId(req.getCustomerId());
        afterSale.setType(req.getType());
        afterSale.setReason(req.getReason());
        afterSale.setRefundAmount(req.getRefundAmount());
        afterSale.setStatus(0); // 申请中
        baseMapper.insert(afterSale);
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
