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

## 알아두어야 할 점

- **동일 출처(same-origin) 파일만 저장했습니다.** Google Fonts, Kakao SDK 등 외부 CDN 스크립트는 원본 HTML에 있는 CDN 주소 그대로 남아 있고, 파일로 내려받지 않았습니다 (원래도 그쪽 서버가 서빙하는 리소스이기 때문입니다).
- **`index.html`과 `login/index.html`이 완전히 동일합니다.** 실제 서버가 그렇게 응답했습니다 — 알려지지 않은 경로를 홈 화면으로 폴백 처리하는 것으로 보입니다. `favicon.ico`, `manifest.json`, `manifest.webmanifest` 요청도 실제로는 `Content-Type: text/html`로 홈 화면 내용을 그대로 반환해서(진짜 파일이 아님), 백업에서 제외했습니다.
- **페이지별 HTML 용량 차이가 큽니다** (약 10KB ~ 1.5MB). 사이트 자체가 페이지별로 데이터·이미지를 인라인(base64 등)으로 담고 있는 구조라서 그렇습니다 — 이 저장소는 그 구조를 그대로 백업한 것이며, 재구성/정리는 하지 않았습니다.
- **서버 쪽 소스(관리자 페이지, DB, 백엔드 로직 등)는 포함되어 있지 않습니다.** 접속 권한이 없어 브라우저에 실제로 내려오는 화면 코드만 백업할 수 있었습니다.
