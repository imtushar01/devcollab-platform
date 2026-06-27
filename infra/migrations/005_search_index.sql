CREATE TABLE search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_search_documents_entity ON search_documents(entity_type, entity_id);
CREATE INDEX idx_search_documents_type ON search_documents(entity_type);