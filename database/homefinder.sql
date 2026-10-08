-- ============================================================
-- HOMEFINDER DATABASE SCHEMA & SEED DATA
-- Database: homefinder_db
--
-- Demo accounts (change these passwords before going live!):
--   admin@homefinder.co.ke     Admin@HomeFinder1
--   landlord@homefinder.co.ke  Landlord@HomeFinder1
--   agent@homefinder.co.ke     Agent@HomeFinder1
--
-- The `sessions` table is created automatically when the app starts.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `homefinder_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `homefinder_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- Table structure for `contact_messages`
DROP TABLE IF EXISTS `contact_messages`;
CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `message` text NOT NULL,
  `status` enum('new','read','replied','closed') DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `inquiries`
DROP TABLE IF EXISTS `inquiries`;
CREATE TABLE `inquiries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `seeker_name` varchar(100) NOT NULL,
  `seeker_phone` varchar(20) NOT NULL,
  `seeker_email` varchar(150) DEFAULT NULL,
  `message` text NOT NULL,
  `preferred_viewing_date` date DEFAULT NULL,
  `preferred_contact_method` enum('phone','whatsapp','email') DEFAULT 'phone',
  `status` enum('new','read','responded','closed') DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_inquiry_property` (`property_id`),
  KEY `idx_inquiry_landlord` (`landlord_id`),
  CONSTRAINT `fk_inquiry_landlord` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inquiry_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `inquiries`
INSERT INTO `inquiries` VALUES
(1, 1, 2, 'David Ochieng', '0722111222', 'david.ochieng@gmail.com', 'Hello, is this apartment available for move-in this weekend? Would love to view on Saturday.', '2026-09-28', 'phone', 'new', '2026-09-27 18:40:47', '2026-09-27 18:40:47'),
(2, 2, 2, 'Grace Wambui', '0733444555', 'grace.w@outlook.com', 'Interested in the maisonette. Are pets allowed and is the service charge included in the rent?', '2026-09-30', 'whatsapp', 'read', '2026-09-27 18:40:47', '2026-09-27 18:40:47');

-- Table structure for `notifications`
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `message` text NOT NULL,
  `type` enum('inquiry','booking','payment','property','promotion','system') DEFAULT 'system',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `notifications`
INSERT INTO `notifications` VALUES
(1, 2, 'Welcome to HomeFinder', 'Your landlord account is active. You can now list properties, receive inquiries, and manage bookings.', 'system', 0, '2026-09-27 18:40:48'),
(2, 2, 'New Inquiry Received', 'David Ochieng has inquired about Executive 2 Bedroom Furnished Apartment with Pool.', 'inquiry', 0, '2026-09-27 18:40:48');

-- Table structure for `payments`
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `property_id` int(11) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'KES',
  `payment_method` varchar(50) DEFAULT 'M-Pesa',
  `package_name` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) NOT NULL,
  `external_reference` varchar(150) NOT NULL,
  `transaction_reference` varchar(150) DEFAULT NULL,
  `payhero_reference` varchar(150) DEFAULT NULL,
  `status` enum('pending','completed','failed','cancelled') DEFAULT 'pending',
  `callback_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`callback_data`)),
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `external_reference` (`external_reference`),
  KEY `fk_payment_property` (`property_id`),
  KEY `idx_payment_user` (`user_id`),
  KEY `idx_payment_status` (`status`),
  CONSTRAINT `fk_payment_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `properties`
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `landlord_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `property_type` enum('bedsitter','studio','apartment','house','townhouse','bungalow','maisonette','villa') NOT NULL,
  `listing_type` enum('rent','sale') DEFAULT 'rent',
  `price` decimal(12,2) NOT NULL,
  `bedrooms` int(11) DEFAULT 0,
  `bathrooms` int(11) DEFAULT 0,
  `property_size` decimal(10,2) DEFAULT NULL,
  `furnished` tinyint(1) DEFAULT 0,
  `county` varchar(100) NOT NULL,
  `town` varchar(100) NOT NULL,
  `estate` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `availability_status` enum('available','occupied','available_soon') DEFAULT 'available',
  `available_from` date DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `rejection_reason` text DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT 0,
  `featured_until` datetime DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_property_location` (`county`,`town`,`estate`),
  KEY `idx_property_price` (`price`),
  KEY `idx_property_type` (`property_type`),
  KEY `idx_property_listing_type` (`listing_type`),
  KEY `idx_property_status` (`verification_status`),
  KEY `idx_property_featured` (`is_featured`),
  KEY `idx_property_landlord` (`landlord_id`),
  CONSTRAINT `fk_property_landlord` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `properties`
