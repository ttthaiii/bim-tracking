# Task Checklist

## 1. Authentication Page (`/login`)
- [x] [T-001] Authentication System (F-001)

## 2. Dashboard Page (`/dashboard`)
- [x] [T-002] Dashboard Implementation (F-002)
- [x] [T-016] Daily Report Dashboard Breakdown (F-009)
    - Implement Dashboard Tab and Filters
    - Implement Data Aggregation Service
    - Implement Summary Table
- [x] [T-017] Refine Daily Report Dashboard UI (F-009)
    - Separate Filters and Fixed Table Height
    - Infinite Scroll (Load 50)
    - Default Date Range (Current Month)
    - Column Sorting
- [x] [T-018] Default Assignee Filter (F-009)
    - Set default filter to current logged-in user

## 3. Daily Report Page (`/daily-report`)
- [x] [T-003] Daily Reporting System (F-003)
    - **Error Logs**:
        - **[T-003-EX-1]**: Data disappears after editing (Logic Error)
            1. **Root Cause**: `DailyReportPage` filters by *global* latest timestamp for the day, hiding unedited tasks with older timestamps.
            2. **Action**: Change logic to filter latest timestamp *per subtask*.
            3. **Status**: Fixed
        - **[T-003-EX-2]**: Data masked by client-side cache (Logic Error)
            1. **Root Cause**: Table initializes with empty placeholder which gets cached immediately. Data loader prioritizes this "empty cache" over slower API data.
            2. **Action**: Ignore cache if it only contains an unmodified placeholder.
            3. **Status**: Fixed
        - **[T-003-EX-3]**: Legacy data missing `subtaskId` field (Data Error)
            1. **Root Cause**: `DailyReportPage` strictly filters entries with `!subtaskId`. Some data (likely legacy or imported) might lack the `subtaskId` field in the document body, even though it exists in the document path.
            2. **Action**: Fallback to extracting `subtaskId` from the document path in `taskAssignService.ts`.
            3. **Status**: Fixed
        - **[T-003-EX-4]**: Refine Relate Drawing Format (UI Improvement)
            1. **Requirement**: Hide "N/A" for Item field if it is empty; show only up to Subtask Name.
            2. **Action**: Update string generation logic in `DailyReportPage.tsx` and `SubtaskAutocomplete.tsx`. (Fixed variable shadowing bug).
            3. **Status**: Fixed
        - **[T-003-EX-5]**: Daily Report Error Handling (UX/Network)
            1. **Root Cause**: Generic error message ("โค้ดผิดพลาด") in UI and hardcoded "Error fetching data" string masking the actual Firestore error. Firestore connection is flaky ("unavailable").
            2. **Action**:
                - Update `DailyReportPage.tsx` to display dynamic error messages.
                - Pass actual catch error to state.
                - Investigate `firebase.ts` for potential connection optimizations.
            3. **Status**: Fixed
        - **[T-003-EX-6]**: Employee Loading Performance (Performance)
            1. **Root Cause**: Suspected inefficient data fetching or lack of caching for employee list. `getUsers` fetches all users every time.
            2. **Action**: Optimize `useEmployeeOptions` hook (implement caching or memoization) and check `EmployeeAutocomplete` rendering.
            3. **Status**: Fixed
        - **[T-003-EX-7]**: Global Loading Overlay (UX)
            1. **Requirement**: User reports slow initial load (caching helps subsequent loads only). Request for "Blur Screen + Spinner" on all data-heavy pages.
            2. **Action**:
                - Create reusable `LoadingOverlay` component.
                - Integrate into `DailyReportPage`.
            3. **Status**: Fixed
        - **[T-003-EX-8]**: Daily Report Data Fetching Optimization (Performance)
            1. **Root Cause**: Sequential `await` loop in `fetchAvailableSubtasksForEmployee` (N+1 problem) causing slow loading times.
            2. **Action**: Refactor to use `Promise.all` for parallel subtask validation.
            3. **Status**: Fixed
        - **[T-003-EX-9]**: Production Deployment Failure
            1. **Root Cause**: Firebase App Hosting detected custom build command warning ("your build command is NOT 'next build'"). `package.json` uses `next build --turbopack` which might not be supported in production.
            2. **Action**: Revert to standard `next build` command in `package.json`.
            3. **Status**: Fixed

## 4. Project Management Page (`/projects`)
- [x] [T-004] Project Management System (F-004)
    - **Error Logs**:
        - **[T-004-EX-1]**: Double Submission on Save
            1. **Root Cause**: `confirmSave` closes modal immediately and lacks `isSaving` guard.
            2. **Action**: Implement `isSaving` state and disable buttons.
            3. **Status**: Fixed

## 5. Task Management Page (`/tasks`)
- [x] [T-005] Task Management System (F-005)
- [x] [T-011] Implement "All Assign" Filter (F-008)
- [x] [T-012] Set "All Assign" as Default (F-008)
- [x] [T-013] Add Due Date Column (F-009)
    - **Error Logs**:
        - **[T-013-EX-1]**: Parsing ecmascript source code failed
            1. **Root Cause**: Garbage text in component structure.
            2. **Status**: Fixed
- [x] [T-014] Implement Table Sorting (F-009)
- [x] [T-015] Implement Task Filters (F-009)
    - **Error Logs**:
        - **[T-011-EX-1]**: Syntax Error (Unexpected EOF)
            1. **Root Cause**: Incomplete file write.
            2. **Status**: Fixed

## 6. Task Assignment Page (`/task-assignment`)
- [x] [T-006] Task Assignment Features (F-006)

## 7. Document Tracking Page (`/document-tracking`)
- [x] [T-007] Document Tracking Features (F-007)

## General & Documentation
- [x] [T-008] Initialize Spec-Kit Artifacts
- [x] [T-009] Reverse Engineer Documentation
- [ ] [T-010] Verify Documentation Accuracy
- [ ] [T-009] Final Verification and Handover
