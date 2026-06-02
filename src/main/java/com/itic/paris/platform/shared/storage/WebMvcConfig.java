package com.itic.paris.platform.shared.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Configuration de la gestion des ressources statiques pour le stockage local.
 * Permet de servir les fichiers physiques stockés sur le serveur via l'URL de l'API.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${storage.local.directory:./uploads}")
    private String uploadDirectory;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Résout le chemin absolu et normalisé du dossier de stockage local
        String absolutePath = Paths.get(uploadDirectory).toAbsolutePath().normalize().toUri().toString();
        
        // Mappe l'URL /files/** vers le dossier physique uploads/
        registry.addResourceHandler("/files/**")
                .addResourceLocations(absolutePath);
    }
}
