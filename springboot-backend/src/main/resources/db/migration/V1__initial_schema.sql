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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BARBER_SERVICES: junction table (many-to-many: barbers <-> services)
CREATE TABLE barber_services (
    barber_id INT NOT NULL,
    service_id INT NOT NULL,
    PRIMARY KEY (barber_id, service_id),
    FOREIGN KEY (barber_id) REFERENCES barbers(barber_id),
    FOREIGN KEY (service_id) REFERENCES services(service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. CONTACT_MESSAGES: messages sent from the Contact Us form (read by the admin)
CREATE TABLE contact_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
