package com.itic.paris.platform.shared.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

@Configuration
public class StorageConfig {

    @Configuration
    @ConditionalOnProperty(name = "storage.provider", havingValue = "r2")
    public static class R2StorageConfiguration {

        @Value("${storage.r2.endpoint}")
        private String endpoint;

        @Value("${storage.r2.bucket}")
        private String bucketName;

        @Value("${storage.r2.access-key}")
        private String accessKey;

        @Value("${storage.r2.secret-key}")
        private String secretKey;

        @Value("${storage.r2.public-url:}")
        private String publicUrl;

        @Value("${storage.r2.region:eu-west-3}")
        private String region;

        @Bean
        public S3Client s3Client() {
            return S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)
                    ))
                    // Configure la région du bucket (par défaut eu-west-3 pour la France / Paris)
                    .region(Region.of(region))
                    .build();
        }

        @Bean
        public S3Presigner s3Presigner() {
            return S3Presigner.builder()
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)
                    ))
                    // Configure la région du bucket (par défaut eu-west-3 pour la France / Paris)
                    .region(Region.of(region))
                    .build();
        }

        @Bean
        public ICloudStorage r2StorageService(S3Client s3Client, S3Presigner s3Presigner) {
            return new R2StorageService(s3Client, s3Presigner, bucketName, publicUrl);
        }
    }

    @Bean
    @ConditionalOnProperty(name = "storage.provider", havingValue = "local", matchIfMissing = true)
    public ICloudStorage localStorageService() {
        return new LocalStorageService();
    }
}
