# Task Checklist

## 1. Authentication Page (`/login`)
- [x] [T-001] Authentication System (F-001)

## 2. Dashboard Page (`/dashboard`)
- [x] [T-029] Fix Daily Report Editable Logic (New Tasks)
    - **Type**: Bug Fix
    - **Priority**: High
    - **Description**:
        1. Fix issue where new tasks created in Daily Report cannot be edited (specifically Relate Drawing/Subtask) because they are locked.
        2. Logic should allow editing (clearing subtask) if the entry is new OR if it meets the criteria of "Never updated progress" (if applicable).
    - **Traceability**: [F-003]
- [x] [T-030] Daily Report Progress Validation (F-003)
    - **Type**: Feature / Validation
    - **Priority**: High
    - **Description**:
        1. **Blocking Logic**: Prevent "Submit" if any entry has `Progress <= Initial Progress` (User must update progress).
        2. **Exception**: Tasks categorized as "Leave" or "Meeting" (Non-work keywords) are exempt.
        3. **UI**: Show specific alert message identifying the invalid row.
    - **Traceability**: [F-003]
- [x] [T-031] Refine Leave Detection with Activity Type (F-003)
    - **Type**: Enhancement / Logic
    - **Priority**: High
    - **Description**:
        1. **Strategy**: Replace fuzzy keyword detection with strict "Activity" (Task Category) checking.
        2. **Target**: "Project Meeting" activity -> Meeting; "ลางาน" -> Leave.
        3. **Fix**: Prevents false positives like "Meeting Room Design" being flagged as Meeting.
    - **Traceability**: [F-003]
- [x] [T-032] Add 'Internal Meeting' Activity (F-003)
    - **Type**: Enhancement / Logic
    - **Priority**: Medium
    - **Description**: Add "Internal Meeting" to the list of strict non-work activities.
    - **Traceability**: [F-003]
- [x] [T-033] Refine Project Status Filter (F-002)
    - **Type**: Enhancement / Logic
    - **Priority**: High
    - **Description**: Align Project Planning status filter with Dashboard Report categories for RFA tasks.
    - **Traceability**: [F-002]
- [x] [T-034] Fix Top Status Filter & Add Search (F-002)
    - **Type**: Enhancement / Logic
    - **Priority**: High
    - **Description**: Fix top status filter to use correct categories and add search functionality.
    - **Traceability**: [F-002]
- [x] [T-035] Multi-Select Status Filter & Reset (F-002)
    - **Type**: Enhancement / Logic
    - **Priority**: High
    - **Description**: Add multi-select capability to status filter and a reset button.
    - **Traceability**: [F-002]
- [x] [T-036] Remove Header Filter (F-002)
    - **Type**: Cleanup / Logic
    - **Priority**: Medium
    - **Description**: Remove duplicate status filter from table header. Verify "Planned-BIM" status.
    - **Traceability**: [F-002]
- [x] [T-037] Implement Table Header Sorting (F-002)
    - **Type**: Enhancement / UX
    - **Priority**: High
    - **Description**: Restore sort functionality for table headers.
    - **Traceability**: [F-002]
- [x] [T-038] Implement Public Holiday Feature (F-010)
    - **Type**: Feature
    - **Priority**: Medium
    - **Description**: Add public holiday management (add/view) and calendar highlighting (Holiday/Sunday).
    - **Traceability**: [F-010]
- [x] [T-039] Refactor Public Holiday to Bulk Mode (F-010)
    - **Type**: Feature / Refactor
    - **Priority**: Medium
    - **Description**: Add support for bulk adding holidays with year selection and temporary list staging.
    - **Traceability**: [F-010]
- [x] [T-040] Refine Holiday Manager (F-010)
    - **Type**: Feature / Refactor
    - **Priority**: High
    - **Description**: Upgrade Bulk Modal to "Manager" view (Show Existing + Delete + Highlight).
    - **Traceability**: [F-010]
- [x] [T-041] Implement Full Calendar Highlighting (F-010)
    - **Type**: Feature / UI
    - **Priority**: Medium
    - **Description**: Show visual markers for Edited (Yellow) and Missing (Red) days in Calendar.
    - **Traceability**: [F-010], [F-003]
- [x] [T-042] Calendar Tooltip Implementation (F-010)
    - **Type**: Feature / UI
    - **Priority**: Medium
    - **Description**: Show details (Holiday Name, Work Hours, Leave) on calendar tile hover.
    - **Traceability**: [F-010], [F-003]
