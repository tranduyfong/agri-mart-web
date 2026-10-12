CREATE DATABASE IF NOT EXISTS do_an_tot_nghiep 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE do_an_tot_nghiep;

-- Nhóm 1: Quản lý File
CREATE TABLE `files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `owner_id` BIGINT UNSIGNED NULL COMMENT 'Người tải lên',
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Nhóm 2: Tài khoản & Phân quyền
CREATE TABLE `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(80) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `role_permissions` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`)
) ENGINE=InnoDB;

CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `email` VARCHAR(254) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `status` ENUM('ACTIVE', 'LOCKED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
  `avatar_file_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `user_addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `recipient_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `address_line` VARCHAR(500) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

-- Nhóm 3: Đa cơ sở & Logistics
CREATE TABLE `branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(40) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(500) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `staff_branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `branch_stock` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `stock_quantity` DECIMAL(14,3) NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_branch_variant` (`branch_id`, `variant_id`)
) ENGINE=InnoDB;

CREATE TABLE `suppliers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(60) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(30) NULL
) ENGINE=InnoDB;

CREATE TABLE `goods_receipts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `supplier_id` BIGINT UNSIGNED NULL,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `note` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `goods_receipt_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `receipt_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `unit_cost` DECIMAL(18,2) NOT NULL
) ENGINE=InnoDB;

-- Nhóm 4: Sản phẩm & Danh mục
CREATE TABLE `categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(180) NOT NULL UNIQUE,
  `image_file_id` BIGINT UNSIGNED NULL
) ENGINE=InnoDB;

CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(60) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` LONGTEXT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `product_variants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku` VARCHAR(80) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL COMMENT 'Quy cách: Khay 500g, Túi 1kg...',
  `list_price` DECIMAL(18,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE `product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `file_id` BIGINT UNSIGNED NOT NULL,
  `is_thumbnail` BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB;

-- Nhóm 5: Giỏ hàng & Đơn hàng
CREATE TABLE `carts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY `uk_user_branch_cart` (`user_id`, `branch_id`)
) ENGINE=InnoDB;

CREATE TABLE `cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `cart_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(60) NOT NULL UNIQUE,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(18,2) NOT NULL,
  `shipping_fee` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `final_amount` DECIMAL(18,2) NOT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `payment_method` ENUM('COD', 'VNPAY', 'MOMO') NOT NULL,
  `shipping_address` JSON NOT NULL COMMENT 'Lưu snapshot địa chỉ giao hàng',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(14,3) NOT NULL,
  `price` DECIMAL(18,2) NOT NULL
) ENGINE=InnoDB;

-- Nhóm 6: Marketing & AI Chat
CREATE TABLE `promotions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(60) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `discount_value` DECIMAL(18,2) NOT NULL,
  `discount_type` ENUM('PERCENT', 'AMOUNT') NOT NULL,
  `min_order_value` DECIMAL(18,2) NOT NULL DEFAULT 0,
  `valid_from` DATETIME NOT NULL,
  `valid_to` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `chat_rooms` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `assigned_staff_id` BIGINT UNSIGNED NULL,
  `status` ENUM('AI_ACTIVE', 'STAFF_ACTIVE', 'CLOSED') NOT NULL DEFAULT 'AI_ACTIVE',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `room_id` BIGINT UNSIGNED NOT NULL,
  `sender_type` ENUM('CUSTOMER', 'STAFF', 'AI') NOT NULL,
  `content` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `chat_message_attachments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `file_id` BIGINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

-- =========================================================================
-- 2. THIẾT LẬP CÁC KHÓA NGOẠI (FOREIGN KEYS)
-- =========================================================================

-- Khóa ngoại nhóm File
ALTER TABLE `files` ADD CONSTRAINT `fk_files_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Khóa ngoại nhóm Phân quyền & User
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`);
ALTER TABLE `users` ADD CONSTRAINT `fk_users_avatar` FOREIGN KEY (`avatar_file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL;
ALTER TABLE `user_addresses` ADD CONSTRAINT `fk_address_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;

-- Khóa ngoại nhóm Cơ sở & Logistics
ALTER TABLE `staff_branches` ADD CONSTRAINT `fk_sb_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
ALTER TABLE `staff_branches` ADD CONSTRAINT `fk_sb_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE;
ALTER TABLE `branch_stock` ADD CONSTRAINT `fk_bs_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE;
ALTER TABLE `branch_stock` ADD CONSTRAINT `fk_bs_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE;
ALTER TABLE `goods_receipts` ADD CONSTRAINT `fk_gr_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`);
ALTER TABLE `goods_receipts` ADD CONSTRAINT `fk_gr_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL;
ALTER TABLE `goods_receipts` ADD CONSTRAINT `fk_gr_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`);
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `fk_gri_receipt` FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts`(`id`) ON DELETE CASCADE;
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `fk_gri_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`);

-- Khóa ngoại nhóm Sản phẩm
ALTER TABLE `categories` ADD CONSTRAINT `fk_cat_image` FOREIGN KEY (`image_file_id`) REFERENCES `files`(`id`) ON DELETE SET NULL;
ALTER TABLE `products` ADD CONSTRAINT `fk_prod_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`);
ALTER TABLE `product_variants` ADD CONSTRAINT `fk_pv_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE;
ALTER TABLE `product_images` ADD CONSTRAINT `fk_pi_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE;
ALTER TABLE `product_images` ADD CONSTRAINT `fk_pi_file` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE;

-- Khóa ngoại nhóm Đơn hàng
ALTER TABLE `carts` ADD CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE;
ALTER TABLE `carts` ADD CONSTRAINT `fk_carts_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE;
ALTER TABLE `cart_items` ADD CONSTRAINT `fk_ci_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE;
ALTER TABLE `cart_items` ADD CONSTRAINT `fk_ci_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`);
ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`);
ALTER TABLE `order_items` ADD CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE;
ALTER TABLE `order_items` ADD CONSTRAINT `fk_oi_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`);

