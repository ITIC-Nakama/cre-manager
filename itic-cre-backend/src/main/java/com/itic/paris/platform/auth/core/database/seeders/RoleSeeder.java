package com.itic.paris.platform.auth.core.database.seeders;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import com.itic.paris.platform.auth.repository.RoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class RoleSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        for (RoleEnum roleEnum : RoleEnum.values()) {
            if (roleRepository.findByName(roleEnum) == null) {
                Role role = new Role();
                role.setName(roleEnum);
                role.setDescription(switch (roleEnum) {
                    case STUDENT -> "Étudiant — ITIC CRE";
                    case ADVISOR -> "Conseiller pédagogique — ITIC CRE";
                    case ADMIN -> "Administrateur — ITIC CRE";
                });
                roleRepository.save(role);
            }
        }
    }
}
