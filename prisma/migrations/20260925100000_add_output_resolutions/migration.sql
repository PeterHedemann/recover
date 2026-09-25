ALTER TABLE `Upload`
    ADD COLUMN `outputWidth` INTEGER NULL,
    ADD COLUMN `outputHeight` INTEGER NULL;

CREATE TABLE `OutputResolution` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OutputResolution_userId_idx`(`userId`),
    UNIQUE INDEX `OutputResolution_userId_width_height_key`(`userId`, `width`, `height`),
    PRIMARY KEY (`id`),
    CONSTRAINT `OutputResolution_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `OutputResolution` (`id`, `userId`, `name`, `width`, `height`)
SELECT CONCAT('d_', SUBSTRING(SHA2(`id`, 256), 1, 32)), `id`, '1072 × 1448 px', 1072, 1448 FROM `user`;

UPDATE `Upload` SET `outputWidth` = 1072, `outputHeight` = 1448;
