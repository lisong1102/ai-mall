# Java 业务服务：Maven 构建 + JRE 运行
# 构建上下文为 services/mall-api

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# 复用项目级阿里云镜像配置，加速国内依赖下载
COPY .mvn/settings.xml .mvn/settings.xml
COPY pom.xml ./
RUN mvn -q -s .mvn/settings.xml dependency:go-offline
COPY src src
RUN mvn -q -s .mvn/settings.xml -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /build/target/mall-api-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
