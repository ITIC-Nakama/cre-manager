package com.itic.paris.platform.jobboard.controller;

import com.itic.paris.platform.jobboard.model.dtos.ContractTypeDTO;
import com.itic.paris.platform.jobboard.service.ContractTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/jobboard/contract-types")
@RequiredArgsConstructor
@Tag(name = "Contract Types", description = "Manage job contract types")
public class ContractTypeController {
    private final ContractTypeService contractTypeService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Create a new contract type")
    public ResponseEntity<ContractTypeDTO> create(@RequestBody ContractTypeDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contractTypeService.create(dto));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get contract type by ID")
    public ResponseEntity<ContractTypeDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(contractTypeService.getById(id));
    }

    @GetMapping
    @Operation(summary = "List all contract types")
    public ResponseEntity<List<ContractTypeDTO>> getAll() {
        return ResponseEntity.ok(contractTypeService.getAll());
    }

    @GetMapping("/active/list")
    @Operation(summary = "List active contract types")
    public ResponseEntity<List<ContractTypeDTO>> getActive() {
        return ResponseEntity.ok(contractTypeService.getActiveContractTypes());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Update a contract type")
    public ResponseEntity<ContractTypeDTO> update(@PathVariable UUID id, @RequestBody ContractTypeDTO dto) {
        return ResponseEntity.ok(contractTypeService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Delete a contract type")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        contractTypeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','ADVISOR')")
    @Operation(summary = "Deactivate a contract type")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        contractTypeService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
