-- 3. 분류체계 정렬을 위한 sort_order는 기존 컬럼 재사용 (스키마 변경 불필요)
-- 4. 메타데이터를 자유롭게 추가/삭제/순서변경 가능한 목록으로 분리
CREATE TABLE project_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 기존 projects.meta(문자열 하나)를 project_meta의 첫 줄로 이전
INSERT INTO project_meta (project_id, value, sort_order)
SELECT id, meta, 0 FROM projects WHERE meta IS NOT NULL AND meta != '';

-- 5. 대표 이미지
ALTER TABLE projects ADD COLUMN cover_image_url TEXT;

-- 6. 이미지/영상 구분
ALTER TABLE project_images ADD COLUMN media_type TEXT NOT NULL DEFAULT 'image';
