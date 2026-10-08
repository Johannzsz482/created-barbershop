-- 1. USERS: everyone who can log in (customers, barbers, admin)
CREATE TABLE users (
    users_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,              -- BCrypt hash
    role VARCHAR(30) NOT NULL DEFAULT 'CUSTOMER',
    photo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_role CHECK (role IN ('CUSTOMER', 'BARBER', 'ADMIN'))
);
 
-- 2. BARBERS: barber profiles; user_id links a barber to their login account
CREATE TABLE barbers (
    barber_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    bio TEXT,
    specialty VARCHAR(100),
    photo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(users_id)
);
 
-- 3. SERVICES: services offered
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    image_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_service_duration CHECK (duration_minutes > 0)
);
 
-- 4. SCHEDULES: weekly working hours per barber (one row per barber per day)
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    barber_id INT NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (barber_id) REFERENCES barbers(barber_id),
    UNIQUE (barber_id, day_of_week),
    CONSTRAINT chk_schedule_day CHECK (day_of_week IN
        ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);
 
-- 5. BARBER_SERVICES: junction table (many-to-many: barbers <-> services)
CREATE TABLE barber_services (
    barber_id INT NOT NULL,
    service_id INT NOT NULL,
    PRIMARY KEY (barber_id, service_id),
    FOREIGN KEY (barber_id) REFERENCES barbers(barber_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);
 
-- 6. APPOINTMENTS: customer + barber + service + time
CREATE TABLE appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,                        -- the customer
    barber_id INT NOT NULL,
    service_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_at_booking DECIMAL(10, 2) NOT NULL,    -- price when booked, so reports stay correct
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(users_id),
    FOREIGN KEY (barber_id) REFERENCES barbers(barber_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    -- a barber can only be booked for a service they actually offer
    FOREIGN KEY (barber_id, service_id) REFERENCES barber_services(barber_id, service_id),
    CONSTRAINT chk_appt_time CHECK (end_time > start_time),
    CONSTRAINT chk_appt_status CHECK (status IN
        ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DECLINED')),
    INDEX idx_appt_barber_date (barber_id, appointment_date, status),
    INDEX idx_appt_customer (user_id, appointment_date)
);
 
-- 7. APPOINTMENT_LOGS: history of status changes
CREATE TABLE appointment_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by INT NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
    FOREIGN KEY (changed_by) REFERENCES users(users_id)
);
 
-- 8. SCHEDULE_EXCEPTIONS: barber days off / vacation leave, with a reason
CREATE TABLE schedule_exceptions (
    exception_id INT AUTO_INCREMENT PRIMARY KEY,
    barber_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barber_id) REFERENCES barbers(barber_id),
    CONSTRAINT chk_exception_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_exception_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);
 
-- 9. CONTACT_MESSAGES: messages sent from the Contact Us form (read by the admin)
CREATE TABLE contact_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
 
