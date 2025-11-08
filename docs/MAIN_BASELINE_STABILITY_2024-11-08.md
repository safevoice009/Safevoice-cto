# Main Baseline Stability Verification — 2024-11-08

- **Verifier:** cto.new automated agent
- **Baseline Commit:** `dbce1fdec3f96ce579de111451d9b534f5bf7271`
  - _Merge pull request #96 from safevoice009/feature/integrate-crisis-queue-service-supabase-tests_
- **Branches Compared:** local `main` == `origin/main`
- **Working Tree State:** clean; no merge markers or stray artefacts detected under `src/lib/resources`, `docs/`, or `public/`.

## Command Results

| Command | Status | Notes |
|---------|--------|-------|
| `npm ci` | ⚠️ Completed with warnings | Peer-dependency overrides required for React 19 (`react-remove-scroll`, `use-sync-external-store`). 39 known npm audit vulnerabilities remain. |
| `npx vitest run src/lib/__tests__/resources.test.ts` | ✅ Pass | 50 tests passing (dataset regression clean). |
| `npm run lint` | ❌ Fail | `src/lib/store.ts:6082:14` — unused `state` parameter triggers `@typescript-eslint/no-unused-vars`. |
| `npm run build` | ❌ Fail | TypeScript compilation breaks: missing `./crisisQueue` module import and multiple duplicate crisis queue store method definitions (`TS1117`). Related `emotionAnalysis` typings out of sync in integration test stubs. |
| `npm test` | ❌ Fail | Numerous failures in `src/components/wallet/__tests__/TransactionHistory.test.tsx` (UI expectations & recursive DOM append spy). |
| `npm run test:privacy` | ✅ Pass | All 29 privacy checks green.

## Observed Risks & Follow-ups

1. **Crisis Queue Store Integration** — Missing module export (`./crisisQueue`) and duplicated method entries block lint/build. Resolve before extending store functionality or rebasing feature branches.
2. **Wallet Transaction History Tests** — Repeated test failures (empty states, CSV export, running balance). UI or test fixtures need alignment to restore baseline.
3. **React 19 Peer Dependency Misalignment** — Downstream packages (`react-remove-scroll`, `use-sync-external-store`) still target React ≤18, producing override warnings; monitor before upgrading related dependencies.
4. **Outstanding Vulnerabilities** — `npm audit` reports 39 low/medium/high issues; plan remediation cycle to avoid compounding risk.

## Next Steps for Contributors

- Rebase feature branches onto commit `dbce1fdec3f96ce579de111451d9b534f5bf7271`.
- Treat the lint/build/test failures above as pre-existing; ensure fixes land early to unblock CI for future work.
- Retain this report as the reference baseline until a new stability verification is recorded.
