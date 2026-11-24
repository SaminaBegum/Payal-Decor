CREATE SEQUENCE IF NOT EXISTS installation_no_seq START 1;

CREATE TABLE IF NOT EXISTS installations (
  id SERIAL PRIMARY KEY,
  installation_no VARCHAR(30) UNIQUE NOT NULL,
  dispatch_no VARCHAR(50),
  work_order_no VARCHAR(50),
  customer_id VARCHAR(50),
  customer_name VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  site_address TEXT NOT NULL,
  installer_name VARCHAR(255),
  installer_phone VARCHAR(30),
  scheduled_date DATE,
  completed_date DATE,
  signed_off_by VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
