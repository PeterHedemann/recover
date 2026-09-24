-- CreateTable
CREATE TABLE `Upload` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `status` ENUM('queued', 'processing', 'finished', 'failed') NOT NULL DEFAULT 'queued',
    `stage` VARCHAR(40) NULL,
    `title` VARCHAR(500) NULL,
    `author` VARCHAR(500) NULL,
    `error` VARCHAR(500) NULL,
    `metadataWarning` VARCHAR(500) NULL,
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `processingToken` VARCHAR(36) NULL,
    `leaseExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,

    INDEX `Upload_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Upload_userId_status_leaseExpiresAt_idx`(`userId`, `status`, `leaseExpiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UploadImage` (
    `id` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(36) NOT NULL,
    `kind` ENUM('original', 'result', 'thumbnail') NOT NULL,
    `mimeType` VARCHAR(40) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `byteSize` INTEGER NOT NULL,
    `data` MEDIUMBLOB NOT NULL,

    UNIQUE INDEX `UploadImage_uploadId_kind_key`(`uploadId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyUsage` (
    `userId` VARCHAR(191) NOT NULL,
    `day` VARCHAR(10) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`userId`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Upload` ADD CONSTRAINT `Upload_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UploadImage` ADD CONSTRAINT `UploadImage_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `Upload`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyUsage` ADD CONSTRAINT `DailyUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

