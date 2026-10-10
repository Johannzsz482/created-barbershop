package com.crafted.barbershop;

import java.util.regex.Pattern;

// Account input rules shared by registration (AuthController) and profile editing (UserController).
// They mirror crafted-app/src/lib/validate.js (signUpRules / usernameError), so the same text is accepted or rejected
// in the browser and on the server. Only the sign-up form is checked against the stricter first/last name rule.
final class AccountRules {
    private AccountRules() {}

    // Letters (any language, accents included) and plain spaces only: no digits, punctuation, symbols or markup.
    // It must start with a letter, so a name can never be only spaces.
    private static final Pattern PERSON_NAME = Pattern.compile("^[\\p{L}\\p{M}][\\p{L}\\p{M} ]*$");

    // Pass a value that was already trimmed (see AuthController.clean)
    static boolean validPersonName(String cleaned) {
        return cleaned != null && PERSON_NAME.matcher(cleaned).matches();
    }

    // Pass a username that was already trimmed and had ONE leading "@" removed (ContactRules.cleanUsername).
    // Returns the message to show, or null when the username is fine. The checks run in this order on purpose:
    // the browser (usernameError in validate.js) uses the same order and wording.
    static String usernameProblem(String cleaned) {
        if (cleaned == null || cleaned.isEmpty()) return "Enter a username.";
        if (cleaned.length() < 3) return "Username must be at least 3 characters.";
        if (cleaned.length() > 30) return "Username can be up to 30 characters.";
        if (!ContactRules.USERNAME.matcher(cleaned).matches()) {
            return "Username can only contain letters, numbers, dots and underscores (no spaces or other symbols).";
        }
        return null;
    }
}
