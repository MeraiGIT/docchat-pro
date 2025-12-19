# Supabase Schema Documentation

## Documents Table

The `documents` table should have the following columns:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_count INTEGER, -- Optional: can be computed from document_chunks if not present
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX documents_user_id_idx ON documents(user_id);
CREATE INDEX documents_created_at_idx ON documents(created_at DESC);
```

## Document Chunks Table

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX document_chunks_embedding_idx ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

## Notes

- The `chunk_count` column in the `documents` table is **optional**. The application will work with or without it.
- If `chunk_count` is not present, it can be computed by counting rows in `document_chunks` table.
- The application code includes fallback logic to handle both cases automatically.

