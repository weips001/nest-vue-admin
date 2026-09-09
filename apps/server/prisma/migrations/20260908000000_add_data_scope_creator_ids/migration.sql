-- Add stable creator IDs for data-scope filtering.
-- Historical create_by values are retained as display/audit fields.

ALTER TABLE `sys_user`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `sys_user_create_by_id_idx` (`create_by_id`);

ALTER TABLE `sys_post`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `sys_post_create_by_id_idx` (`create_by_id`);

ALTER TABLE `file_upload`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `file_upload_create_by_id_idx` (`create_by_id`);

ALTER TABLE `sys_notice`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `sys_notice_create_by_id_idx` (`create_by_id`);

ALTER TABLE `sys_todo`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `sys_todo_create_by_id_idx` (`create_by_id`);

ALTER TABLE `sys_job`
  ADD COLUMN `create_by_id` VARCHAR(36) NULL,
  ADD INDEX `sys_job_create_by_id_idx` (`create_by_id`);

-- Resolve historical values in this order: user ID, userName, unique nickName.
-- Duplicate nickNames are intentionally left NULL for manual reconciliation.

UPDATE `sys_user` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;

UPDATE `sys_post` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;

UPDATE `file_upload` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;

UPDATE `sys_notice` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;

UPDATE `sys_todo` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;

UPDATE `sys_job` AS target
LEFT JOIN `sys_user` AS by_id ON by_id.`id` = target.`create_by`
LEFT JOIN `sys_user` AS by_name ON by_name.`user_name` = target.`create_by`
LEFT JOIN (
  SELECT `nick_name`, MIN(`id`) AS `id`
  FROM `sys_user`
  GROUP BY `nick_name`
  HAVING COUNT(*) = 1
) AS by_nick ON by_nick.`nick_name` = target.`create_by`
SET target.`create_by_id` = COALESCE(by_id.`id`, by_name.`id`, by_nick.`id`)
WHERE target.`create_by` IS NOT NULL
  AND target.`create_by_id` IS NULL;
