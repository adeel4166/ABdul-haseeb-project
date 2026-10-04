-- Abroad Fund — MySQL schema and the queries the API runs.
-- Run this once on the VPS, as a MySQL admin:
--   mysql -u root -p < schema.sql
--
-- Then create a user for the API (pick your own password):
--   CREATE USER 'abroad'@'localhost' IDENTIFIED BY 'change-me';
--   GRANT SELECT, INSERT, UPDATE, DELETE ON abroad_fund.* TO 'abroad'@'localhost';
--   FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS abroad_fund
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE abroad_fund;

CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  opening_balance DECIMAL(14, 2) NOT NULL,
  target DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS entries (
  id CHAR(36) NOT NULL,
  type ENUM('in', 'out') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  entry_date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_entries_date (entry_date, created_at)
);

INSERT INTO settings (id, revision, account_name, opening_balance, target)
VALUES (1, 0, 'Abroad Fund', 0, 0)
ON DUPLICATE KEY UPDATE id = id;

-- The API uses these statements. Values are always bound parameters, never pasted into the SQL.

-- Read the one shared account.
-- SELECT revision, account_name, opening_balance, target FROM settings WHERE id = 1 FOR UPDATE;

-- Read every entry.
-- SELECT id, type, amount, entry_date, category, note, created_at, updated_at FROM entries;

-- Save the account after a change. revision goes up by 1.
-- UPDATE settings SET revision = ?, account_name = ?, opening_balance = ?, target = ? WHERE id = 1;

-- Add or replace entries.
-- INSERT INTO entries (id, type, amount, entry_date, category, note, created_at, updated_at) VALUES ?;

-- Replace the whole ledger, or clear every entry. Settings stay on clear.
-- DELETE FROM entries;
