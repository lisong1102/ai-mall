package com.mall.api.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 商品类目。parent_id = 0 表示根类目，可无限嵌套。
 */
@Data
@TableName("category")
@Schema(description = "商品类目")
public class Category {

    /** 主键，雪花算法生成 */
    @Schema(description = "主键ID", example = "1890000000000000001")
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /** 类目名 */
    @Schema(description = "类目名", example = "手机")
    private String name;

    /** 父类目ID，0 表示根类目 */
    @Schema(description = "父类目ID，0 表示根类目", example = "0")
    private Long parentId;

    /** 类目层级，1 表示根类目，2 表示子类目 */
    @Schema(description = "类目层级，1 表示根类目，2 表示子类目", example = "1")
    private Integer level;

    /** 排序，数值小在前 */
    @Schema(description = "排序值，数值小在前", example = "0")
    private Integer sort;

    /** 创建时间，DB 自动填（也可由 MetaObjectHandler 填） */
    @Schema(description = "创建时间", example = "2026-09-09T12:00:00")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /** 更新时间，insert 与 update 时自动填 */
    @Schema(description = "更新时间", example = "2026-09-09T12:00:00")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
