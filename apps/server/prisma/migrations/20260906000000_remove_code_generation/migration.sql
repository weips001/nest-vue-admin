-- Remove menus and permissions created by the code generation module.
DELETE FROM `sys_menu`
WHERE `path` = '/tool' OR `path` LIKE '/tool/%';

-- Remove persisted code generation data.
DROP TABLE IF EXISTS `auto_code`;
DROP TABLE IF EXISTS `temp`;
