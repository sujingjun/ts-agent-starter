-- 可选；先确认数据库已安装 pgvector 扩展。此表不是默认内存检索的自动替代。
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS evidence_vectors (
  tenant_id text NOT NULL,
  id text NOT NULL,
  embedding_model text NOT NULL,
  content text NOT NULL,
  source text NOT NULL,
  embedding vector NOT NULL,
  dimensions integer NOT NULL,
  PRIMARY KEY(tenant_id,id,embedding_model),
  CHECK(vector_dims(embedding)=dimensions)
);
-- 小数据先使用精确检索；固定模型和维度后再建立适合该维度的近似索引。
