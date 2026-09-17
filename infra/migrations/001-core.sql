CREATE TABLE IF NOT EXISTS agent_runs (
  tenant_id text NOT NULL,
  id uuid NOT NULL,
  session_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('queued','running','waiting_approval','reconciliation_required','completed','failed','cancelled')),
  revision integer NOT NULL CHECK(revision >= 0),
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,id)
);
CREATE INDEX IF NOT EXISTS agent_runs_session_idx ON agent_runs(tenant_id,session_id,created_at DESC);
CREATE TABLE IF NOT EXISTS agent_jobs (
  tenant_id text NOT NULL,
  run_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('pending','active','blocked','done')),
  owner text,
  lease_until timestamptz,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY(tenant_id,run_id),
  FOREIGN KEY(tenant_id,run_id) REFERENCES agent_runs(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS agent_jobs_ready_idx ON agent_jobs(status,available_at);
