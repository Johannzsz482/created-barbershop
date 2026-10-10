package com.crafted.barbershop;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ContactRulesTest {
    @Test
    void usernamesAllowOnlySafeCharacters() {
        assertTrue(ContactRules.validUsername("@juan_d.1"));
        assertFalse(ContactRules.validUsername("<script>"));
        assertFalse(ContactRules.validUsername("a'; DROP--"));
        assertFalse(ContactRules.validUsername("ab"));
        assertFalse(ContactRules.validUsername(null));
    }

    @Test
    void contactMethodsAreChecked() {
        assertTrue(ContactRules.validEmail("a@b.co"));
        assertFalse(ContactRules.validEmail("a@b"));
        assertTrue(ContactRules.validPhone("0917 123 4567"));
        assertFalse(ContactRules.validPhone("-------"));
        assertFalse(ContactRules.validPhone("12345abc"));
    }

    @Test
    void namesAndTextRejectMarkupAndControlCharacters() {
        assertTrue(ContactRules.validPersonName("Ma. O'Brien-Reyes"));
        assertFalse(ContactRules.validPersonName("<b>x</b>"));
        assertFalse(ContactRules.validPersonName("Juan2"));
        assertTrue(ContactRules.hasUnsafeControlChars("a\u0000b"));
        assertFalse(ContactRules.hasUnsafeControlChars("line1\nline2\tok"));
    }
}
