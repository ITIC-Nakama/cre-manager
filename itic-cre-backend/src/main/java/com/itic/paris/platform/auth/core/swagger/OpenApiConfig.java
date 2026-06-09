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
                .group("00. Toutes les APIs")
                .pathsToMatch("/**")
                .build();
    }

    @Bean
    public GroupedOpenApi authApi() {
        return GroupedOpenApi.builder()
                .group("01. Authentification")
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
                .group("02. Gestion Utilisateurs & Profils")
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
                .group("03. Journal d'Audit")
                .pathsToMatch("/auth/admin/audit-logs/**")
                .build();
    }

    @Bean
    public GroupedOpenApi jobBoardApi() {
        return GroupedOpenApi.builder()
                .group("04. Job Board")
                .pathsToMatch("/jobboard/**")
                .build();
    }

    @Bean
    public GroupedOpenApi crmApi() {
        return GroupedOpenApi.builder()
                .group("05. CRM — Applications")
                .pathsToMatch(
                        "/api/applications/**",
                        "/api/application-statuses/**"
                )
                .build();
    }

    @Bean
    public GroupedOpenApi gamificationStudentApi() {
        return GroupedOpenApi.builder()
                .group("06. Gamification — Étudiant")
                .pathsToMatch("/api/me/gamification/**")
                .build();
    }

    @Bean
    public GroupedOpenApi administrationApi() {
        return GroupedOpenApi.builder()
                .group("07. Administration")
                .pathsToMatch("/api/admin/**")
                .build();
    }

    @Bean
    public GroupedOpenApi skillTreeApi() {
        return GroupedOpenApi.builder()
                .group("08. Skill Tree")
                .pathsToMatch("/api/skill-tree/**", "/api/admin/skill-tree/**")
                .build();
    }

    @Bean
    public GroupedOpenApi cvApi() {
        return GroupedOpenApi.builder()
                .group("09. CV Management")
                .pathsToMatch("/cv/**", "/cv/statuts/**")
                .build();
    }

    @Bean
    public GroupedOpenApi dashboardApi() {
        return GroupedOpenApi.builder()
                .group("10. Dashboard Advisor")
                .pathsToMatch("/dashboard/**")
                .build();
    }

    @Bean
    public GroupedOpenApi espaceEtudiantApi() {
        return GroupedOpenApi.builder()
                .group("11. Espace Étudiant")
                .pathsToMatch(
                        "/api/applications/**",
                        "/api/me/gamification/**"
                )
                .build();
    }
}
