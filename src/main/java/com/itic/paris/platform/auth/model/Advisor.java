package com.itic.paris.platform.auth.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "advisors")
@PrimaryKeyJoinColumn(name = "user_id")
public class Advisor extends User {

    @Column(name = "job_title")
    private String jobTitle;
}
