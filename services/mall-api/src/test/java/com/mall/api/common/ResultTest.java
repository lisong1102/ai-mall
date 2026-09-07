package com.mall.api.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ResultTest {

    @Test
    void okReturnsZeroCodeWithData() {
        Result<String> result = Result.ok("hello");
        assertThat(result.code()).isZero();
        assertThat(result.message()).isEqualTo("ok");
        assertThat(result.data()).isEqualTo("hello");
    }

    @Test
    void errorReturnsCodeWithoutData() {
        Result<Void> result = Result.error(400, "bad request");
        assertThat(result.code()).isEqualTo(400);
        assertThat(result.data()).isNull();
    }
}
