package com.itic.paris.platform.reclamation.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReclamationFormContextDTO {

    private boolean hasAdvisor;
    private String phoneNumber;
}
