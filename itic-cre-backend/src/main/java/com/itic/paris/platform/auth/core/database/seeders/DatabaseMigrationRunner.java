package com.itic.paris.platform.auth.core.database.seeders;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            log.info("Running database migration check to drop old constraint fkal4urlt9mycj6yi0l8fk6ldll if exists...");
            jdbcTemplate.execute("ALTER TABLE cv_commentaires DROP CONSTRAINT IF EXISTS fkal4urlt9mycj6yi0l8fk6ldll");
            log.info("Database migration check completed successfully.");
        } catch (Exception e) {
            log.error("Failed to run database migration check: {}", e.getMessage());
        }
    }
}
