-- D1 초기 스키마. Cloudflare 대시보드의 D1 Console에 그대로 붙여넣거나,
-- wrangler d1 execute로 실행합니다.
-- taxonomy_types를 별도 테이블로 둬서, 나중에 "연도"/"매체" 외 세 번째 분류
-- 기준(예: 클라이언트)이 생겨도 테이블 구조를 바꾸지 않고 행만 추가하면 됩니다.

CREATE TABLE taxonomy_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_id INTEGER NOT NULL REFERENCES taxonomy_types(id),
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meta TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE project_categories (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);

CREATE TABLE project_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO taxonomy_types (key, label, sort_order) VALUES ('year', '연도', 0), ('media', '매체', 1);
