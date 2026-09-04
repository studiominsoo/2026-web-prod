-- 스크롤 트리거 팝업(연계 작업물 / 숨겨진 메모 이미지)
CREATE TABLE project_popups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trigger_after_image INTEGER NOT NULL DEFAULT 1, -- 몇 번째 이미지(1부터) 지점에 나타나는지
  side TEXT NOT NULL DEFAULT 'right',              -- 'left' | 'right'
  type TEXT NOT NULL DEFAULT 'memo',               -- 'link' | 'memo'
  image_url TEXT NOT NULL,
  link_project_id TEXT REFERENCES projects(id),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
