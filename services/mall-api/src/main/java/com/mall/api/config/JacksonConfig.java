package com.mall.api.config;

import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Jackson 全局序列化定制：雪花 ID（包装类型 Long）输出为字符串，
 * 避免超过 JS Number.MAX_SAFE_INTEGER（2^53-1）后前端 JSON.parse 丢精度。
 * 基本类型 long（如 PageResult.total/current/size）不受影响，仍输出数字。
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer longToStringCustomizer() {
        return builder -> builder.serializerByType(Long.class, ToStringSerializer.instance);
    }
}