-- USERS: 10 customers (ids 1-10), 1 admin (id 11), 5 barbers (ids 12-16)
INSERT INTO users (first_name, last_name, email, username, phone, password, role, created_at) VALUES
    ('Angela', 'Ken', 'angela.ken@gmail.com', 'angelaken', '09181234567', '$2b$10$s6ldgXhumjux6sJPkdkbCeZq5Ec.e3WvxZz6lVwmzhwlGsxdfAuBS', 'CUSTOMER', '2026-01-02 09:00:00'),  -- angelaken / angela123
    ('Geneva', 'Abo-Abo', 'geneva.aboabo@gmail.com', 'genevaaboabo', '09191234567', '$2b$10$/Ia9OvuLWOERduDwhJDzuuLJaMPpLqtSmSRvd0AnGhnNK/3ryEotW', 'CUSTOMER', '2026-01-05 09:00:00'),  -- genevaaboabo / geneva123
    ('Jhanina Avrile', 'Senar', 'jhanina.senar@yahoo.com', 'jhaninasenar', '09201234567', '$2b$10$KSikSML5H5mvgQZmiGhbYu1glILUQtJa1JiH36y2jI73qOiHPu45G', 'CUSTOMER', '2026-02-11 09:00:00'),  -- jhaninasenar / jhanina123
    ('Shelah', 'Garin', 'ellagarin@yahoo.com', 'shelahgarin', '09211234567', '$2b$10$q/SeMruMc6H69.vLb4WnY.15dl696MgwKzCUF45dmqZB6hrghorea', 'CUSTOMER', '2026-02-20 09:00:00'),  -- shelahgarin / shelah123
    ('Julia', 'Barreto', 'juliabarreto@gmail.com', 'juliabarreto', '09221234567', '$2b$10$Y49ybqjCkwcpIHI.A8AY1.GGgFkOMLZYKthaB9y1HWJH.2C5A8sU.', 'CUSTOMER', '2026-03-03 09:00:00'),  -- juliabarreto / julia123
    ('Kathryn', 'Bernado', 'bernadokathryn@yahoo.com', 'kathrynbernado', '09231234567', '$2b$10$IkrAx9vkidAyE4dSNkRZ5OSRs9ZqGiYJ61HGsdHYiZMj6cV9RFFIO', 'CUSTOMER', '2026-03-18 09:00:00'),  -- kathrynbernado / kathryn123
    ('Kelly', 'Cruz', 'kelly.cruz@yahoo.com', 'kellycruz', '09241234567', '$2b$10$0HhuJFojwMJRQs463.2jtuEwHTfcaR4jWA9v86VJmjZarMvdrtwU2', 'CUSTOMER', '2026-04-09 09:00:00'),  -- kellycruz / kelly123
    ('Kersten Liane', 'Quilapio', 'kersten.quilapio@yahoo.com', 'kerstenquilapio', '09251234567', '$2b$10$n5jRCed.cevvsMFbLCtYD.mfgQ9dypGZ1DpWOPD3KMNezrZhHgpdG', 'CUSTOMER', '2026-05-01 09:00:00'),  -- kerstenquilapio / kersten123
    ('Liza', 'Soberano', 'liza.soberano@gmail.com', 'lizsoberano', '09261234567', '$2b$10$2q84behAeANQBZn7fqqfkOyoEA5Uc24ca.tvwXtWjbsxRCX8LfGGq', 'CUSTOMER', '2026-05-22 09:00:00'),  -- lizsoberano / liza123
    ('Nadine', 'Lustre', 'nadine.lustre@yahoo.com', 'nadinelustre', '09271234567', '$2b$10$Y/Uow.5sHC8dsGUwph.YHecLWH8Wd2YEwfBqLdyKbY1gu8ncdZb3a', 'CUSTOMER', '2026-06-14 09:00:00'),  -- nadinelustre / nadine123
    ('Crafted', 'Admin', 'admin@craftedbarbershop.com', 'admin', '09170000000', '$2b$10$/s4GHsw9AUCbyyMkO02cROpibnU0jZFKKiLQhOV6hGzFojpXxAflW', 'ADMIN', '2026-01-01 08:00:00'),  -- admin / admin123
    ('Johann Sebastian', 'Perada', 'johann@craftedbarbershop.com', 'johann', '09171111111', '$2b$10$6fsbDnY0L9StAj6rKz0lOOKgGznZfTMEBjUK9ONnlDN116n9r7Fh2', 'BARBER', '2026-10-01 08:00:00'),  -- johann / johann123
    ('John Loyd', 'Cruz', 'loyd@craftedbarbershop.com', 'loyd', '09172222222', '$2b$10$yhOG5dQfbg/F0wltR4cDVeCLHNtzwSsIf7LK83cjUD33bBuI7wvMi', 'BARBER', '2026-10-01 08:00:00'),  -- loyd / john123
    ('Joshua', 'Garcia', 'joshua@craftedbarbershop.com', 'joshua', '09173333333', '$2b$10$TVvMnHYKFmB/oe0v9BSIL.cTgWPjnnxYIhviKNl9mX9RzxJt8UoMi', 'BARBER', '2026-10-01 08:00:00'),  -- joshua / joshua123
    ('King Justine Dave', 'Odeste', 'king@craftedbarbershop.com', 'king', '09174444444', '$2b$10$6dTRYmOKHxS6PMpDKJKAcOfQESKz.gZDfLJUrTeD.QpmDKoIjZoAG', 'BARBER', '2026-10-01 08:00:00'),  -- king / king123
    ('Nel', 'Giron', 'nel@craftedbarbershop.com', 'nel', '09175555555', '$2b$10$1cs4JB8g864YI0eUPZmB6.y95u9inl1Gg7sPl7BU7qIiUN79g/vzG', 'BARBER', '2026-10-01 08:00:00');  -- nel / nel123
 
-- BARBERS: 5 records linked to users 12-16. John Loyd (barber 2) is inactive.
INSERT INTO barbers (user_id, first_name, last_name, bio, specialty, photo_url, is_active) VALUES
    (12, 'Johann Sebastian', 'Perada', 'Experienced in clean modern cuts with detailed finishing and balanced styling.', 'Modern Haircuts', '/assets/barbers/barber-1.png', TRUE),
    (13, 'John Loyd', 'Cruz', 'Specializes in sharp fades, precise tapers, and clean neckline detailing.', 'Fades and Tapers', '/assets/barbers/barber-2.png', FALSE),
    (14, 'Joshua', 'Garcia', 'Known for textured hairstyles and customized cuts suited to different hair types.', 'Textured Haircuts', '/assets/barbers/barber-3.png', TRUE),
    (15, 'King Justine Dave', 'Odeste', 'Focuses on contemporary styles, creative cuts, and polished everyday looks.', 'Creative Haircuts', '/assets/barbers/barber-4.png', TRUE),
    (16, 'Nel', 'Giron', 'Provides classic and modern barbering services with attention to clean details.', 'Classic and Modern Cuts', '/assets/barbers/barber-5.png', TRUE);
 
