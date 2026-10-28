// 두 서버 API가 함께 쓰는 "결과 만들기"예요: 종류가 정해지면 주의사항 목록을 붙여요.
// Design Ref: §4.5 응답 모양
import type { CategoryId, PropertyInfo } from "./types.ts";
import { getCategory } from "../data/categories.ts";
import { cautionsFor, tableCheckedAt, type CautionView } from "./cautions.ts";

export type CategoryResult = {
  category: { id: CategoryId; name: string };
  cautions: CautionView[];
  tableCheckedAt: string | null;
};

/** 종류와 물건 정보로 결과를 만들어요. 표가 준비 안 됐으면 TableIncompleteError가 나요. */
export function buildCategoryResult(categoryId: CategoryId, property: PropertyInfo): CategoryResult {
  const category = getCategory(categoryId);
  return {
    category: { id: categoryId, name: category ? category.name : categoryId },
    cautions: cautionsFor(categoryId, property),
    tableCheckedAt: tableCheckedAt(),
  };
}

/** 후보 id 목록에 화면용 이름을 붙여요. */
export function namedCandidates(ids: CategoryId[]): { id: CategoryId; name: string }[] {
  return ids.map((id) => ({ id, name: getCategory(id)?.name ?? id }));
}
