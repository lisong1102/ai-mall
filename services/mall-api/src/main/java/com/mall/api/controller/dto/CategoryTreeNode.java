package com.mall.api.controller.dto;

import com.mall.api.entity.Category;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "类目树节点")
public class CategoryTreeNode {

    @Schema(description = "类目ID", example = "1890000000000000030")
    private Long id;

    @Schema(description = "类目名", example = "手机")
    private String name;

    /**
     * 父类目ID，0 表示根类目
     */
    @Schema(description = "父类目ID，0 表示根类目", example = "0")
    private Long parentId;

    /**
     * 子集类目
     */
    @Schema(description = "子集类目", example = "1890000000000000031")
    private List<CategoryTreeNode> children;

    public static CategoryTreeNode fromCategory(Category category) {
        CategoryTreeNode treeNode = new CategoryTreeNode();
        treeNode.setId(category.getId());
        treeNode.setName(category.getName());
        treeNode.setParentId(category.getParentId());
        return treeNode;
    }

}
