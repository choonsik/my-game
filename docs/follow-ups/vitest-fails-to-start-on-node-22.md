# vitest가 Node 22에서 worker를 시작하지 못한다

**Symptom**: `bun run test`(vitest 5.1.0)가 테스트 파일을 하나도 실행하지 못하고 `Failed to start forks worker`로 끝난다. 기존 `app/page.test.tsx`, `lib/utils.test.ts`도 마찬가지다.

**Observed evidence**: 2026-11-19, Windows 11, `node -v` = v22.14.0(`C:\Program Files\nodejs`). 출력: `TypeError: Cannot read properties of undefined (reading 'bind')` at `node_modules/undici/lib/interceptor/decompress.js:78:30`. `bunx --bun vitest run`도 같은 오류.

**Suspected cause**: (추정) 프로젝트는 Node 26 기준(`docs/decisions/dependency-versions.md`, vitest 5 engines `>=26`)인데, 이 PC에는 Node 22만 있다. undici가 Node 22에 없는 API를 bind하려다 실패하는 것으로 보인다.

**What was tried**: 순수 로직 테스트는 `bun test <파일>`(bun 1.4.4 내장 러너, `vitest` import 호환)로 실행해 통과를 확인했다. jsdom이 필요한 컴포넌트 테스트와 `bun run test` 자체는 여전히 돌지 않는다. scratch에 휴대용 Node 26을 내려받는 시도는 세션 권한 규칙에 막혔다.

**Proposed next step**: 이 PC에 Node 26을 설치(또는 fnm/volta로 전환)한 뒤 `node -v`가 v26인지 확인하고 `bun run test`를 다시 실행한다.
