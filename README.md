# moobinso.com — 배포 사이트 백업

`https://www.moobinso.com`에서 실제로 서비스되고 있는 화면 코드를 그대로 미러링한 스냅샷입니다.
직접 다시 작성한 코드가 아니라, 서버가 응답한 HTML/CSS/JS/이미지 원본을 그대로 받아온 것입니다.

- 수집 일시: 2026-09-18
- 수집 방법: `mirror-scripts/mirror.js` (Node.js, sitemap.xml 기준으로 전체 페이지 크롤링 후 동일 출처 자산 다운로드)
- 수집 대상: `robots.txt`에 크롤링 허용(`Allow: /`)된 공개 페이지만 대상으로 함

## 폴더 구조 (`site/`)

사이트의 URL 경로를 그대로 디렉터리 구조로 옮겼습니다.

| 경로 | 페이지 |
|---|---|
| `/` | 홈 |
| `/guide/` | 관련상품/서비스 소개 |
| `/guide/faq/` | FAQ |
| `/funeral-halls/` | 장례식장 찾기 |
| `/funeral-service/` | 추모식 안내 |
| `/funeral-service/reserve/` | 추모식 예약 |
| `/memorial/` | 추모식장 안내 |
| `/memorial/venues/` | 추모식장 찾기 |
| `/support/`, `/support/additional/` | 고객센터 |
| `/obituary/` | 모바일부고 만들기 |
| `/prepaid-analysis/` | 선불상조 계약분석 |
| `/life-ten-shots/` | 인생열컷 자서전 |
| `/farewell-note/` | 나의 이별 노트 |
| `/reviews/` | 고객후기 |
| `/consult/` | 상담신청 |
| `/signup/` | 회원가입 |
| `/login/` | 로그인 |
| `/mypage/` | 마이페이지 |
| `/about/` | 회사 소개 |
| `assets/style.css`, `assets/app.js` | 공용 스타일/스크립트 |
| `assets/images/*.{jpg,png,webp}` | 원래 각 페이지 HTML에 base64로 인라인되어 있던 사진들 (파일로 분리, 내용 해시로 중복 제거) |

## 알아두어야 할 점

- **동일 출처(same-origin) 파일만 저장했습니다.** Google Fonts, Kakao SDK 등 외부 CDN 스크립트는 원본 HTML에 있는 CDN 주소 그대로 남아 있고, 파일로 내려받지 않았습니다 (원래도 그쪽 서버가 서빙하는 리소스이기 때문입니다).
- **`index.html`과 `login/index.html`이 완전히 동일합니다.** 실제 서버가 그렇게 응답했습니다 — 알려지지 않은 경로를 홈 화면으로 폴백 처리하는 것으로 보입니다. `favicon.ico`, `manifest.json`, `manifest.webmanifest` 요청도 실제로는 `Content-Type: text/html`로 홈 화면 내용을 그대로 반환해서(진짜 파일이 아님), 백업에서 제외했습니다.
- **인라인 이미지는 파일로 분리했습니다.** 원본 사이트는 사진을 `data:image/...;base64,...` 형태로 HTML 안에 직접 박아 넣는 구조라서, 홈 페이지 하나가 1.5MB에 달했습니다. `mirror.js`가 이런 base64 이미지를 감지해 `assets/images/`에 실제 파일(같은 사진은 내용 해시로 중복 제거)로 저장하고, HTML에서는 그 파일 경로만 참조하도록 바꿨습니다. 픽셀 내용은 원본과 완전히 동일하고, HTML은 페이지당 10~23KB 수준으로 줄어 사람이 읽고 diff로 비교하기 쉬워졌습니다.
- **서버 쪽 소스(관리자 페이지, DB, 백엔드 로직 등)는 포함되어 있지 않습니다.** 접속 권한이 없어 브라우저에 실제로 내려오는 화면 코드만 백업할 수 있었습니다.

## 자동 백업 (GitHub Actions)

`.github/workflows/mirror.yml`이 매일 1회(UTC 19:00 = KST 04:00) 자동으로:

1. `mirror-scripts/mirror.js`를 다시 실행해 `site/`를 최신 상태로 재수집하고
2. 이전 커밋과 달라진 내용이 있으면 자동으로 커밋·push합니다.

**주의: 이 저장소는 사이트를 배포하는 곳이 아니라, 사이트의 변경 이력을 기록하는 용도입니다.**
즉 이 저장소의 파일을 고쳐서 push해도 실제 moobinso.com에는 아무 영향이 없습니다 (moobinso.com은 별도의 에디터/빌더에서 직접 수정해야 합니다). 대신 실제 사이트가 언제 어떻게 바뀌었는지를 `git log` / `git diff`로 추적하고, 필요하면 과거 버전의 내용을 참고·복구하는 용도로 사용하세요.

Actions 탭에서 "Run workflow" 버튼으로 수동 실행도 가능합니다.
