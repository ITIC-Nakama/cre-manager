package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.shared.local.LanguageUtil;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.jobboard.model.ContractType;
import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.repository.ContractTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.itic.paris.platform.auth.core.security.SecurityContextHelper.currentUserLang;

@Service
@RequiredArgsConstructor
public class ContractTypeService {

    private final ContractTypeRepository contractTypeRepository;

    public ContractTypeDTO create(ContractTypeDTO dto) {
        ContractType contractType = new ContractType();
        contractType.setLabel(dto.getLabel());
        contractType.setDescription(dto.getDescription());
        contractType.setActive(true);

        ContractType saved = contractTypeRepository.save(contractType);
        return mapToDTO(saved);
    }

    public ContractTypeDTO getById(UUID id) {
        return contractTypeRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> {
                    String lang = currentUserLang();
                    throw new RuntimeException(LanguageUtil.translate(MessageKey.CONTRACT_TYPE_NOT_FOUND, lang));
                });
    }

    public List<ContractTypeDTO> getAll() {
        return contractTypeRepository.findAll()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<ContractTypeDTO> getActiveContractTypes() {
        return contractTypeRepository.findByActive(true)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public ContractTypeDTO update(UUID id, ContractTypeDTO dto) {
        ContractType contractType = contractTypeRepository.findById(id)
                .orElseThrow(() -> {
                    String lang = currentUserLang();
                    throw new RuntimeException(LanguageUtil.translate(MessageKey.CONTRACT_TYPE_NOT_FOUND, lang));
                });

        contractType.setLabel(dto.getLabel());
        contractType.setDescription(dto.getDescription());

        ContractType updated = contractTypeRepository.save(contractType);
        return mapToDTO(updated);
    }

    public void delete(UUID id) {
        contractTypeRepository.deleteById(id);
    }

    public void deactivate(UUID id) {
        ContractType contractType = contractTypeRepository.findById(id)
                .orElseThrow(() -> {
                    String lang = currentUserLang();
                    throw new RuntimeException(LanguageUtil.translate(MessageKey.CONTRACT_TYPE_NOT_FOUND, lang));
                });
        contractType.setActive(false);
        contractTypeRepository.save(contractType);
    }


    private ContractTypeDTO mapToDTO(ContractType contractType) {
        return new ContractTypeDTO(
                contractType.getId(),
                contractType.getLabel(),
                contractType.getDescription(),
                contractType.getActive(),
                contractType.getCreatedAt()
        );
    }
}