-- Khóa ngoại nhóm AI Chat
ALTER TABLE `chat_rooms` ADD CONSTRAINT `fk_cr_customer` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`);
ALTER TABLE `chat_rooms` ADD CONSTRAINT `fk_cr_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`);
ALTER TABLE `chat_rooms` ADD CONSTRAINT `fk_cr_staff` FOREIGN KEY (`assigned_staff_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;
ALTER TABLE `chat_messages` ADD CONSTRAINT `fk_cm_room` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE;
ALTER TABLE `chat_message_attachments` ADD CONSTRAINT `fk_cma_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages`(`id`) ON DELETE CASCADE;
ALTER TABLE `chat_message_attachments` ADD CONSTRAINT `fk_cma_file` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE;

-- CHỉnh sửa db
ALTER TABLE `users` 
ADD COLUMN `password_reset_token` VARCHAR(6) NULL AFTER `status`,
ADD COLUMN `password_reset_expires` DATETIME NULL AFTER `password_reset_token`;

INSERT INTO `roles` (`code`, `name`) VALUES 
('ADMIN', 'Quản trị viên hệ thống'),
('STAFF', 'Nhân viên cơ sở'),
('CUSTOMER', 'Khách hàng');

-- ==========================================
-- VÁ LỖ HỔNG TỪ ẢNH REVIEW
-- ==========================================

-- 1. Xác minh email khi đăng ký
ALTER TABLE `users`
ADD COLUMN `email_verify_token` VARCHAR(6) NULL AFTER `status`,
ADD COLUMN `email_verify_expires` DATETIME NULL AFTER `email_verify_token`,
ADD COLUMN `email_verified_at` DATETIME NULL AFTER `email_verify_expires`;

