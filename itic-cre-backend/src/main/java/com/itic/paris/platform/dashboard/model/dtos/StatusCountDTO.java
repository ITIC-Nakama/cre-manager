package com.itic.paris.platform.dashboard.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StatusCountDTO {
    private String nom;
    private String couleur;
    private long count;
}