-- SERVICES: 10 records (ids 1-10)
INSERT INTO services (service_name, description, price, duration_minutes, is_active) VALUES
    ('Taper Fade', 'A gradual taper around the sides and back while keeping the top length.', 180.00, 40, TRUE),
    ('Skin Fade', 'A close fade that blends the hair down to the skin for a sharp finish.', 220.00, 45, TRUE),
    ('Undercut Fade', 'A disconnected haircut with shorter faded sides.', 200.00, 45, TRUE),
    ('Buzz Cut', 'A short, uniform haircut using clippers with a clean finish.', 130.00, 25, TRUE),
    ('Slick Back', 'A classic hairstyle with the hair combed backward.', 180.00, 35, TRUE),
    ('Modern Mullet', 'Featuring shorter sides and front with added length at the back.', 250.00, 50, TRUE),
    ('Wolf Cut', 'A layered and textured haircut combining volume on top with softer layers.', 150.00, 50, TRUE),
    ('Blowout Taper', 'A voluminous hairstyle with a tapered finish on the sides and back.', 230.00, 45, TRUE),
    ('Crew Cut', 'A short haircut that gradually becomes shorter toward the sides and back.', 160.00, 30, TRUE),
    ('Low Drop Fade', 'A low fade that follows the natural shape of the head.', 220.00, 45, TRUE);
 
-- SCHEDULES: weekly hours (Johann = barber 1 works Monday and Saturday)
INSERT INTO schedules (barber_id, day_of_week, start_time, end_time, is_active) VALUES
    (1, 'MONDAY', '09:00:00', '18:00:00', TRUE),
    (2, 'TUESDAY', '09:00:00', '18:00:00', TRUE),
    (3, 'WEDNESDAY', '10:00:00', '19:00:00', TRUE),
    (4, 'THURSDAY', '09:00:00', '18:00:00', TRUE),
    (5, 'FRIDAY', '10:00:00', '19:00:00', TRUE),
    (1, 'SATURDAY', '09:00:00', '17:00:00', TRUE),
    (2, 'SATURDAY', '09:00:00', '17:00:00', TRUE);
 
-- BARBER_SERVICES: every service (1-10) now has at least one barber
INSERT INTO barber_services (barber_id, service_id) VALUES
    (1, 1), (1, 2), (1, 6), (1, 8), (1, 10),
    (2, 1), (2, 2), (2, 4), (2, 9),
    (3, 3), (3, 5), (3, 7), (3, 8),
    (4, 1), (4, 4), (4, 7), (4, 9),
    (5, 1), (5, 3), (5, 5), (5, 10);
 
-- APPOINTMENTS: each fits its barber's schedule, the service duration and barber_services.
-- (Oct 5 2026 is a Monday.)
INSERT INTO appointments (user_id, barber_id, service_id, appointment_date, start_time, end_time, price_at_booking, status, notes) VALUES
    (1, 1, 1, '2026-10-05', '10:00:00', '10:40:00', 180.00, 'COMPLETED', 'Regular haircut'),                  -- id 1
    (2, 1, 2, '2026-10-05', '11:00:00', '11:45:00', 220.00, 'COMPLETED', 'Requested a clean skin fade'),       -- id 2
    (3, 3, 3, '2026-10-07', '13:00:00', '13:45:00', 200.00, 'CONFIRMED', 'Undercut for a school event'),       -- id 3
    (4, 4, 4, '2026-10-08', '14:00:00', '14:25:00', 130.00, 'PENDING', 'Quick buzz cut'),                      -- id 4
    (5, 5, 5, '2026-10-09', '15:00:00', '15:35:00', 180.00, 'CANCELLED', 'Customer cancelled'),                -- id 5
    (1, 1, 1, '2026-10-10', '09:00:00', '09:40:00', 180.00, 'CONFIRMED', 'Weekend appointment'),               -- id 6
    (6, 5, 1, '2026-10-09', '10:00:00', '10:40:00', 180.00, 'CONFIRMED', 'First visit'),                       -- id 7
    (7, 3, 5, '2026-10-07', '11:00:00', '11:35:00', 180.00, 'CONFIRMED', 'Slick back for an event'),           -- id 8
    (1, 4, 1, '2026-10-01', '10:00:00', '10:40:00', 180.00, 'COMPLETED', 'Trying a new barber'),               -- id 9
    (2, 5, 3, '2026-09-25', '11:00:00', '11:45:00', 200.00, 'COMPLETED', 'Undercut fade'),                     -- id 10
    (8, 1, 2, '2026-09-28', '14:00:00', '14:45:00', 220.00, 'COMPLETED', 'Skin fade'),                         -- id 11
    (1, 1, 1, '2026-09-21', '10:00:00', '10:40:00', 180.00, 'COMPLETED', 'Regular haircut'),                   -- id 12
    (9, 3, 3, '2026-09-23', '12:00:00', '12:45:00', 200.00, 'COMPLETED', 'Undercut fade');                     -- id 13
 