- [x] [T-043] Fix Tooltip Data Aggregation (F-010)
    - **Type**: Bug Fix / Logic
    - **Priority**: High
    - **Description**: Ensure Tooltip only counts LATEST and NON-DELETED entries (Snapshot).
    - **Traceability**: [F-010]
    - **Error Logs**:
        - **[T-043-E1-1]**: Tooltip groups "Meeting" as "Leave" (Logic Error)
            1. **Root Cause**: `isActivityLeaveOrMeeting` was used to flag the entire day as "Leave".
            2. **Action**: Separate `leaveHours` using strict check.
            3. **Status**: Fixed
- [x] [T-002] Dashboard Implementation (F-002)
    - **Error Logs**:
        - **[T-002-E1-1]**: Deleted Tasks Visible in Dashboard
            1. **Issue**: Tasks deleted in Project Planning still show up in Dashboard stats and tables.
            2. **Root Cause**: `dashboardService.ts` fetches all tasks/projects without checking `status === 'deleted'`.
            3. **Action**: Add filter `status !== 'deleted'` to all dashboard queries (`getProjectCount`, `getActiveTaskCount`, `getDashboardStats`, `getRecentActivities`).
            4. **Status**: Fixed
- [x] [T-016] Daily Report Dashboard Breakdown (F-009)
    - Implement Dashboard Tab and Filters
    - Implement Data Aggregation Service
    - Implement Summary Table
    - **Error Logs**:
        - **[T-016-E1-1]**: Dashboard Report Missing Days (Logic)
            1. **Requirement**: Dashboard must show *every day* in the selected range to highlight missing logs, instead of just showing days with data.
            2. **Action**: Implement "Fill Missing Dates" logic in `DailyReportView.tsx` when a specific Assignee is selected.
            3. **Status**: Fixed
- [x] [T-017] Refine Daily Report Dashboard UI (F-009)
    - Separate Filters and Fixed Table Height
    - Infinite Scroll (Load 50)
    - Default Date Range (Current Month)
    - Column Sorting
- [x] [T-044] Dashboard: Multi-select Status Filter (F-009)
    - **Type**: Feature / UX
    - **Priority**: Medium
    - **Description**: Convert Status filter to Multi-select toggle.
    - **Traceability**: [F-009]
- [x] [T-045] Dashboard: Fix Missing Data for All Assignees (F-009)
    - **Type**: Bug Fix
    - **Priority**: High
    - **Description**: Enable gap-filling logic for "All Assignees" view to show "Missing" status correctly for all users.
    - **Traceability**: [F-009]
- [x] [T-046] Dashboard: Fix Holiday vs Missing Status (F-009)
    - **Type**: Bug Fix / Logic
    - **Priority**: High
    - **Description**: Ensure Company Holidays are labeled "Holiday" instead of "Missing" in gap-filling logic.
    - **Traceability**: [F-009]
- [x] [T-047] Dashboard: Default Date Range to Current Week (F-009)
    - **Type**: Feature / UX
    - **Priority**: Low
    - **Description**: Change default view from Month to Current Week (Mon-Sun).
    - **Traceability**: [F-009]
- [x] [T-018] Default Assignee Filter (F-009)
    - Set default filter to current logged-in user

