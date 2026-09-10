package com.mall.api.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.mall.api.controller.dto.ProductVO;
import com.mall.api.entity.Product;
import org.apache.ibatis.annotations.Param;

/**
 * Product Mapper。继承 BaseMapper 即获得 insert/updateById/deleteById/selectById 等基础方法。
 * MyBatis-Plus 在启动时扫描 @MapperScan("com.mall.api.mapper") 自动生成实现代理。
 *
 * 联表查询（分页带类目名、详情带类目名）走 src/main/resources/mapper/ProductMapper.xml，
 * 第一个参数为 IPage 时分页插件会自动对 XML SQL 追加 LIMIT/OFFSET 与 COUNT 语句。
 */
public interface ProductMapper extends BaseMapper<Product> {

    /**
     * 分页联表查询：商品 + 类目名。
     *
     * @param page       分页对象（由分页插件自动重写 SQL）
     * @param name       商品名模糊关键字，可空
     * @param categoryId 类目ID，可空
     * @param status     上下架状态，可空
     */
    IPage<ProductVO> selectProductPage(IPage<ProductVO> page,
                                       @Param("name") String name,
                                       @Param("categoryId") Long categoryId,
                                       @Param("status") Integer status);

    /**
     * 详情联表查询：商品 + 类目名。
     */
    ProductVO selectProductVOById(@Param("id") Long id);
}
