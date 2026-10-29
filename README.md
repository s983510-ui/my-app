# 공매 물건 주의사항 도우미 (my-app)

온비드 물건 정보를 붙여넣으면, 같은 종류의 공매 물건에서 조심해야 할 점과 참고할 절차·기관·법령을 정리해 주는 웹앱이에요.
기획은 [PRD.md](PRD.md), 계획은 [PLAN.md](PLAN.md), 설계는 [DESIGN.md](DESIGN.md)를 보세요.

> 참고용 안내이며 법률 자문이 아닙니다.

## 내 PC에서 실행하기

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 열어요. 실제 AI를 쓰려면 `my-app/.env`에 `OPENAI_API_KEY=...`를 넣어요.

### 시험 모드 (OpenAI 없이)

```bash
AI_STUB=1 SHOW_UNREVIEWED=1 RATE_LIMIT_PER_MINUTE=30 npm run dev -- -p 3300
```

- `AI_STUB=1`: AI 대신 정해진 규칙으로 흉내 내요. 글에 `[AI_FAIL]`을 넣으면 AI 실패를 흉내 내요.
- `SHOW_UNREVIEWED=1`: 검토 전 주의사항도 "검토 전 (시험용)" 표시와 함께 보여줘요.
- 세 값 모두 **내 PC 시험용**이에요. Vercel에는 넣지 않아요(운영에서는 자동으로 꺼지거나 오류가 나요).

## 시험하기

```bash
node --test tests/categories.test.mjs tests/caution-format.test.mjs tests/rules.test.mjs tests/data.test.mjs tests/samples.test.mjs tests/style.test.mjs
```

시험 모드 서버를 띄운 뒤 (위 명령):

```bash
BASE_URL=http://localhost:3300 node --test tests/api.test.mjs tests/ui.test.mjs
```

운영 모드 시험 (검토 전 항목이 운영에서 안 나가는지): 먼저 `npm run build` 후 운영 모드 서버를 따로 띄워요.

```bash
SHOW_UNREVIEWED=1 npm run start -- -p 3301
```

```bash
PROD_URL=http://localhost:3301 node --test tests/production.test.mjs
```

```bash
node scripts/eval.mjs http://localhost:3300 --local
```

## 주의사항 표 검토 (배포 전 필수)

```bash
node scripts/make-review-sheet.mjs
```

```bash
node scripts/check-release.mjs
```

- `docs/cautions-review.md`를 보며 항목을 검토하고, 맞으면 `data/cautions.ts`에서 `status`를 `"confirmed"`, `checkedAt`을 검토한 날로 바꿔요.
- 종류마다 필수 항목이 모두 검토되기 전에는, 운영 화면에서 그 종류의 결과가 "안내를 준비하지 못했어요"로 나와요.

## 실제 AI로 성공 기준 재기

작업 브랜치를 푸시해 Vercel 미리보기 주소가 생기면 (미리보기 환경에도 `OPENAI_API_KEY` 필요):

```bash
node scripts/eval.mjs https://<미리보기-주소>
```
