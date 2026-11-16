package com.itic.paris.platform.geo;

import java.util.Optional;
import java.util.regex.Pattern;

/** Code postal français → département (« 75011 » → « 75 », « 20090 » → « 2A », « 97411 » → « 974 »). */
public final class PostalCodes {

    private static final Pattern FIVE_DIGITS = Pattern.compile("^\\d{5}$");

    private PostalCodes() {
    }

    /** Département d'un code postal, ou vide si ce n'est pas un code postal français connu. */
    public static Optional<String> department(String postalCode) {
        if (postalCode == null || !FIVE_DIGITS.matcher(postalCode).matches()) {
            return Optional.empty();
        }
        String department;
        if (postalCode.startsWith("97")) {
            department = postalCode.substring(0, 3);
        } else if (postalCode.startsWith("20")) {
            // Corse : 200xx et 201xx = Corse-du-Sud (2A), 202xx à 206xx = Haute-Corse (2B).
            department = Integer.parseInt(postalCode) < 20200 ? "2A" : "2B";
        } else {
            department = postalCode.substring(0, 2);
        }
        return DepartmentNames.NAMES.containsKey(department) ? Optional.of(department) : Optional.empty();
    }

    public static boolean isIleDeFrance(String department) {
        return switch (department == null ? "" : department) {
            case "75", "77", "78", "91", "92", "93", "94", "95" -> true;
            default -> false;
        };
    }
}
