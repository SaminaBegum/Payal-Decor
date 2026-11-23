CREATE TABLE IF NOT EXISTS public.work_orders (
  id SERIAL PRIMARY KEY,
  work_order_no VARCHAR(50) NOT NULL UNIQUE,
  sales_order_id INTEGER,
  sales_order_no VARCHAR(50),
  customer_name VARCHAR(200) NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'Medium',
  status VARCHAR(30) DEFAULT 'Draft',
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
