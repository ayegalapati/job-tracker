CREATE TABLE IF NOT EXISTS applications (
  id           SERIAL PRIMARY KEY,
  company      VARCHAR(120) NOT NULL,
  role         VARCHAR(120) NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'applied'
               CHECK (status IN ('wishlist', 'applied', 'interview', 'offer', 'rejected')),
  location     VARCHAR(120),
  url          TEXT,
  notes        TEXT,
  applied_date DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status);
