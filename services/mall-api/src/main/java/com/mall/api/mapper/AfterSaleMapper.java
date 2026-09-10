package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.mall.api.controller.dto.AfterSaleVO;
import com.mall.api.entity.AfterSale;
import org.apache.ibatis.annotations.Param;

/**
 * AfterSale Mapper。继承 BaseMapper 即获得 insert/updateById/deleteById/selectById 等基础方法。
 *
 * 联表查询（分页带订单号与客户名、详情带订单号与客户名）走
 * src/main/resources/mapper/AfterSaleMapper.xml，
 * 第一个参数为 IPage 时分页插件会自动对 XML SQL 追加 LIMIT/OFFSET 与 COUNT 语句。
 */
public interface AfterSaleMapper extends BaseMapper<AfterSale> {

    /**
     * 分页联表查询：售后 + 订单号 + 客户名。
     *
     * @param page       分页对象（由分页插件自动重写 SQL）
     * @param orderId    订单ID，可空
     * @param customerId 客户ID，可空
     * @param status     售后状态，可空
     */
    IPage<AfterSaleVO> selectAfterSalePage(IPage<AfterSaleVO> page,
                                           @Param("orderId") Long orderId,
                                           @Param("customerId") Long customerId,
                                           @Param("status") Integer status);

    /**
     * 详情联表查询：售后 + 订单号 + 客户名。
     */
    AfterSaleVO selectAfterSaleVOById(@Param("id") Long id);
}
