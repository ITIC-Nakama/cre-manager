package com.itic.paris.platform.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j

public class R2StorageService implements ICloudStorage {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;
    private final String publicBaseUrl;

    public R2StorageService(S3Client s3Client, S3Presigner s3Presigner, String bucketName, String publicBaseUrl) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
        this.publicBaseUrl = publicBaseUrl;
    }

    @Override
    public boolean uploadFile(MultipartFile file, String path) throws IOException {
        return uploadFile(file.getInputStream(), path, file.getContentType(), file.getSize());
    }

    @Override
    public boolean uploadFile(InputStream inputStream, String path, String contentType, long contentLength) throws IOException {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .contentType(contentType)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, contentLength));
            log.info("Successfully uploaded file to R2: {}", path);
            return true;
        } catch (Exception e) {
            log.error("Failed to upload file to R2: {}", path, e);
            return false;
        }
    }

    @Override
    public boolean deleteFile(String path) {
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();
            s3Client.deleteObject(deleteObjectRequest);
            log.info("Successfully deleted file from R2: {}", path);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete file from R2: {}", path, e);
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
            String prefix = path.endsWith("/") ? path : path + "/";
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            if (listResponse.keyCount() == 0) {
                return true;
            }

            List<ObjectIdentifier> toDelete = listResponse.contents().stream()
                    .map(s3Object -> ObjectIdentifier.builder().key(s3Object.key()).build())
                    .collect(Collectors.toList());

            DeleteObjectsRequest deleteObjectsRequest = DeleteObjectsRequest.builder()
                    .bucket(bucketName)
                    .delete(Delete.builder().objects(toDelete).build())
                    .build();

            s3Client.deleteObjects(deleteObjectsRequest);
            log.info("Successfully deleted prefix path from R2: {}", path);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete directory/files under prefix in R2: {}", path, e);
            return false;
        }
    }

    @Override
    public String getFile(String path) {
        // Si une URL de base publique est configurée (ex: URL de bucket public Cloudflare R2), on l'utilise directement
        if (publicBaseUrl != null && !publicBaseUrl.trim().isEmpty()) {
            String baseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl : publicBaseUrl + "/";
            return baseUrl + path;
        }

        try {
            // Sinon, génère une URL pré-signée valide pendant 24 heures
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(24))
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return presignedRequest.url().toString();
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for R2 key: {}", path, e);
            return null;
        }
    }

    @Override
    public InputStream downloadFile(String path) throws IOException {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .build();
            return s3Client.getObject(getObjectRequest);
        } catch (Exception e) {
            throw new IOException("Failed to download file from R2: " + path, e);
        }
    }

    @Override
    public List<String> getFiles(String path) {
        try {
            String prefix = path.isEmpty() || path.endsWith("/") ? path : path + "/";
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .delimiter("/")
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            return listResponse.contents().stream()
                    .map(S3Object::key)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to list files from R2 under: {}", path, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<String> getFolders(String path) {
        try {
            String prefix = path.isEmpty() || path.endsWith("/") ? path : path + "/";
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .delimiter("/")
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            return listResponse.commonPrefixes().stream()
                    .map(CommonPrefix::prefix)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to list folders from R2 under: {}", path, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<String> getFilesByExtension(String path, String extension) {
        try {
            String prefix = path.isEmpty() || path.endsWith("/") ? path : path + "/";
            ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .prefix(prefix)
                    .build();

            ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
            return listResponse.contents().stream()
                    .map(S3Object::key)
                    .filter(key -> key.endsWith(extension))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to list files from R2 with extension {} under: {}", extension, path, e);
            return Collections.emptyList();
        }
    }
}