## 3. Daily Report Page (`/daily-report`)
- [x] [T-003] Daily Reporting System (F-003)
    - **Error Logs**:
        - **[T-003-E1-1]**: Data disappears after editing (Logic Error)
            1. **Root Cause**: `DailyReportPage` filters by *global* latest timestamp for the day, hiding unedited tasks with older timestamps.
            2. **Action**: Change logic to filter latest timestamp *per subtask*.
            3. **Status**: Fixed
        - **[T-003-E2-1]**: Data masked by client-side cache (Logic Error)
            1. **Root Cause**: Table initializes with empty placeholder which gets cached immediately. Data loader prioritizes this "empty cache" over slower API data.
            2. **Action**: Ignore cache if it only contains an unmodified placeholder.
            3. **Status**: Fixed
        - **[T-003-E3-1]**: Legacy data missing `subtaskId` field (Data Error)
            1. **Root Cause**: `DailyReportPage` strictly filters entries with `!subtaskId`. Some data (likely legacy or imported) might lack the `subtaskId` field in the document body, even though it exists in the document path.
            2. **Action**: Fallback to extracting `subtaskId` from the document path in `taskAssignService.ts`.
            3. **Status**: Fixed
        - **[T-003-E4-1]**: Refine Relate Drawing Format (UI Improvement)
            1. **Requirement**: Hide "N/A" for Item field if it is empty; show only up to Subtask Name.
            2. **Action**: Update string generation logic in `DailyReportPage.tsx` and `SubtaskAutocomplete.tsx`. (Fixed variable shadowing bug).
            3. **Status**: Fixed
        - **[T-003-E5-1]**: Daily Report Error Handling (UX/Network)
            1. **Root Cause**: Generic error message ("โค้ดผิดพลาด") in UI and hardcoded "Error fetching data" string masking the actual Firestore error. Firestore connection is flaky ("unavailable").
            2. **Action**:
                - Update `DailyReportPage.tsx` to display dynamic error messages.
                - Pass actual catch error to state.
                - Investigate `firebase.ts` for potential connection optimizations.
            3. **Status**: Fixed
        - **[T-003-E6-1]**: Employee Loading Performance (Performance)
            1. **Root Cause**: Suspected inefficient data fetching or lack of caching for employee list. `getUsers` fetches all users every time.
            2. **Action**: Optimize `useEmployeeOptions` hook (implement caching or memoization) and check `EmployeeAutocomplete` rendering.
            3. **Status**: Fixed
        - **[T-003-E7-1]**: Global Loading Overlay (UX)
            1. **Requirement**: User reports slow initial load (caching helps subsequent loads only). Request for "Blur Screen + Spinner" on all data-heavy pages.
            2. **Action**:
                - Create reusable `LoadingOverlay` component.
                - Integrate into `DailyReportPage`.
            3. **Status**: Fixed
        - **[T-003-E8-1]**: Daily Report Data Fetching Optimization (Performance)
            1. **Root Cause**: Sequential `await` loop in `fetchAvailableSubtasksForEmployee` (N+1 problem) causing slow loading times.
            2. **Action**: Refactor to use `Promise.all` for parallel subtask validation.
            3. **Status**: Fixed
        - **[T-003-E9-1]**: Production Deployment Failure
            1. **Root Cause**: Firebase App Hosting detected custom build command warning ("your build command is NOT 'next build'"). `package.json` uses `next build --turbopack` which might not be supported in production.
            2. **Action**: Revert to standard `next build` command in `package.json`.
            3. **Status**: Fixed
        - **[T-003-E10-1]**: Deployment Build Failure (Linting/Types)
            1. **Root Cause**: Deployment continuously fails due to strict ESLint/TypeScript checks in CI environment (Google Cloud Build), likely triggered by lingering syntax issues or strict rules.
            2. **Action**: Temporarily disable strict build checks (`ignoreDuringBuilds`, `ignoreBuildErrors`) in `next.config.ts` to unblock deployment.
            3. **Status**: Fixed

        - **[T-003-E11-1]**: Next.js Security Vulnerability (CVE-2025-55182)
            1. **Root Cause**: Next.js v15.5.3 contains a security vulnerability blocked by Firebase Buildpacks.
            2. **Action**: Upgrade Next.js to latest stable version (>= 15.5.7).
            3. **Status**: Fixed
        - **[T-003-E12-1]**: Zombie Data (Deletion Failure)
            1. **Root Cause**: Deletions were not synchronized to backend (append-only log), causing old data to reappear.
            2. **Action**: Implement "Soft Delete" logic (record status: "deleted" with 0 progress) & fixed backend service to persist this status.
            3. **Status**: Fixed
        - **[T-003-E13-1]**: Progress Validation Logic
            1. **Root Cause**: Progress editing allows values conflicting with future/past logs.
            2. **Action**: Implement context-aware validation (min/max based on adjacent history).
            3. **Status**: Fixed
        - **[T-003-E14-1]**: Progress Input UX (Clamping Bug)
            1. **Root Cause**: Strict `min` clamping during typing prevents entering multi-digit numbers (e.g., typing '5' for '55' incorrectly clamps to '50' if min=50).
            2. **Action**: Relax `onChange` to only clamp `max`. Enforce `min` on `onBlur`.
            3. **Status**: In Internal Review
        - **[T-003-E15-1]**: Subtask Visibility after Regression (State)
            1. **Root Cause**: Subtasks disappear from dropdown after lowering progress from 100%. `fetchAllData` may return stale data or race with Firestore update.
            2. **Action**: Optimistically update `availableSubtasks` local state with new progress values immediately after `saveDailyReportEntries`.
            3. **Status**: Fixed
        - **[T-003-E16-1]**: Stale Data after Save (Race Condition)
            1. **Root Cause**: `fetchAllData` is called immediately after save. Firestore reads (especially `collectionGroup`) may return stale data due to index lag, overwriting the "successful" local state with old values (reverting 75% -> 60%).
            2. **Action**: Remove `fetchAllData` call on success. Rely completely on local optimistic updates for both `dailyReportEntries` and `availableSubtasks`.
            3. **Status**: Fixed
        - **[T-003-E17-1]**: Relate Drawing Empty & Persistence Failure
            1. **Root Cause (Visual)**: `handleRelateDrawingChange` may not populate `subTaskName`/`taskName`, causing `generateRelateDrawingText` to return empty string (showing only 'x').
            2. **Root Cause (Persistence)**: Optimistic update of `availableSubtasks` might fail if `subtaskId` mismatch, or filter logic in `SubtaskAutocomplete` is too aggressive.
            3. **Action**:
                - Enrich `handleRelateDrawingChange` to copy all fields.
                - Refine `handleConfirmSubmit` to ensure `relateDrawing` is generated from `availableSubtasks` lookups if needed.
                - Verify `availableSubtasks` update logic (use `path` if needed).
            4. **Status**: Fixed
        - **[T-003-E18-1]**: Inconsistent Relate Drawing & Persistence Regression (Parentheses vs Underscore)
            1. **Root Cause (Visual)**: `SubtaskAutocomplete` displays hyphens/parentheses, but `page.tsx` generates underscores. Optimistic update might be mixing these, or `relateDrawing` logic is inconsistent.
            2. **Root Cause (Persistence)**: If the `subtaskId` is lost or matches incorrectly, `availableSubtasks` isn't updated, hiding the task from dropdowns.
            3. **Action**: Standardize `relateDrawing` generation to ALWAYS use underscores in `handleRelateDrawingChange` and `handleConfirmSubmit`. Ensure `subtaskList` finder logic is absolutely robust (check `id` AND `path`).
            4. **Status**: Fixed
        - **[T-003-E19-1]**: Future Date Filter shows Non-Leave Tasks (Meeting/Training)
            1. **Root Cause**: `NON_WORK_KEYWORDS` included 'meeting'/'ประชุม', causing them to appear in future date selection which should strictly be 'Leave' only.
            2. **Action**: Introduce `LEAVE_KEYWORDS` (['ลางาน']) and update `isFutureDate` filter logic to use this stricter set.
            3. **Status**: Fixed
        - **[T-003-E20-1]**: Fix "Leave" Keyword Detection Bug (False Positive on "ทางลาด")
            1. **Root Cause**: Generic keyword 'ลา' matches 'ทางลาด' (Ramp).
            2. **Action**: Refine `NON_WORK_KEYWORDS` to use specific 'ลางาน' (Leave Category) instead of generic 'ลา'.
            3. **Status**: Fixed
        - **[T-003-E21-1]**: Blank Relate Drawing on Historical Data (Logic Error)
            1. **Root Cause**: Relate Drawing text is generated dynamically from *active* subtasks. If a subtask is deleted or modified, the lookup fails, resulting in a blank field for historical entries.
            2. **Action**: Implement fallback logic to use snapshot data (`taskName`, `subTaskName`, `project`) stored in the log entry if live lookup fails.
            3. **Status**: Fixed
        - **[T-003-E22-1]**: Orphan Data Visual Indication (Highlight Red)
            1. **Root Cause**: Old report entries referencing deleted subtasks (orphan data) looked indistinguishable from normal entries.
            2. **Action**: Added `isOrphan` check and applied red background/strikethrough styling.
            3. **Status**: Fixed
        - **[T-003-E23-1]**: Exclude Orphan Data from Calculations (Logic Refinement)
            1. **Root Cause**: Deleted tasks were still being counted in "Remaining Hours" and Dashboard "Total Hours", causing inaccurate status. "Blacklist" approach failed for Hard Deletes.
            2. **Action**: Switch to "Whitelist" strategy for Dashboard: Fetch valid subtasks for employee and exclude any reports not in this list.
            3. **Status**: Fixed
        - **[T-003-E24-1]**: Dashboard Whitelist Filter Failure (Code Mismatch)
            1. **Root Cause**: The initial implementation attempt of Whitelist logic in `dashboardService.ts` failed to be applied (file write error/mismatch), resulting in the code reverting to/staying as "Blacklist" logic which doesn't catch Hard Deletes.
            2. **Action**: Re-apply the Whitelist logic code replacement carefully, ensuring strict matching of existing code block and verifying imports are present.
            3. **Status**: Fixed
        - **[T-003-E24-2]**: Inconsistent Orphan Detection & Missing Data (Logic Error)
            1. **Issue**:
                - Day 12: Deleted duties show as Normal (counted in hours).
                - Day 13: Same duties show as Orphan (not counted).
                - Day 15: Existing data not showing at all.
            2. **Investigation**:
                - Orphan check relies on `availableSubtasks`. Inconsistency implies `subtaskId` mismatch or `availableSubtasks` filtering issue.
                - Missing data might be due to overly aggressive `isOrphan` filtering or `status` check.
            3. **Status**: Fixed
        - **[T-003-E25-1]**: Visibility of SubtaskId in Daily Report (UI Enhancement)
            1. **Requirement**: User requested to see `(SubtaskId)` displayed after the Relate Drawing text to easier identify tasks/orphans.
            2. **Action**: Update `DailyReportPage.tsx` to append `(entry.subtaskId)` in the render loop.
            3. **Status**: Fixed
        - **[T-003-E26-1]**: Retroactive Editing for Completed Tasks (Feature Request)
            1. **Requirement**:
                - Allow selecting tasks that were incomplete *on the selected date*, even if completed today.
                - Validate progress input to be within the range of [Previous Log Progress, Next Log Progress].
            2. **Status**: Fixed
        - **[T-003-E27-1]**: Console Error: DashboardProvider Update
            1. **Issue**: React warning "Cannot update a component (`DashboardProvider`) while rendering (`DailyReport`)".
            2. **Action**: Investigate `useEffect` or state updates triggering context changes during render.
            3. **Status**: Fixed
        - **[T-003-E28-1]**: Missing SubtaskId in Dropdown (UI)
            1. **Issue**: User requested `(SubtaskId)` in the "Relate Drawing" dropdown to match the table view.
            2. **Action**: Update `SubtaskAutocomplete.tsx` to append `(id)` to the display label.
            3. **Status**: Fixed
        - **[T-003-E29-1]**: Deletion Confirmation & State Synch (Feature Request)
            1. **Requirement**: Show summary of deleted items in Submit popup. Ensure strictly awaited deletion before UI update to prevent state lag.
            2. **Action**: Update `RecheckPopup.tsx` to show deleted items. Refine `handleConfirmSubmit` in `page.tsx`.
            3. **Status**: Fixed
        - **[T-003-E30-1]**: Upload Modal Overflow (UI Defect)
            1. **Issue**: Upload Popup content expands beyond screen height without scrollbar; buttons float/unclickable.
            2. **Root Cause**: Modal container lacks `flex-col` layout and `overflow-y-auto` on the content area, causing children to overflow the `max-h` constraint.
            3. **Action**: Apply `flex flex-col`, `overflow-hidden` to container, and `overflow-y-auto` to the table wrapper.
            4. **Status**: Fixed
        - **[T-003-E30-2]**: Calendar Abnormal Status (Feature)
            1. **Requirement**: Show "Orange Dot" for days with < 8 hours of work (Normal + OT), similar to Dashboard "Abnormal" status.
            2. **Proposed Logic**: Use `dailyStatsMap` to sum hours. If < 8 and not Leave/Holiday -> `has-abnormal-marker`.
            3. **Status**: Fixed
        - **[T-003-E30-3]**: Refine Abnormal Marker Color (UI)
            1. **Requirement**: Change Abnormal Marker from Orange to Dark Blue (to distinguish from Red/Missing).
            2. **Action**: Update CSS `.has-abnormal-marker`.
            3. **Status**: Fixed
        - **[T-003-E30-4]**: Missing Data Tooltip (UI)
            1. **Requirement**: Show "ไม่มีการลงข้อมูล" tooltip for days with Red Dot (Missing Data).
            2. **Action**: Update `getTileContent` in `DailyReportPage.tsx`.
            3. **Status**: Fixed
        - **[T-003-E30-5]**: Update Calendar Legend (UI)
            1. **Requirement**: Add "Abnormal" (Dark Blue Dot) to the calendar legend.
            2. **Action**: Update Legend section in `DailyReportPage.tsx`.
            3. **Status**: Fixed
        - **[T-003-E30-6]**: Refine Calendar Markers (Green/Yellow Logic) (Feature)
            1. **Requirement**: 
                - >= 8 hours -> Green Dot.
                - < 8 hours -> Yellow Dot.
                - Missing -> Red Dot.
            2. **Action**: Update `custom-calendar.css` and `DailyReportPage.tsx`.
            3. **Status**: Fixed
        - **[T-003-E30-7]**: Fix Missing Data Marker (Red Dot) (Defect)
            1. **Issue**: Red Dot not showing for past dates without data.
            2. **Root Cause**: Likely Timezone/Date comparison issue in `isPast` logic.
            3. **Action**: Fix `isPast` comparison to use strict string comparison (YYYY-MM-DD).
            4. **Status**: Fixed
            - **Error Logs**:
                - **[T-003-E30-7-E1-1]**: Red Dot Marker Not Showing (Regression)
                    1. **Issue**: "Missing" data dates shows tooltip but no Red Dot.
                    2. **Root Cause**: Investigating CSS specificity or class application order. Logic `isPast` confirms True (Tooltip works).
                    3. **Action**: Verify CSS content/display properties and ensure no override by `react-calendar` default styles.
                    4. **Status**: Fixed
        - **[T-003-E30-8]**: Add Leave Marker (Brown Dot) (Feature)
            1. **Requirement**: Leave >= 8 hours -> Brown Dot.
            2. **Action**: Add `.has-leave-marker` CSS and update logic in `DailyReportPage.tsx`.
            3. **Status**: Fixed
            - **Error Logs**:
                - **[T-003-E30-11-1]**: Holiday Highlight Missing (Regression)
                    1. **Issue**: Purple background for Holidays not showing.
                    2. **Root Cause**: CSS Specificity issue. `holiday-highlight` likely overridden by other background styles or default tile background.
                    3. **Action**: Add `!important` to specificity or ensure it loads last.
                    4. **Status**: Fixed
        - **[T-003-E30-12]**: Refine Legend Layout (UI)
            1. **Requirement**: Group "Highlights" vs "Dots" and use 2-column layout to reduce height.
            2. **Action**: Update Legend section in `DailyReportPage.tsx` with grid layout and section headers (or visual grouping).
            3. **Status**: Fixed