-- APPOINTMENT_LOGS: valid transitions only (PENDING > CONFIRMED > IN_PROGRESS > COMPLETED)
-- changed_by: 12 Johann, 14 Joshua, 15 King, 16 Nel, 5 Julia (customer)
INSERT INTO appointment_logs (appointment_id, old_status, new_status, changed_by, changed_at) VALUES
    (1, 'PENDING', 'CONFIRMED', 12, '2026-10-03 09:00:00'),
    (1, 'CONFIRMED', 'IN_PROGRESS', 12, '2026-10-05 10:00:00'),
    (1, 'IN_PROGRESS', 'COMPLETED', 12, '2026-10-05 10:40:00'),
    (2, 'PENDING', 'CONFIRMED', 12, '2026-10-03 09:05:00'),
    (2, 'CONFIRMED', 'IN_PROGRESS', 12, '2026-10-05 11:00:00'),
    (2, 'IN_PROGRESS', 'COMPLETED', 12, '2026-10-05 11:45:00'),
    (3, 'PENDING', 'CONFIRMED', 14, '2026-10-04 09:00:00'),
    (5, 'PENDING', 'CANCELLED', 5, '2026-10-04 12:00:00'),
    (6, 'PENDING', 'CONFIRMED', 12, '2026-10-04 09:10:00'),
    (7, 'PENDING', 'CONFIRMED', 16, '2026-10-04 09:20:00'),
    (8, 'PENDING', 'CONFIRMED', 14, '2026-10-04 09:30:00'),
    (9, 'PENDING', 'CONFIRMED', 15, '2026-09-29 09:00:00'),
    (9, 'CONFIRMED', 'IN_PROGRESS', 15, '2026-10-01 10:00:00'),
    (9, 'IN_PROGRESS', 'COMPLETED', 15, '2026-10-01 10:40:00'),
    (10, 'PENDING', 'CONFIRMED', 16, '2026-09-22 09:00:00'),
    (10, 'CONFIRMED', 'IN_PROGRESS', 16, '2026-09-25 11:00:00'),
    (10, 'IN_PROGRESS', 'COMPLETED', 16, '2026-09-25 11:45:00'),
    (11, 'PENDING', 'CONFIRMED', 12, '2026-09-24 09:00:00'),
    (11, 'CONFIRMED', 'IN_PROGRESS', 12, '2026-09-28 14:00:00'),
    (11, 'IN_PROGRESS', 'COMPLETED', 12, '2026-09-28 14:45:00'),
    (12, 'PENDING', 'CONFIRMED', 12, '2026-09-18 09:00:00'),
    (12, 'CONFIRMED', 'IN_PROGRESS', 12, '2026-09-21 10:00:00'),
    (12, 'IN_PROGRESS', 'COMPLETED', 12, '2026-09-21 10:40:00'),
    (13, 'PENDING', 'CONFIRMED', 14, '2026-09-20 09:00:00'),
    (13, 'CONFIRMED', 'IN_PROGRESS', 14, '2026-09-23 12:00:00'),
    (13, 'IN_PROGRESS', 'COMPLETED', 14, '2026-09-23 12:45:00');
 
-- SCHEDULE_EXCEPTIONS: sample barber leave requests
INSERT INTO schedule_exceptions (barber_id, start_date, end_date, reason, status) VALUES
    (4, '2026-10-15', '2026-10-17', 'Family event out of town', 'APPROVED'),
    (3, '2026-10-21', '2026-10-21', 'Medical appointment', 'PENDING');
 
-- CONTACT_MESSAGES: sample messages
INSERT INTO contact_messages (name, email, message, is_read) VALUES
    ('Mark Reyes', 'mark.reyes@gmail.com', 'Do you accept walk-ins on Sundays?', FALSE),
    ('Ana Lim', 'ana.lim@yahoo.com', 'Can I book a haircut for my father who is a senior citizen?', FALSE),
    ('Paolo Santos', 'paolo.santos@gmail.com', 'Great service last week. Thank you!', TRUE);