INSERT INTO `properties` VALUES
(1, 2, 'Executive 2 Bedroom Furnished Apartment with Pool', 'Stunning, sunlit 2 bedroom apartment located in the prime heart of Westlands along Rhapta Road. Features an open-plan fitted kitchen, high-speed elevators, backup generator, heated pool, 24/7 manned security, CCTV surveillance, and borehole water backup. Walking distance to Sarit Centre and Westgate Mall.', 'apartment', 'rent', '75000.00', 2, 2, '110.00', 1, 'Nairobi', 'Westlands', 'Rhapta Road', 'Rhapta Road, Westlands, Nairobi', '-1.26420000', '36.79250000', 'available', '2026-09-27', 'approved', NULL, 1, '2026-10-27 18:40:45', 142, '2026-09-27 18:40:45', '2026-09-27 18:40:45'),
(2, 2, 'Charming 4 Bedroom Maisonette with Lush Garden', 'Expansive 4 bedroom all ensuite maisonette nestled in a private gated community in Karen. Sits on half an acre of manicured grounds with mature trees. Features a sunken living room with fireplace, family TV room, modern kitchen with pantry, detached DSQ for 2, perimeter electric fence, and solar water heating.', 'maisonette', 'rent', '180000.00', 4, 4, '380.00', 0, 'Nairobi', 'Karen', 'Karen End', 'Miotoni Road, Karen, Nairobi', '-1.32110000', '36.71180000', 'available', '2026-09-27', 'approved', NULL, 1, '2026-10-11 18:40:46', 98, '2026-09-27 18:40:46', '2026-09-27 18:40:46'),
(3, 3, 'Luxury 3 Bedroom Ocean View Villa in Nyali', 'Breathtaking coastal living! Beautifully furnished 3 bedroom villa with private infinity pool overlooking the Indian Ocean. Features air conditioning in all rooms, expansive verandah, gourmet kitchen, 24/7 security guard, and private beach access.', 'villa', 'rent', '120000.00', 3, 3, '260.00', 1, 'Mombasa', 'Nyali', 'Links Road', 'Beach Road, Nyali, Mombasa', '-4.04350000', '39.70280000', 'available', '2026-09-27', 'approved', NULL, 1, '2026-10-17 18:40:46', 215, '2026-09-27 18:40:46', '2026-09-27 18:40:46'),
(4, 2, 'Cozy & Affordable Bedsitter near TRM Mall', 'Convenient and clean bedsitter situated behind Thika Road Mall. Tiled floors, private balcony, instant shower, constant water supply, token electricity, and biometric entry. Close to public transport and shopping.', 'bedsitter', 'rent', '12000.00', 0, 1, '28.00', 0, 'Nairobi', 'Roysambu', 'Near TRM', 'Lumumba Drive, Roysambu, Nairobi', '-1.21980000', '36.88850000', 'available', '2026-09-27', 'approved', NULL, 0, NULL, 89, '2026-09-27 18:40:46', '2026-09-27 18:40:46'),
(5, 3, 'Modern 3 Bedroom Apartment overlooking Lake Victoria', 'Spacious apartment in prestigious Milimani estate with gentle breeze and views of Lake Victoria. Master ensuite, large kitchen, dedicated parking, perimeter electric wall, and solar water heating. Quiet and safe location.', 'apartment', 'rent', '45000.00', 3, 2, '140.00', 0, 'Kisumu', 'Kisumu Central', 'Milimani', 'Ring Road, Milimani, Kisumu', '-0.10220000', '34.75230000', 'available', '2026-09-27', 'approved', NULL, 0, NULL, 64, '2026-09-27 18:40:47', '2026-09-27 18:40:47'),
(6, 2, 'Brand New 3 Bedroom Bungalow in Nakuru Section 58', 'Newly built 3 bedroom standalone bungalow in peaceful Section 58, Nakuru. Features private compound with green lawn, modern finishes, granite kitchen tops, solar water heater, and borehole water.', 'bungalow', 'rent', '38000.00', 3, 2, '160.00', 0, 'Nakuru', 'Nakuru Town', 'Section 58', 'Section 58, Nakuru', '-0.29740000', '36.08270000', 'available', '2026-09-27', 'pending', NULL, 0, NULL, 5, '2026-09-27 18:40:47', '2026-09-27 18:40:47');

