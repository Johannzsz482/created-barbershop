-- Contact messages: link signed-in senders to their account, allow phone-only guests, and store the admin's reply.
-- Existing rows are kept as they are: they stay guest messages (user_id NULL) with no reply.
ALTER TABLE contact_messages
    MODIFY email VARCHAR(100) NULL,
    ADD COLUMN user_id INT NULL AFTER message_id,
    ADD COLUMN phone VARCHAR(20) NULL AFTER email,
    ADD COLUMN reply TEXT NULL,
    ADD COLUMN replied_at DATETIME NULL,
    ADD COLUMN replied_by INT NULL,
    ADD CONSTRAINT fk_contact_user FOREIGN KEY (user_id) REFERENCES users(users_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_contact_replied_by FOREIGN KEY (replied_by) REFERENCES users(users_id) ON DELETE SET NULL;
