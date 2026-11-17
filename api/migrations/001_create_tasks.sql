CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
