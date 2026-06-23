package com.itic.paris.platform.auth.core.webConfig.userdetails;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.auth.model.User;
import com.itic.paris.platform.auth.service.UserLookupService;
import com.itic.paris.platform.shared.local.MessageKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserLookupService userLookupService;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userLookupService.findUserByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Verifie a chaque requete authentifiee (pas seulement au login) : un compte
        // desactive pendant qu'un utilisateur est connecte perd l'acces immediatement,
        // sans attendre l'expiration de son token.
        if (!user.isActive()) {
            throw new AppException(HttpStatus.FORBIDDEN, MessageKey.ACCOUNT_DEACTIVATED);
        }

        String roleName = user.getRole() != null ? user.getRole().getName().name() : "";
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleName));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}
