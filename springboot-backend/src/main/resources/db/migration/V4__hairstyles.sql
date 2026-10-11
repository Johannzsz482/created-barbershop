-- V4: individual hairstyles, grouped under the EXISTING paid services (a service is the category).
-- Purely additive: services, barber_services, schedules, appointments and appointment_logs are not touched,
-- so every service id, price, duration, barber assignment, schedule and booking stays exactly as it is.
-- Hairstyles carry no price or duration of their own; they inherit both from their service.
--
-- The sample hairstyles used to live in the React app and were tied to a service by NAME only. This migration
-- links each one to a service_id, but only when exactly ONE service has that name. It never guesses:
--   * a service name that is missing or renamed          -> its hairstyles are NOT created
--   * a service name shared by more than one service     -> its hairstyles are NOT created
-- Those rows are kept (not lost) in the table hairstyle_unmapped together with the reason.
-- After running the migration, check:   SELECT * FROM hairstyle_unmapped;
-- (empty = every hairstyle was mapped). Anything listed can be added from Admin -> Services -> Hairstyles
-- once the matching service exists, then hairstyle_unmapped can be dropped.
-- "Classic Off Cut" is intentionally NOT seeded: it was requested but is not in the project and is unverified.

CREATE TABLE hairstyles (
    hairstyle_id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    image_key VARCHAR(100) NULL,               -- picture file name (without extension) in the frontend's /assets folder; stays fixed when a hairstyle is renamed
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (service_id) REFERENCES services(service_id),
    UNIQUE (service_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rows that could not be linked to exactly one service (see the note at the top)
CREATE TABLE hairstyle_unmapped (
    service_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    image_key VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,
    reason VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Temporary list of the sample hairstyles; dropped at the end of this script
CREATE TABLE hairstyle_seed (
    seed_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    image_key VARCHAR(100) NOT NULL,
    display_order INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO hairstyle_seed (service_name, name, image_key, display_order) VALUES
    ('Taper Fade', 'Low Taper', 'low-taper', 1),
    ('Taper Fade', 'Mid Taper', 'mid-taper', 2),
    ('Taper Fade', 'Classic Taper', 'classic-taper', 3),
    ('Skin Fade', 'Low Skin Fade', 'low-skin-fade', 1),
    ('Skin Fade', 'Mid Skin Fade', 'mid-skin-fade', 2),
    ('Skin Fade', 'High Skin Fade', 'high-skin-fade', 3),
    ('Undercut Fade', 'Disconnected Undercut', 'disconnected-undercut', 1),
    ('Undercut Fade', 'Textured Undercut', 'textured-undercut', 2),
    ('Undercut Fade', 'Slicked Undercut', 'slicked-undercut', 3),
    ('Buzz Cut', 'Classic Buzz', 'classic-buzz', 1),
    ('Buzz Cut', 'Butch Cut', 'butch-cut', 2),
    ('Buzz Cut', 'Induction Cut', 'induction-cut', 3),
    ('Slick Back', 'Classic Slick Back', 'classic-slick-back', 1),
    ('Slick Back', 'Pompadour', 'pompadour', 2),
    ('Slick Back', 'Side-Swept Slick', 'side-swept-slick', 3),
    ('Modern Mullet', 'Classic Modern Mullet', 'classic-modern-mullet', 1),
    ('Modern Mullet', 'Textured Mullet', 'textured-mullet', 2),
    ('Modern Mullet', 'Mullet Fade', 'mullet-fade', 3),
    ('Wolf Cut', 'Classic Wolf Cut', 'classic-wolf-cut', 1),
    ('Wolf Cut', 'Short Wolf Cut', 'short-wolf-cut', 2),
    ('Wolf Cut', 'Curly Wolf Cut', 'curly-wolf-cut', 3),
    ('Blowout Taper', 'Classic Blowout Taper', 'classic-blowout-taper', 1),
    ('Blowout Taper', 'Textured Blowout', 'textured-blowout', 2),
    ('Blowout Taper', 'Curly Blowout', 'curly-blowout', 3),
    ('Crew Cut', 'Classic Crew Cut', 'classic-crew-cut', 1),
    ('Crew Cut', 'Ivy League', 'ivy-league', 2),
    ('Crew Cut', 'High and Tight', 'high-and-tight', 3),
    ('Low Drop Fade', 'Burst Fade', 'burst-fade', 1),
    ('Low Drop Fade', 'Low Fade', 'low-fade', 2),
    ('Low Drop Fade', 'Drop Fade with Curls', 'drop-fade-with-curls', 3);

INSERT INTO hairstyles (service_id, name, image_key, display_order)
SELECT s.service_id, h.name, h.image_key, h.display_order
FROM hairstyle_seed h
JOIN services s ON LOWER(TRIM(s.service_name)) = LOWER(TRIM(h.service_name))
WHERE (SELECT COUNT(*) FROM services s2 WHERE LOWER(TRIM(s2.service_name)) = LOWER(TRIM(h.service_name))) = 1
ORDER BY h.seed_id;

INSERT INTO hairstyle_unmapped (service_name, name, image_key, display_order, reason)
SELECT h.service_name, h.name, h.image_key, h.display_order,
       CASE WHEN (SELECT COUNT(*) FROM services s2 WHERE LOWER(TRIM(s2.service_name)) = LOWER(TRIM(h.service_name))) = 0
            THEN 'No service with this name'
            ELSE 'More than one service has this name' END
FROM hairstyle_seed h
WHERE (SELECT COUNT(*) FROM services s2 WHERE LOWER(TRIM(s2.service_name)) = LOWER(TRIM(h.service_name))) <> 1
ORDER BY h.seed_id;

DROP TABLE hairstyle_seed;
