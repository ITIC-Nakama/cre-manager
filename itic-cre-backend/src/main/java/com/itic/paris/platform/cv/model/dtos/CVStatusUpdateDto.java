package com.itic.paris.platform.cv.model.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CVStatusUpdateDto {

    @NotNull
    private UUID statutId;
}
