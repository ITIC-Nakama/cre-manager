package com.itic.paris.platform.shared.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public interface ICloudStorage {
    
    boolean uploadFile(MultipartFile file, String path) throws IOException;

    boolean uploadFile(InputStream inputStream, String path, String contentType, long contentLength) throws IOException;

    boolean deleteFile(String path);

    boolean deleteFolder(String path);

    boolean deleteFiles(String path);

    /**
     * Récupère l'URL de téléchargement publique ou pré-signée d'un fichier.
     */
    String getFile(String path);

    /**
     * Télécharge le contenu du fichier sous forme d'InputStream.
     */
    InputStream downloadFile(String path) throws IOException;

    List<String> getFiles(String path);

    List<String> getFolders(String path);

    List<String> getFilesByExtension(String path, String extension);
}
