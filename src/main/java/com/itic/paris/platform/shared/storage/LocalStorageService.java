package com.itic.paris.platform.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
public class LocalStorageService implements ICloudStorage {

    @Value("${storage.local.directory:./uploads}")
    private String uploadDirectory;

    @Value("${storage.local.base-url:http://localhost:8080/api/v1/files}")
    private String baseUrl;

    @Override
    public boolean uploadFile(MultipartFile file, String path) throws IOException {
        return uploadFile(file.getInputStream(), path, file.getContentType(), file.getSize());
    }

    @Override
    public boolean uploadFile(InputStream inputStream, String path, String contentType, long contentLength) throws IOException {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            Files.createDirectories(targetPath.getParent());
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            return true;
        } catch (Exception e) {
            log.error("Failed to upload file locally to: {}", path, e);
            return false;
        }
    }

    @Override
    public boolean deleteFile(String path) {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            return Files.deleteIfExists(targetPath);
        } catch (Exception e) {
            log.error("Failed to delete local file: {}", path, e);
            return false;
        }
    }

    @Override
    public boolean deleteFolder(String path) {
        return deleteFiles(path);
    }

    @Override
    public boolean deleteFiles(String path) {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            if (!Files.exists(targetPath)) {
                return true;
            }
            try (Stream<Path> walk = Files.walk(targetPath)) {
                List<Path> files = walk.sorted((a, b) -> b.compareTo(a)).collect(Collectors.toList());
                for (Path p : files) {
                    Files.delete(p);
                }
            }
            return true;
        } catch (Exception e) {
            log.error("Failed to delete local files/directory: {}", path, e);
            return false;
        }
    }

    @Override
    public String getFile(String path) {
        // Retourne l'URL publique ou l'endpoint du contrôleur pour récupérer le fichier
        return baseUrl + "/" + path;
    }

    @Override
    public InputStream downloadFile(String path) throws IOException {
        Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
        return Files.newInputStream(targetPath);
    }

    @Override
    public List<String> getFiles(String path) {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            if (!Files.exists(targetPath)) {
                return Collections.emptyList();
            }
            try (Stream<Path> walk = Files.walk(targetPath, 1)) {
                return walk.filter(Files::isRegularFile)
                        .map(p -> Paths.get(uploadDirectory).relativize(p).toString().replace("\\", "/"))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Failed to list files locally under: {}", path, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<String> getFolders(String path) {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            if (!Files.exists(targetPath)) {
                return Collections.emptyList();
            }
            try (Stream<Path> walk = Files.walk(targetPath, 1)) {
                return walk.filter(Files::isDirectory)
                        .filter(p -> !p.equals(targetPath))
                        .map(p -> Paths.get(uploadDirectory).relativize(p).toString().replace("\\", "/"))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Failed to list folders locally under: {}", path, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<String> getFilesByExtension(String path, String extension) {
        try {
            Path targetPath = Paths.get(uploadDirectory).resolve(path).normalize();
            if (!Files.exists(targetPath)) {
                return Collections.emptyList();
            }
            try (Stream<Path> walk = Files.walk(targetPath)) {
                return walk.filter(Files::isRegularFile)
                        .filter(p -> p.toString().endsWith(extension))
                        .map(p -> Paths.get(uploadDirectory).relativize(p).toString().replace("\\", "/"))
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.error("Failed to list files locally under: {} with extension: {}", path, extension, e);
            return Collections.emptyList();
        }
    }
}