-- Table structure for `property_amenities`
DROP TABLE IF EXISTS `property_amenities`;
CREATE TABLE `property_amenities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `parking` tinyint(1) DEFAULT 0,
  `wifi` tinyint(1) DEFAULT 0,
  `water` tinyint(1) DEFAULT 0,
  `electricity` tinyint(1) DEFAULT 1,
  `security` tinyint(1) DEFAULT 0,
  `cctv` tinyint(1) DEFAULT 0,
  `borehole` tinyint(1) DEFAULT 0,
  `balcony` tinyint(1) DEFAULT 0,
  `garden` tinyint(1) DEFAULT 0,
  `swimming_pool` tinyint(1) DEFAULT 0,
  `gym` tinyint(1) DEFAULT 0,
  `lift` tinyint(1) DEFAULT 0,
  `laundry` tinyint(1) DEFAULT 0,
  `generator` tinyint(1) DEFAULT 0,
  `gated_community` tinyint(1) DEFAULT 0,
  `playground` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_amenities_property` (`property_id`),
  CONSTRAINT `fk_amenities_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `property_amenities`
INSERT INTO `property_amenities` VALUES
(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, '2026-09-27 18:40:46'),
(2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, '2026-09-27 18:40:46'),
(3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, '2026-09-27 18:40:46'),
(4, 4, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '2026-09-27 18:40:47'),
(5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, '2026-09-27 18:40:47'),
(6, 6, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, '2026-09-27 18:40:47');

-- Table structure for `property_details`
DROP TABLE IF EXISTS `property_details`;
CREATE TABLE `property_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `pets_allowed` tinyint(1) DEFAULT 0,
  `suitable_for_families` tinyint(1) DEFAULT 0,
  `suitable_for_students` tinyint(1) DEFAULT 0,
  `suitable_for_professionals` tinyint(1) DEFAULT 0,
  `parking_spaces` int(11) DEFAULT 0,
  `minimum_rental_period` int(11) DEFAULT 1,
  `house_rules` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_details_property` (`property_id`),
  CONSTRAINT `fk_details_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `property_details`
INSERT INTO `property_details` VALUES
(1, 1, 0, 1, 0, 1, 2, 6, 'No loud music after 10PM. Quiet residential compound.', '2026-09-27 18:40:46'),
(2, 2, 1, 1, 0, 1, 4, 12, 'Pets welcome. Maintain landscaping.', '2026-09-27 18:40:46'),
(3, 3, 1, 1, 0, 1, 3, 3, 'Smoking outside only. Respect ocean conservation rules.', '2026-09-27 18:40:46'),
(4, 4, 0, 0, 1, 1, 0, 1, 'Single occupancy preferred.', '2026-09-27 18:40:47'),
(5, 5, 0, 1, 0, 1, 1, 6, 'Family friendly building.', '2026-09-27 18:40:47'),
(6, 6, 1, 1, 0, 1, 2, 6, NULL, '2026-09-27 18:40:47');

