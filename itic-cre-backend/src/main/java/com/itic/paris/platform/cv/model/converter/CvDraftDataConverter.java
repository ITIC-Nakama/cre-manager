package com.itic.paris.platform.cv.model.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.itic.paris.platform.cv.model.dtos.builder.CvDraftData;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stocke les sections du brouillon en JSON dans une colonne TEXT (compatible H2 et PostgreSQL). */
@Converter
public class CvDraftDataConverter implements AttributeConverter<CvDraftData, String> {

    // Champs inconnus ignores : un brouillon ecrit par une version plus recente reste lisible.
    private static final ObjectMapper MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Override
    public String convertToDatabaseColumn(CvDraftData data) {
        try {
            return MAPPER.writeValueAsString(data == null ? new CvDraftData() : data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Brouillon de CV non serialisable", e);
        }
    }

    @Override
    public CvDraftData convertToEntityAttribute(String json) {
        if (json == null || json.isBlank()) {
            return new CvDraftData();
        }
        try {
            return MAPPER.readValue(json, CvDraftData.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Brouillon de CV illisible", e);
        }
    }

    /** JSON canonique (ordre des champs fixe) — sert aussi a l'empreinte anti-abus. */
    public static String toJson(CvDraftData data) {
        return new CvDraftDataConverter().convertToDatabaseColumn(data);
    }
}
