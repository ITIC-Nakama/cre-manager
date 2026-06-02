package com.itic.paris.platform.shared.storage;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface ICloudStorage {
    public boolean uploadFile(MultipartFile file, String path) throws IOException;

    public boolean deleteFile(String path);

    public boolean deleteFolder(String path);

    public boolean deleteFiles(String path);

    public String getFile(String path);

    public List<String> getFiles(String path);

    public List<String> getFolders(String path);

    public List<String> getFilesByExtension(String path, String extension);



}
