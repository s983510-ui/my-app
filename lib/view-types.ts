// 화면과 서버 API 응답이 함께 쓰는 모양이에요 (DESIGN §4.5 응답).
// 화면에서 불러도 안전하도록 형식(type)만 담아요.
import type { CategoryId, PropertyField } from "./types.ts";

export type CautionViewData = {
  id: string;
  title: string;
  plain: string;
  required: boolean;
  highlight: boolean;
  steps: string[];
  /** 현장에서 볼 점 (검토 전이면 빈 목록) */
  onSite: string[];
  agency: string;
  sources: { label: string; url: string }[];
  checkedAt: string;
  unreviewed: boolean;
};

export type NamedCategory = { id: CategoryId; name: string };

export type AnalyzeResponse = {
  masked: boolean;
  property: Partial<Record<PropertyField, string | null>>;
  aiFallback: boolean;
  category: NamedCategory | null;
  candidates: NamedCategory[] | null;
  cautions: CautionViewData[] | null;
  tableCheckedAt: string | null;
};

export type CautionsResponse = {
  category: NamedCategory;
  cautions: CautionViewData[];
  tableCheckedAt: string | null;
};

export type ErrorResponse = { error: { code: string; message: string } };