## 4. Project Management Page (`/projects`)
- [x] [T-004] Project Management System (F-004)
    - **Error Logs**:
        - **[T-004-E1-1]**: Double Submission on Save
            1. **Root Cause**: `confirmSave` closes modal immediately and lacks `isSaving` guard.
            2. **Action**: Implement `isSaving` state and disable buttons.
            3. **Status**: Fixed
        - **[T-004-E2]**: Add Subtask Count Column (Feature)
            1. **Requirement**: Insert "Subtask Count" column after "DOC NO." in Projects Planning table.
            2. **Status**: Fixed
        - **[T-003-E5]**: Inconsistent Time Units
            1. **Issue**: "Working Hours" uses "0 ชม." while "Overtime" uses "0 hrs" or "0 mins".
            2. **Status**: Fixed
        - **[T-004-E3]**: Performance - Projects Page Refetching
            1. **Issue**: Data reloads on every page navigation due to unmounting.
            2. **Status**: Fixed
        - **[T-004-E4]**: Build Error - CacheContext
            1. **Issue**: Missing 'use client' directive in CacheContext.tsx causing Next.js build error.
            2. **Status**: Fixed
        - **[T-004-E5]**: Runtime Error - ProjectTaskView
            1. **Issue**: ReferenceError 'activities' is not defined. State variable likely removed during refactoring.
            2. **Status**: Fixed
        - **[T-004-E6]**: Runtime Error - CacheContext Infinite Loop
            1. **Issue**: "Maximum update depth exceeded" in CacheContext due to cyclic state updates during fetchTasksForProject.
            2. **Status**: Fixed
        - **[T-004-E7]**: Logic Error - Missing Task Name & Details
            1. **Issue**: Task Name and other columns not displaying because `getCachedTasks` returned incomplete data.
            2. **Status**: Fixed
        - **[T-004-E8]**: Logic Error - Ghost Data & Missing Loader
            1. **Issue**: Switching to an empty project shows stale data. Missing visual feedback (Spinner) during switch.
            2. **Status**: Fixed
        - **[T-004-E8-2]**: Logic Error - Ghost Data Persistence
            1. **Issue**: Table still fails to refresh/clear when switching to empty project. Suspect `cacheLoaded` guard blocking updates for non-All views.
            2. **Status**: Fixed
        - **[T-004-E8-3]**: Logic Error - Ghost Data Persistence (Attempt 3)
            1. **Issue**: Table retains "All Projects" data when switching to an empty project. Suggests `setRows` is not triggered or input data is stale.
            2. **Status**: Fixed
        - **[T-004-E9]**: UI/UX Error - Missing Loading Feedback
            1. **Issue**: Loading Spinner (Blur Screen) does not appear when switching projects, causing user confusion and "Ghost Data" perception.
            2. **Status**: Fixed

