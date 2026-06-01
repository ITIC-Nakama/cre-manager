package com.itic.paris.platform.auth.repository;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Integer> {

    Role findByName(RoleEnum roleEnum);
}
