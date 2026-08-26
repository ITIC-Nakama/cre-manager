package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContractTypeService extends AbstractLabeledReferenceDataService<ContractType, ContractTypeDTO> {

    public ContractTypeService(ContractTypeRepository contractTypeRepository) {
        super(contractTypeRepository, ContractType::new, ContractTypeService::mapToDTO,
                MessageKey.CONTRACT_TYPE_NOT_FOUND, MessageKey.CONTRACT_TYPE_LABEL_ALREADY_EXISTS);
    }

    public List<ContractTypeDTO> getActiveContractTypes() {
        return getActive();
    }

    private static ContractTypeDTO mapToDTO(ContractType contractType) {
        return new ContractTypeDTO(
                contractType.getId(),
                contractType.getLabel(),
                contractType.getDescription(),
                contractType.getActive(),
                contractType.getCreatedAt()
        );
    }
}