-- 2. Theo dõi thanh toán
ALTER TABLE `orders`
ADD COLUMN `payment_status` ENUM('UNPAID', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID' AFTER `payment_method`,
ADD COLUMN `transaction_code` VARCHAR(120) NULL COMMENT 'Mã giao dịch từ VNPay/MoMo' AFTER `payment_status`;

-- 3. Bán theo cân nặng & đơn vị tính
ALTER TABLE `product_variants`
ADD COLUMN `unit` VARCHAR(20) NOT NULL DEFAULT 'kg' COMMENT 'kg, gram, gói, hộp' AFTER `name`,
ADD COLUMN `step_quantity` DECIMAL(14,3) NOT NULL DEFAULT 1 COMMENT 'Bước nhảy số lượng (VD: 0.5kg)' AFTER `unit`;

-- 4. Quản lý lô hàng & Hạn sử dụng (Đặc thù Nông sản)
-- Thêm mã lô và hạn sử dụng vào lúc nhập kho
ALTER TABLE `goods_receipt_items`
ADD COLUMN `batch_code` VARCHAR(50) NOT NULL COMMENT 'Mã lô hàng' AFTER `variant_id`,
ADD COLUMN `manufactured_date` DATE NULL AFTER `unit_cost`,
ADD COLUMN `expiry_date` DATE NOT NULL AFTER `manufactured_date`;

-- Tách tồn kho theo từng Lô (thay vì gộp chung vào Variant)
ALTER TABLE `branch_stock`
ADD COLUMN `batch_code` VARCHAR(50) NOT NULL AFTER `variant_id`,
ADD COLUMN `expiry_date` DATE NOT NULL AFTER `batch_code`,
DROP INDEX `uk_branch_variant`, -- Xóa index cũ
ADD UNIQUE KEY `uk_branch_variant_batch` (`branch_id`, `variant_id`, `batch_code`);

-- 5. Xác định nhân viên gửi tin nhắn
ALTER TABLE `chat_messages`
ADD COLUMN `sender_id` BIGINT UNSIGNED NULL COMMENT 'ID của user/staff gửi tin, NULL nếu là AI' AFTER `sender_type`;

ALTER TABLE `chat_messages` ADD CONSTRAINT `fk_cm_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- 6. Phân biệt loại Khuyến mãi & Flash Sale
ALTER TABLE `promotions`
ADD COLUMN `promotion_scope` ENUM('PRODUCT', 'SHIPPING') NOT NULL DEFAULT 'PRODUCT' AFTER `discount_type`,
ADD COLUMN `is_flash_sale` BOOLEAN NOT NULL DEFAULT FALSE AFTER `promotion_scope`;

-- ==========================================
-- TẠO BẢNG MỚI ĐÁP ỨNG TÍNH NĂNG
-- ==========================================

-- 7. Liên kết Khuyến mãi với Sản phẩm cụ thể (Giải quyết review: chưa liên kết sản phẩm)
CREATE TABLE `promotion_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY `uk_promo_product` (`promotion_id`, `product_id`),
  CONSTRAINT `fk_pp_promo` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pp_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Ghi nhận lịch sử dùng mã giảm giá (Giải quyết review: chưa có lịch sử dùng mã)
CREATE TABLE `order_promotions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `promotion_id` BIGINT UNSIGNED NOT NULL,
  `discount_amount` DECIMAL(18,2) NOT NULL,
  CONSTRAINT `fk_op_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_op_promo` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`)
) ENGINE=InnoDB;

-- 9. Quảng cáo Banner (Giải quyết yêu cầu text 2.1)
CREATE TABLE `banners` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('POPUP', 'HOME_CAROUSEL') NOT NULL DEFAULT 'HOME_CAROUSEL',
  `title` VARCHAR(200) NOT NULL,
  `image_file_id` BIGINT UNSIGNED NOT NULL,
  `link_url` VARCHAR(500) NULL COMMENT 'Link trỏ về trang kết quả tìm kiếm/sản phẩm',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `starts_at` DATETIME NULL,
  `ends_at` DATETIME NULL,
  CONSTRAINT `fk_banner_file` FOREIGN KEY (`image_file_id`) REFERENCES `files`(`id`)
) ENGINE=InnoDB;

-- 10. Khởi tạo quyền cho nhân viên (bảng permissions đang rỗng nên STAFF chưa thêm được sản phẩm)
INSERT INTO `permissions` (`code`, `name`) VALUES
('PRODUCT_MANAGE', 'Quản lý sản phẩm và nhập hàng');

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r JOIN `permissions` p ON p.code = 'PRODUCT_MANAGE'
WHERE r.code = 'STAFF';
