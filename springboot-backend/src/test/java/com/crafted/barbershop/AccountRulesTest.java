package com.crafted.barbershop;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AccountRulesTest {
    @Test
    void namesAllowLettersAndSpaces() {
        assertTrue(AccountRules.validPersonName("Juan"));
        assertTrue(AccountRules.validPersonName("Jhanina Avrile"));
        assertTrue(AccountRules.validPersonName("Peña"));
    }

    @Test
    void namesRejectNumbersAndSpecialCharacters() {
        for (String bad : new String[] {"Juan2", "12", "Ju@n", "O'Brien", "Abo-Abo", "Ma.", "<b>x</b>", "Juan_", "", " ", " Juan", "a\tb", "a\nb"}) {
            assertFalse(AccountRules.validPersonName(bad), bad);
        }
        assertFalse(AccountRules.validPersonName(null));
    }

    @Test
    void usernameHasOneClearMessagePerProblem() {
        assertNull(AccountRules.usernameProblem("juan_d.1"));
        assertEquals("Enter a username.", AccountRules.usernameProblem(""));
        assertEquals("Username must be at least 3 characters.", AccountRules.usernameProblem("ab"));
        assertEquals("Username can be up to 30 characters.", AccountRules.usernameProblem("a".repeat(31)));
        String chars = "Username can only contain letters, numbers, dots and underscores (no spaces or other symbols).";
        for (String bad : new String[] {"ju an", "juan!", "<script>", "a'; DROP--", "juan@x", "@juan", "juán", "jua-n"}) {
            assertEquals(chars, AccountRules.usernameProblem(bad), bad);
        }
    }

    @Test
    void onlyOneLeadingAtIsRemovedBeforeTheUsernameIsChecked() {
        assertNull(AccountRules.usernameProblem(ContactRules.cleanUsername(" @juan ")));
        assertEquals("Username can only contain letters, numbers, dots and underscores (no spaces or other symbols).",
            AccountRules.usernameProblem(ContactRules.cleanUsername("@@juan")));
    }
}
