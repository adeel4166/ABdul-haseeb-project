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

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  user_id INT NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  account_name VARCHAR(200) NOT NULL,
  opening_balance DECIMAL(14, 2) NOT NULL DEFAULT 0,
  target DECIMAL(14, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS entries (
  id CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  type ENUM('in', 'out') NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  entry_date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_entries_date (entry_date, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert the default Admin account
-- Password is 'abduladmin'. On first login, backend converts it to bcrypt hash.
INSERT INTO users (username, password, role) 
VALUES ('Adminabdul', 'abduladmin', 'admin')
ON DUPLICATE KEY UPDATE id = id;