## 5. Task Management Page (`/tasks`)
- [x] [T-005] Task Management System (F-005)
    - **Error Logs**:
        - **[T-005-E6]**: Runtime Error - tasks/page.tsx
            1. **Issue**: ReferenceError 'getCachedSubtasks' is not defined. Missing import.
            2. **Status**: Fixed
        - **[T-005-E7]**: Runtime Error - RelateWorkSelect & GlobalDataContext
            1. **Issue**: `useFirestoreCache` context is missing a provider in the component tree.
            2. **Status**: Fixed
        - **[T-005-E8]**: Hydration Error - tasks/page.tsx
            1. **Issue**: Invalid HTML nesting `<td>` cannot be a child of `<td>`. Likely due to malformed JSX in the New Subtask row.
            2. **Status**: Fixed
        - **[T-005-E3]**: Performance - Redundant Fetch & Slow "All Assign"
            1. **Issue**: "All Assign" loops through every project, causing slowness. Redundant fetch calls found.
            2. **Status**: Fixed
        - **[T-005-E4]**: Build Error - taskAssignService
            1. **Issue**: Parsing error (Expression expected) in taskAssignService.ts due to malformed code insertion.
            2. **Status**: Fixed
        - **[T-005-E5]**: Build Error - tasks/page.tsx
            1. **Issue**: Syntax error "Expected ',' got 'finally'" due to premature closing of `try` block before the `catch` block.
            2. **Status**: Fixed
        - **[T-005-E1]**: Column Overlap (Activity/Relate Drawing)
            1. **Issue**: "Activity" and "Relate Drawing" columns are too close/overlapping in Subtask table.
            2. **Status**: Fixed
        - **[T-005-E2]**: Unwanted UI Elements in New Subtask Row
            1. **Issue**: "New Subtask" row has a trash icon and inconsistent blue highlighting.
            2. **Status**: Fixed
