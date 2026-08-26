-- Needed to rate-limit public enquiry submissions per IP.

ALTER TABLE contact_enquiries ADD COLUMN ip_address VARCHAR(45) NULL AFTER referrer;
ALTER TABLE contact_enquiries ADD KEY idx_contact_enquiries_ip (ip_address);