-- Table structure for `property_images`
DROP TABLE IF EXISTS `property_images`;
CREATE TABLE `property_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_image_property` (`property_id`),
  CONSTRAINT `fk_image_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `property_images`
INSERT INTO `property_images` VALUES
(1, 1, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:45'),
(2, 1, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', 0, '2026-09-27 18:40:45'),
(3, 1, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', 0, '2026-09-27 18:40:45'),
(4, 2, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:46'),
(5, 2, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', 0, '2026-09-27 18:40:46'),
(6, 3, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:46'),
(7, 3, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', 0, '2026-09-27 18:40:46'),
(8, 4, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:46'),
(9, 5, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:47'),
(10, 6, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80', 1, '2026-09-27 18:40:47');

-- Table structure for `property_promotions`
DROP TABLE IF EXISTS `property_promotions`;
CREATE TABLE `property_promotions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `payment_id` int(11) NOT NULL,
  `package_name` varchar(100) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` enum('pending','active','expired','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_promotion_property` (`property_id`),
  KEY `fk_promotion_payment` (`payment_id`),
  CONSTRAINT `fk_promotion_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_promotion_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `reports`
DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `reporter_name` varchar(100) DEFAULT NULL,
  `reporter_phone` varchar(20) DEFAULT NULL,
  `reporter_email` varchar(150) DEFAULT NULL,
  `reason` enum('fake_listing','wrong_information','scam','duplicate_listing','inappropriate_content','other') NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','investigating','resolved','dismissed') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reports_property` (`property_id`),
  CONSTRAINT `fk_report_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for `users`
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('landlord','agent','admin') NOT NULL DEFAULT 'landlord',
  `profile_image` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `users`
INSERT INTO `users` VALUES
(1, 'HomeFinder Administrator', 'admin@homefinder.co.ke', '0700000000', '$2b$12$1o2MQxfkWmyTXF51FzAhg.4dnGmy/dhopaoQ52cNtxt.rTExq7AIa', 'admin', NULL, NULL, 1, 1, '2026-09-27 17:40:10', '2026-09-27 18:40:45'),
(2, 'Akinyi Kamau', 'landlord@homefinder.co.ke', '0712345678', '$2b$12$4lpeiftZoGz2i8BS9xjOeuckOkKvlXpOc9Et.9RdOOlpKykHTvm2W', 'landlord', NULL, NULL, 1, 1, '2026-09-27 17:40:11', '2026-09-27 18:40:45'),
(3, 'Mwangi Properties Agency', 'agent@homefinder.co.ke', '0722334455', '$2b$12$PZpmCMPqva9yLq1cqewN/OmgaLd2IYSZa0ChsipAPMNf64CbeLLPK', 'agent', NULL, NULL, 1, 1, '2026-09-27 18:40:45', '2026-09-27 18:40:45');

-- Table structure for `viewing_bookings`
DROP TABLE IF EXISTS `viewing_bookings`;
CREATE TABLE `viewing_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `property_id` int(11) NOT NULL,
  `landlord_id` int(11) NOT NULL,
  `seeker_name` varchar(100) NOT NULL,
  `seeker_phone` varchar(20) NOT NULL,
  `seeker_email` varchar(150) DEFAULT NULL,
  `viewing_date` date NOT NULL,
  `viewing_time` time NOT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_booking_landlord` (`landlord_id`),
  KEY `idx_booking_property` (`property_id`),
  CONSTRAINT `fk_booking_landlord` FOREIGN KEY (`landlord_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_booking_property` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `viewing_bookings`
INSERT INTO `viewing_bookings` VALUES
(1, 1, 2, 'Brian Kiprop', '0711999888', 'brian.kip@gmail.com', '2026-10-20', '14:00:00', 'I would like to view the apartment on Wednesday afternoon.', 'pending', '2026-09-27 18:40:48', '2026-09-27 18:40:48');

SET FOREIGN_KEY_CHECKS = 1;
