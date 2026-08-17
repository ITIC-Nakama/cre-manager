package com.itic.paris.platform.auth.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "promotions")
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(length = 20)
    private String year;

    @Column(name = "has_years", nullable = false)
    private boolean hasYears = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "promotion_available_years", joinColumns = @JoinColumn(name = "promotion_id"))
    @Column(name = "study_year", nullable = false)
    @OrderBy("study_year ASC")
    private List<Integer> availableYears = new ArrayList<>();
}
