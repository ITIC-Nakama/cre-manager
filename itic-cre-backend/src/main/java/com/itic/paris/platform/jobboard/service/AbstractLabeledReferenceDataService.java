package com.itic.paris.platform.jobboard.service;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.jobboard.model.LabeledReferenceEntity;
import com.itic.paris.platform.jobboard.model.dtos.LabeledReferenceDataView;
import com.itic.paris.platform.jobboard.repository.LabeledReferenceDataRepository;
import com.itic.paris.platform.shared.local.MessageKey;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

/**
 * CRUD partage par les tables de reference "label unique + actif/inactif"
 * (types de contrat, secteurs, ...) : creation/mise a jour avec verification
 * proactive du label, activation/desactivation, suppression.
 */
public abstract class AbstractLabeledReferenceDataService<E extends LabeledReferenceEntity, D extends LabeledReferenceDataView> {

    protected final LabeledReferenceDataRepository<E> repository;
    private final Supplier<E> entityFactory;
    private final Function<E, D> toDto;
    private final MessageKey notFoundKey;
    private final MessageKey labelAlreadyExistsKey;

    protected AbstractLabeledReferenceDataService(LabeledReferenceDataRepository<E> repository,
                                                   Supplier<E> entityFactory,
                                                   Function<E, D> toDto,
                                                   MessageKey notFoundKey,
                                                   MessageKey labelAlreadyExistsKey) {
        this.repository = repository;
        this.entityFactory = entityFactory;
        this.toDto = toDto;
        this.notFoundKey = notFoundKey;
        this.labelAlreadyExistsKey = labelAlreadyExistsKey;
    }

    public D create(D dto) {
        assertLabelAvailable(dto.getLabel(), null);

        E entity = entityFactory.get();
        entity.setLabel(dto.getLabel());
        entity.setDescription(dto.getDescription());
        entity.setActive(true);

        return saveAndMap(entity);
    }

    public D getById(UUID id) {
        return repository.findById(id)
                .map(toDto)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, notFoundKey));
    }

    public List<D> getAll() {
        return repository.findAll().stream().map(toDto).collect(Collectors.toList());
    }

    public List<D> getActive() {
        return repository.findByActive(true).stream().map(toDto).collect(Collectors.toList());
    }

    public D update(UUID id, D dto) {
        E entity = repository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, notFoundKey));

        assertLabelAvailable(dto.getLabel(), id);

        entity.setLabel(dto.getLabel());
        entity.setDescription(dto.getDescription());
        if (dto.getActive() != null) {
            entity.setActive(dto.getActive());
        }

        return saveAndMap(entity);
    }

    public void delete(UUID id) {
        repository.deleteById(id);
    }

    // assertLabelAvailable() ne protege pas contre deux creations concurrentes passant
    // toutes les deux le check avant que l'une des deux ne commite (TOCTOU) ; ce filet
    // convertit la violation de contrainte unique resultante en la meme erreur metier
    // plutot que de laisser fuiter le message SQL brut.
    private D saveAndMap(E entity) {
        try {
            return toDto.apply(repository.save(entity));
        } catch (DataIntegrityViolationException ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, labelAlreadyExistsKey);
        }
    }

    public void deactivate(UUID id) {
        E entity = repository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, notFoundKey));
        entity.setActive(false);
        repository.save(entity);
    }

    private void assertLabelAvailable(String label, UUID excludingId) {
        repository.findByLabel(label)
                .filter(existing -> excludingId == null || !existing.getId().equals(excludingId))
                .ifPresent(existing -> {
                    throw new AppException(HttpStatus.BAD_REQUEST, labelAlreadyExistsKey);
                });
    }
}
