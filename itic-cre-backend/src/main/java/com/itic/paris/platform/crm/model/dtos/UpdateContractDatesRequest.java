package com.itic.paris.platform.crm.model.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateContractDatesRequest {

    private LocalDate startDate;

    private LocalDate endDate;
}
