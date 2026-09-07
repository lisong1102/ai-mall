-- ai-mall 数据库初始化：pgvector 扩展 + schema 划分
-- mall: 业务表（Java/Flyway 管理）  ai: 向量与文档表（Next/Drizzle 管理）
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS mall;
CREATE SCHEMA IF NOT EXISTS ai;
