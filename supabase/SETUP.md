# Piano Lab — connect to the shared LMS (선생님용 설치 안내)

Piano Lab은 Music Fundamentals와 **같은 Supabase 프로젝트(music-app)** 를 씁니다.
선생님·소유자·반·학생 계정이 **공유**되므로, 이미 승인된 선생님은 추가 승인 없이
Piano Lab도 바로 쓸 수 있습니다. 아래 두 SQL만 실행하면 연결이 끝납니다.

## 사전 조건
- Music Fundamentals LMS가 이미 설치되어 있어야 합니다 (01/02/03 SQL 실행 완료,
  소유자 계정 존재). 아직이라면 먼저 `music-fundamentals-v2/supabase/SETUP.md`를 완료하세요.

## 1) SQL 두 개 실행 (Supabase → SQL Editor → New query → 붙여넣고 Run)

1. `piano-lab/supabase/01-course-seed.sql`
   — 'piano-lab' 코스 + 8개 유닛 + 21개 레슨을 등록합니다. **덧붙이기(additive)라 기존
   데이터에 영향 없음.** (레슨을 추가/수정하면 `tools/gen-lms-seed.js`로 다시 생성해
   이 파일을 갱신한 뒤 다시 Run 하세요.)
2. `piano-lab/supabase/02-functions.sql`
   — 코스별 반 현황을 보는 함수 하나(class_matrix_course)를 추가합니다. 기존 함수는
   건드리지 않습니다.

각각 "Success. No rows returned"가 나오면 정상입니다.

## 2) 배포
- `js/config.js`에는 이미 공유 Supabase URL + 공개 키가 들어 있습니다(공개돼도 안전).
- Piano Lab을 push하면(또는 이미 GitHub Pages 배포됨) 바로 작동합니다.

## 사용법 (Music Fundamentals와 동일)

- **다른 선생님 초대**: Music Fundamentals의 `owner.html`에서 이메일을 승인하면
  두 사이트 모두에서 사용 가능. (승인 목록은 코스가 아니라 조직 전체 기준)
- **반 만들기 / 학생 추가**: Piano Lab의 `teacher.html`
  — 여기서 만든 반은 자동으로 'piano-lab' 코스에 등록됩니다. Music Fundamentals 반과
  별개로 관리하세요(한 반 = 한 코스).
- **학생 로그인**: Piano Lab의 `student.html`에서 Class Code + Access Code 입력.
  **어느 기기에서 로그인해도 진도가 이어집니다.**

## 진도 계산 규칙 (Piano Lab)

| 반영됨 ✅ | 반영 안 됨 ❌ |
|---|---|
| Practice / Test에서 연습곡을 **완주**할 때마다 1회 기록 | Learn 모드 재생, 화면 건반 자유 연주 |
| — 연습곡을 끝까지 치면 "연습 1회"로 카운트 | 페이지 방문/체류 시간 |

- 레슨 안의 **모든 연습곡을 최소 1번씩 완주** → 그 레슨 **Completed**
- 선생님 대시보드에서 학생별로: 완료한 레슨 수, **총 연습 횟수**(몇 번 쳤는지),
  마지막 활동일, 레슨별 상세를 확인할 수 있습니다.
  → "1·2·4번 배정, 완료했거나 5번 이상 쳤는지"를 이 값으로 판단하시면 됩니다.

## 테스트 (선택)
- Music Fundamentals의 데모 시드로 만든 가짜 학생, 또는 teacher.html에서 실제 학생을
  하나 추가 → 그 코드로 Piano Lab student.html 로그인 → 아무 레슨을 Practice로 완주 →
  teacher.html에서 그 학생의 연습 횟수가 오르는지 확인.

## 안전성
- 이 연결은 **덧붙이기 전용**입니다. 새 코스·새 함수만 추가하고 Music Fundamentals의
  테이블·함수는 전혀 수정하지 않으므로, 기존 이론 수업 데이터에 영향이 없습니다.
