package com.crafted.barbershop;

import java.util.regex.Pattern;

// Input rules for the Contact Us / admin messaging features. They mirror crafted-app/src/lib/validate.js
// and the registration rules in AuthController, so the same text is accepted or rejected in both places.
final class ContactRules {
    private ContactRules() {}

    static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}$");
    static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_.]{3,30}$");
    static final Pattern PHONE = Pattern.compile("^[0-9+\\- ]{7,20}$");
    // Letters (any language), spaces and . ' - only: no markup, digits or control characters in a person's name
    private static final Pattern NAME = Pattern.compile("^[\\p{L}\\p{M}][\\p{L}\\p{M} .'’-]*$");

    static final int MAX_MESSAGE = 5000;
    static final int MAX_REPLY = 2000;

    static String clean(String s) {
        return s == null ? "" : s.trim();
    }

    // "@name" is stored and compared as "name", like at sign-up
    static String cleanUsername(String s) {
        return clean(s).replaceFirst("^@", "");
    }

    static boolean validUsername(String s) {
        return s != null && USERNAME.matcher(cleanUsername(s)).matches();
    }

    static boolean validEmail(String s) {
        String e = clean(s);
        return e.length() <= 100 && EMAIL.matcher(e).matches();
    }

    // Same characters as sign-up, plus at least 7 real digits so "-------" is not a phone number
    static boolean validPhone(String s) {
        String p = clean(s);
        return PHONE.matcher(p).matches() && p.chars().filter(Character::isDigit).count() >= 7;
    }

    static boolean validPersonName(String s) {
        String n = clean(s);
        return !n.isEmpty() && n.length() <= 100 && NAME.matcher(n).matches();
    }

    // Free text (message or reply): no NUL/control characters other than line breaks and tabs
    static boolean hasUnsafeControlChars(String s) {
        return s.chars().anyMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t');
    }
}
