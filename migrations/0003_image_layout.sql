-- 상세페이지 이미지 가로 그리드 배치를 위한 레이아웃 값
-- full(1개, 기본값) / half(2개씩) / third(3개씩)
ALTER TABLE project_images ADD COLUMN layout TEXT NOT NULL DEFAULT 'full';