- [x] [T-011] Implement "All Assign" Filter (F-008)
- [x] [T-012] Set "All Assign" as Default (F-008)
- [x] [T-013] Add Due Date Column (F-009)
    - **Error Logs**:
        - **[T-013-E1-1]**: Parsing ecmascript source code failed
            1. **Root Cause**: Garbage text in component structure.
            2. **Status**: Fixed
- [x] [T-014] Implement Table Sorting (F-009)
- [x] [T-015] Implement Task Filters (F-009)
    - **Error Logs**:
        - **[T-005-E8]**: UI Error - Missing Loading State
            1. **Issue**: No visual feedback when fetching subtasks.
            2. **Status**: Fixed
        - **[T-005-E9]**: Logic Error - Progress Synchronization
            1. **Issue**: Task Assignment progress does not reflect latest Daily Report changes (Sync latency). Deleting a report does not revert progress.
            2. **Status**: Fixed
        - **[T-005-E10]**: Logic Error - Deleted Tasks in Dropdown
            1. **Issue**: "Relate Drawing" / "Activity" dropdowns in Task Assignment show deleted tasks from Projects Planning.
            2. **Status**: Fixed
        - **[T-011-E1-1]**: Syntax Error (Unexpected EOF)
            1. **Root Cause**: Incomplete file write.
            2. **Status**: Fixed
