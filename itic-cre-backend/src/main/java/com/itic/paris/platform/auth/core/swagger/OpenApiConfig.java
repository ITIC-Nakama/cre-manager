package com.itic.paris.platform.auth.core.swagger;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .servers(List.of(
                        new Server().url("/api/v1").description("Serveur Actuel (Relatif)"),
                        new Server().url("http://localhost:8080/api/v1").description("Local Development (8080)")
                ))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .info(new Info()
                        .title("ITIC CRE API")
                        .description("Plateforme de suivi des candidatures — authentification JWT")
                        .version("0.1.0")
                        .contact(new Contact()
                                .name("ITIC CRE")
                                .email("contact@itic-cre.fr")));
    }

    @Bean
    public GroupedOpenApi allApi() {
        return GroupedOpenApi.builder()
                .group("0. Toutes les APIs")
                .pathsToMatch("/**")
                .build();
    }

    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("1. Authentification")
                .pathsToMatch(
                        "/auth/login",
                        "/auth/register",
                        "/auth/refresh-token",
                        "/auth/otp/**",
                        "/auth/reset-password",
                        "/auth/logout"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi userApi() {
        return GroupedOpenApi.builder()
                .group("2. Gestion Utilisateurs & Profils")
                .pathsToMatch(
                        "/auth/users/**",
                        "/auth/change-password",
                        "/auth/update-password",
                        "/auth/admin/users/**",
                        "/auth/roles/**",
                        "/promotions/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi auditApi() {
        return GroupedOpenApi.builder()
                .group("3. Journal d'Audit")
                .pathsToMatch("/auth/admin/audit-logs/**")
                .build();
    }

    @Bean
    public GroupedOpenApi jobBoardApi() {
        return GroupedOpenApi.builder()
                .group("4. Job Board")
                .pathsToMatch("/jobboard/**")
                .build();
    }

    @Bean
    public GroupedOpenApi crmApi() {
        return GroupedOpenApi.builder()
                .group("5. CRM — Applications")
                .pathsToMatch(
                        "/api/applications/**",
                        "/api/application-statuses/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi gamificationStudentApi() {
        return GroupedOpenApi.builder()
                .group("6. Gamification — Étudiant")
                .pathsToMatch("/api/me/gamification/**")
                .build();
    }

    @Bean
    public GroupedOpenApi administrationApi() {
        return GroupedOpenApi.builder()
                .group("7. Administration")
                .pathsToMatch("/api/admin/**")
                .build();
    }

    @Bean
    public GroupedOpenApi skillTreeApi() {
        return GroupedOpenApi.builder()
                .group("8. Skill Tree")
                .pathsToMatch("/api/skill-tree/**", "/api/admin/skill-tree/**")
                .build();
    }
}
