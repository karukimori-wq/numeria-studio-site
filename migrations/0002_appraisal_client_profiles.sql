-- Store lightweight appraisal client profiles for selection in the workspace.

ALTER TABLE usage_records
  ADD COLUMN appraisal_client_profiles_json TEXT NOT NULL DEFAULT '[]';