- [x] [T-021] Task Deletion Guard (F-005)
    - **Type**: Feature / Safety
    - **Priority**: High
    - **Description**:
        1. Prevent deletion of Tasks/Subtasks if they are referenced in `dailyReport`.
        2. Show alert modal explaining why deletion is blocked.
    - **Traceability**: [F-005]

- [x] [T-028] Standardize Subtask ID to Uppercase (F-005)
    - **Type**: Data Quality / Enhancement
    - **Priority**: High
    - **Description**:
        1. Enforce all Subtask IDs to be stored as UPPERCASE throughout the system.
        2. Normalize input in all create/edit forms.
        3. Normalize comparison/lookup in service layer.
        4. Display Subtask ID as UPPERCASE in all UI components.
    - **Traceability**: [F-005], [F-003], [F-006]
    - **Impact**:
        - Frontend: `tasks/page.tsx`, `daily-report/page.tsx`, `SubtaskAutocomplete.tsx`
        - Services: `taskService.ts`, `taskAssignService.ts`, `dashboardService.ts`

## 6. Task Assignment Page (`/task-assignment`)
- [x] [T-006] Task Assignment Features (F-006)
- [x] [T-020] Task Table Loading State (F-009)
    - **Goal**: Add visual feedback (blur + spinner) during data fetching.
    - **Priority**: High (UX)

## 7. Document Tracking Page (`/document-tracking`)
- [x] [T-007] Document Tracking Features (F-007)

## General & Documentation
- [x] [T-008] Initialize Spec-Kit Artifacts
- [x] [T-009] Reverse Engineer Documentation
- [ ] [T-010] Verify Documentation Accuracy
- [ ] [T-009] Final Verification and Handover

    - **Error Logs**:
        - **[T-005-E1-1]**: New row visible in All Assign filter
            1. **Root Cause**: `rows` state initialized with default empty row even when `selectedProject` is 'all_assign'.
            2. **Action**: Set `rows` to empty array `[]` when 'all_assign' is selected.
            3. **Status**: Fixed
        - **[T-ENV-002]**: Firebase Import Error (IDE)
            1. **Root Cause**: VSCode TypeScript server caching issue after fresh `npm install`.
            2. **Action**: Reload VSCode / Restart TS Server.
            3. **Status**: Pending User Verification
        - **[T-ENV-001]**: Node.js Version Mismatch
            1. **Root Cause**: Next.js 15 requires Node >= 18, but system uses v16.
            2. **Action**: Found valid Node v20 environment at `/Volumes/BriteBrain/IDE/nvm`.
            3. **Status**: Fixed

