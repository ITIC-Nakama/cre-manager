package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class RoleSeeder implements ApplicationRunner {

    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (RoleEnum roleEnum : RoleEnum.values()) {
            if (roleRepository.findByName(roleEnum) == null) {
                Role role = new Role();
                role.setName(roleEnum);
                role.setDescription(switch (roleEnum) {
                    case STUDENT -> "Étudiant — ITIC CRE";
                    case ADVISOR -> "Conseiller pédagogique — ITIC CRE";
                    case ADMIN   -> "Administrateur — ITIC CRE";
                });
                roleRepository.save(role);
            }
        }
        log.info("Seeded roles");
    }
}
