package com.itic.paris.platform.jobboard.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.NoArgsConstructor;

@Entity
@NoArgsConstructor
@Table(name = "sectors")
public class Sector extends LabeledReferenceEntity {
}
