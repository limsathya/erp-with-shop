-- Migration: add Store and Visit entities, link optional store to User/Invoice, add shop password to Customer

-- Add unique constraint to Customer.email (required for shop auth lookups)
ALTER TABLE `Customer` ADD COLUMN `password` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `Customer_email_key`(`email`);

-- Create Store table
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Store_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add optional store to User
ALTER TABLE `User` ADD COLUMN `storeId` VARCHAR(191) NULL,
    ADD INDEX `User_storeId_idx`(`storeId`);

-- Add optional store to Invoice
ALTER TABLE `Invoice` ADD COLUMN `storeId` VARCHAR(191) NULL,
    ADD INDEX `Invoice_storeId_idx`(`storeId`);

-- Add foreign keys for Store relations
ALTER TABLE `User` ADD CONSTRAINT `User_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create Visit table (customerId is required, not nullable)
CREATE TABLE `Visit` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NULL,
    `status` ENUM('SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduledAt` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Visit_customerId_idx`(`customerId`),
    INDEX `Visit_storeId_idx`(`storeId`),
    INDEX `Visit_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add Visit foreign keys
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Visit` ADD CONSTRAINT `Visit_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
