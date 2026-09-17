-- ============================================================
-- V4: category 表新增 level 字段（层级深度）
-- ------------------------------------------------------------
-- 设计：
--   parent_id 邻接表，0 = 根
--   level     层级深度，根 = 1，每深一层 +1
--   子树查询用 PostgreSQL 递归 CTE，不冗余 path 字段
-- ============================================================

ALTER TABLE category ADD COLUMN level INT NOT NULL DEFAULT 1;

COMMENT ON COLUMN category.level IS '层级深度，根=1，每深一层 +1';
