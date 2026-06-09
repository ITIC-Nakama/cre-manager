package com.itic.paris.platform.auth.model.mapper;

import com.itic.paris.platform.auth.core.exception.AppException;
import com.itic.paris.platform.shared.local.MessageKey;
import com.itic.paris.platform.auth.model.*;
import com.itic.paris.platform.auth.model.dtos.AdminCreateUserDto;
import com.itic.paris.platform.auth.model.dtos.UserRegisterDto;
import com.itic.paris.platform.auth.model.enums.RoleEnum;
import org.springframework.http.HttpStatus;

import java.time.Instant;

public final class UserMapper {

    private UserMapper() {
    }

    public static Student toStudentEntity(UserRegisterDto dto, Role role, com.itic.paris.platform.auth.model.Promotion promotion) {
        Student student = new Student();
        student.setXpTotal(0);
        student.setLastActivity(Instant.now());
        student.setPromotion(promotion);
        mapCommonFields(student, dto.getEmail(), dto.getFirstName(), dto.getLastName(),
                dto.getPhoneNumber(), dto.getPassword(), dto.getLang(), role);
        return student;
    }

    public static User toStaffEntity(AdminCreateUserDto dto, Role role) {
        User user = switch (dto.getRole()) {
            case ADMIN -> new Admin();
            case ADVISOR -> {
                if (dto.getJobTitle() == null || dto.getJobTitle().isBlank()) {
                    throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.JOB_TITLE_REQUIRED);
                }
                Advisor advisor = new Advisor();
                advisor.setJobTitle(dto.getJobTitle().trim());
                yield advisor;
            }
            case STUDENT -> throw new AppException(HttpStatus.BAD_REQUEST, MessageKey.STUDENTS_MUST_REGISTER);
        };

        mapCommonFields(user, dto.getEmail(), dto.getFirstName(), dto.getLastName(),
                dto.getPhoneNumber(), dto.getPassword(), dto.getLang(), role);
        return user;
    }

    public static RoleEnum roleOf(User user) {
        if (user.getRole() == null || user.getRole().getName() == null) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, MessageKey.USER_NO_ROLE);
        }
        return user.getRole().getName();
    }

    private static void mapCommonFields(User user, String email, String firstName, String lastName,
                                        String phoneNumber, String password, String lang, Role role) {
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhoneNumber(phoneNumber);
        user.setPassword(password);
        user.setLang(lang);
        if (role != null) {
            user.setRole(role);
        }
    }
}
