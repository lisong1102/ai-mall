-- 把所有业务表的 created_at / updated_at 从 TIMESTAMPTZ 改为 TIMESTAMP（不带时区）
-- 原因：PostgreSQL JDBC 驱动对 TIMESTAMPTZ 默认返回 OffsetDateTime，
--       无法直接映射到 java.time.LocalDateTime；
--       业务系统时区由应用层（Spring Jackson 配 Asia/Shanghai）统一处理，
--       DB 存无时区时间戳即可，是国内 Spring Boot + MyBatis-Plus + PG 的常见组合。
-- USING 子句显式转换，避免依赖隐式转换。
ALTER TABLE category   ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE category   ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE product    ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE product    ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE customer   ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE customer   ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE orders     ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE orders     ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE order_item ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE after_sale ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Shanghai';
ALTER TABLE after_sale ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Shanghai';
