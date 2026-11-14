package com.itic.paris.platform.seeder;

import com.itic.paris.platform.auth.model.Role;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.repository.RoleRepository;
import com.itic.paris.platform.auth.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Les comptes de test n'ont plus de mot de passe par défaut (dépôt public) : sans mot de passe configuré
 * (TEST_*_PASSWORD), aucun compte n'est créé, même seeders activés. Avec un mot de passe, rien ne change.
 */
class TestSeedersPasswordTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"admin", "advisor", "student"})
    @DisplayName("Mot de passe vide : aucun compte de test créé")
    void blankPasswordCreatesNothing(String kind) throws Exception {
        for (String blank : new String[]{"", "   ", null}) {
            ApplicationRunner seeder = seeder(kind, blank);
            seeder.run(mock(ApplicationArguments.class));
        }
        verify(userRepository, never()).save(any(User.class));
        verify(passwordEncoder, never()).encode(anyString());
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"admin", "advisor", "student"})
    @DisplayName("Mot de passe configuré : le compte de test est créé comme avant")
    void configuredPasswordStillSeeds(String kind) throws Exception {
        when(roleRepository.findByName(any())).thenReturn(new Role());
        when(userRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(passwordEncoder.encode("mot-de-passe-local")).thenReturn("hash");

        seeder(kind, "mot-de-passe-local").run(mock(ApplicationArguments.class));

        verify(passwordEncoder).encode("mot-de-passe-local");
        verify(userRepository).save(any(User.class));
    }

    private ApplicationRunner seeder(String kind, String password) {
        ApplicationRunner seeder = switch (kind) {
            case "admin" -> new TestAdminSeeder(userRepository, roleRepository, passwordEncoder);
            case "advisor" -> new TestAdvisorSeeder(userRepository, roleRepository, passwordEncoder);
            case "student" -> new TestStudentSeeder(userRepository, roleRepository, passwordEncoder);
            default -> throw new IllegalArgumentException(kind);
        };
        ReflectionTestUtils.setField(seeder, "enabled", true);
        ReflectionTestUtils.setField(seeder, "email", "test." + kind + "@itic.fr");
        ReflectionTestUtils.setField(seeder, "password", password);
        return seeder;
    }
}
