-- Lead capture: contact enquiries, proposal requests, newsletter subscribers.

CREATE TABLE IF NOT EXISTS contact_enquiries (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(190) NULL,
    message TEXT NULL,
    service VARCHAR(150) NULL,
    page_url VARCHAR(500) NULL,
    source VARCHAR(100) NULL,
    utm_source VARCHAR(150) NULL,
    utm_medium VARCHAR(150) NULL,
    utm_campaign VARCHAR(150) NULL,
    referrer VARCHAR(500) NULL,
    status ENUM('new', 'contacted', 'converted', 'spam') NOT NULL DEFAULT 'new',
    internal_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_contact_enquiries_status (status),
    KEY idx_contact_enquiries_created (created_at),
    KEY idx_contact_enquiries_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proposal_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(190) NULL,
    business_details TEXT NULL,
    service VARCHAR(150) NULL,
    page_url VARCHAR(500) NULL,
    status ENUM('new', 'contacted', 'converted', 'spam') NOT NULL DEFAULT 'new',
    internal_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_proposal_requests_status (status),
    KEY idx_proposal_requests_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    status ENUM('subscribed', 'unsubscribed') NOT NULL DEFAULT 'subscribed',
    source VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_newsletter_subscribers_email (email),
    KEY idx_newsletter_subscribers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