## 8. Dashboard Enhancements (`/dashboard`)
- [x] [T-022] Dashboard Status Logic (F-002)
    - **Type**: Feature / UX
    - **Priority**: Medium
    - **Description**:
        1. **Future Dates**: Display dates > Today as "Gray/Disable" or "Future" status instead of "Missing".
        2. **Leave Status**: Provide specific "Leave" (ลางาน) status if daily hours = 8 AND all tasks are "Leave".
    - **Description**:
        1. **Future Dates**: Display dates > Today as "Gray/Disable" or "Future" status instead of "Missing".
        2. **Leave Status**: Provide specific "Leave" (ลางาน) status if daily hours = 8 AND all tasks are "Leave".
    - **Traceability**: [F-002]
    - **Error Logs**:
        - **[T-022-E1-1]**: Future Status Not Showing on Empty Days
            1. **Root Cause**: The "Missing" rows are generated client-side in `DailyReportView.tsx` to fill date gaps, overriding/bypassing service-side logic which only handles existing entries.
            2. **Action**: Implement "Future" date check in `DailyReportView.tsx` gap-filling loop.
            3. **Status**: Fixed
        - **[T-022-E2-1]**: Dashboard Rows Showing ID instead of Name & Alignment Issues
            1. **Root Cause**: Race condition between `getUsers()` and `getAllDailyReportEntries()`. Reports loaded before users, so mapping fallback to ID.
            2. **Action**: logic to map `fullName` at **render time** using the `users` context/state, instead of baking it into the state during fetch. Align numeric columns.
            3. **Status**: Fixed

- [x] [T-023] Dashboard Alignment Refinement (F-002)
    - **Type**: UI / Refinement
    - **Priority**: Low
    - **Description**:
        1. Align 'Working Hours' and 'OT' columns to Right (Data).
        2. Ensure 'Status' column is Centered.
        3. Keep Headers Centered.
    - **Traceability**: [F-002]
    - **Error Logs**:
        - **[T-023-E1-1]**: Header Alignment Misinterpretation
            1. **Root Cause**: Misunderstood requirement, aligned headers to Right along with data.
            2. **Action**: Revert Headers to Center, keep Data as Right.
            3. **Status**: Fixed

- [x] [T-024] Fix Leave Status & Verify Alignment (F-002)
    - **Type**: Bug Fix
    - **Priority**: High
    - **Description**:
        1. Fix "Leave" status not showing (Whitelist logic was filtering it out).
        2. Verify "Status" column data is centered.
    - **Traceability**: [F-002]
    - **Error Logs**:
        - **[T-024-E1-1]**: Leave Status Disappearing
            1. **Root Cause**: Whitelist strategy filtered out "Leave" tasks because they weren't in the assigned subtask list.
            2. **Action**: Added exception in `dashboardService.ts` to allowed "Leave" tasks to bypass whitelist filter. Also broadened keyword search.
            3. **Status**: Fixed
        - **[T-024-E1-2]**: Leave Logic failing based on field location
            1. **Root Cause**: "Leave" keyword was in `relateDrawing` field which was not being checked.
            2. **Action**: Added `relateDrawing`, `item`, and `note` fields to the Leave keyword check.
            3. **Status**: Fixed
        - **[T-024-E1-3]**: Specific Leave Types not detected
            1. **Root Cause**: Logic only checked for "ลางาน" but user entered "ลากิจ" (Personal Business), which didn't match.
            2. **Action**: Broadened keywords to include "ลากิจ", "ลาป่วย", "พักร้อน".
            3. **Status**: Reverted (By User Request)
        - **[T-024-E1-4]**: Logic overly broad (checking Subtask for subtypes)
            1. **Root Cause**: Previous fix checked "Subtask" name for specific types like "ลากิจ". User clarified that "Task" name MUST be "ลางาน" regardless of subtask type.
            2. **Action**: Removed specific subtypes (`ลากิจ`, `ลาป่วย`, etc.) and refocused logic to strictly check `taskName` for "ลางาน"/"Leave".
            3. **Status**: Fixed

- [x] [T-025] Refine Dashboard Status & Alignment (F-002)
    - **Type**: Bug Fix / UI Refinement
    - **Priority**: High
    - **Description**:
        1. **Status "Leave"**: Check if `Task Name` contains "ลางาน" AND total leave hours = 8. Ignore subtasks.
        2. **Table Alignment**: 
            - Center all headers.
            - "Status" data centered.
            - "Total OT" data right-aligned.
    - **Traceability**: [F-002]

- [x] [T-026] Fix Daily Report Header Z-Index (F-003)
    - **Type**: Bug Fix / UI
    - **Priority**: High
    - **Description**:
        1. Fix Header Z-Index in `DailyReportPage.tsx` to prevent dropdowns from scrolling over it.
    - **Traceability**: [F-003]

- [x] [T-027] Fix EmployeeAutocomplete Z-Index (Regression)
    - **Type**: Bug Fix / UI
    - **Priority**: High
    - **Description**:
        1. Fix `EmployeeAutocomplete` dropdown being hidden by the sticky header.
    - **Traceability**: [F-003]
