package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.mall.api.controller.dto.OrderVO;
import com.mall.api.entity.Order;
import org.apache.ibatis.annotations.Param;

/**
 * Order Mapper。继承 BaseMapper 即获得 insert/updateById/deleteById/selectById 等基础方法。
 *
 * 联表查询（分页带客户名、详情带客户名）走 src/main/resources/mapper/OrderMapper.xml，
 * 第一个参数为 IPage 时分页插件会自动对 XML SQL 追加 LIMIT/OFFSET 与 COUNT 语句。
 * 订单明细在 Service 层通过 OrderItemMapper 单独查询，避免列表页拉取过多数据。
 */
public interface OrderMapper extends BaseMapper<Order> {

    /**
     * 分页联表查询：订单 + 客户名。
     *
     * @param page       分页对象（由分页插件自动重写 SQL）
     * @param orderNo    订单号模糊关键字，可空
     * @param customerId 客户ID，可空
     * @param status     订单状态，可空
     */
    IPage<OrderVO> selectOrderPage(IPage<OrderVO> page,
                                   @Param("orderNo") String orderNo,
                                   @Param("customerId") Long customerId,
                                   @Param("status") Integer status);

    /**
     * 详情联表查询：订单 + 客户名。
     */
    OrderVO selectOrderVOById(@Param("id") Long id);
}
