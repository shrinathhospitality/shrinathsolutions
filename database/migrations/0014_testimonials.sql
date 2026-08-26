-- Testimonials module. Only real, admin-entered testimonials are ever shown publicly.

CREATE TABLE IF NOT EXISTS testimonials (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(150) NOT NULL,
    business_name VARCHAR(150) NULL,
    client_image VARCHAR(500) NULL,
    quote TEXT NOT NULL,
    service_used VARCHAR(150) NULL,
    rating TINYINT UNSIGNED NULL,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    created_by INT UNSIGNED NULL,
    updated_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_testimonials_active (is_active),
    KEY idx_testimonials_order (display_order),
    CONSTRAINT fk_testimonials_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT fk_testimonials_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL,
    CONSTRAINT chk_testimonials_rating CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
