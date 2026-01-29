# Traceability Matrix

## 1. Requirement Traceability Matrix (RTM)

| Feature ID | Feature Name | Related Files | Status |
|:---|:---|:---|:---|
| [F-001] | Authentication | `src/app/login`, `src/context/AuthContext.tsx` | Existing |
| [F-002] | Dashboard | `src/app/dashboard` | Existing |
| [F-003] | Daily Reporting | `src/app/daily-report` | Existing |
| [F-004] | Project Management | `src/app/projects` | Existing |
| [F-005] | Task Management | `src/app/tasks` | Existing |
| [F-006] | Task Assignment | `src/app/task-assignment` | Existing |
| [F-007] | Document Tracking | `src/app/document-tracking` | Existing |
| [F-008] | All Assign Filter | `src/app/tasks` | Existing |
| [F-009] | Task Table Enhancements | `src/app/tasks` | New |
| [F-003] | Daily Reporting (Future Filter) | `src/app/daily-report` | Update |
| [F-003] | Daily Reporting (Progress Validation) | `src/app/daily-report` | Update |

## 2. Data Traceability

| Entity | Type | Related Files | Notes |
|:---|:---|:---|:---|
| Project | Interface | `src/types/database.ts` | Firestore Collection `projects` |
| Task | Interface | `src/types/database.ts` | Firestore Collection `tasks` |
| Subtask | Interface | `src/types/database.ts` | Firestore Subcollection `tasks/{id}/subtasks` |
| DailyReportEntry | Interface | `src/types/database.ts` | Firestore Collection `daily_reports` (assumed) |
| User | Interface | `src/types/database.ts` | Firebase Auth & Users collection |

## 3. Technical Traceability

- [ ] **[T-018] Default Assignee Filter**
    - **Concept/Goal**: Improve UX by showing relevant data immediately.
    - **Implementation Details**:
        - **UI/UX**: `DailyReportView.tsx` - Set default state.
        - **State**: `selectedAssignee` defaults to `currentUser.employeeId`.
    - **Confirmed Behavior**: Loading dashboard shows user's own reports.
- [ ] [T-044] Multi-select Status Filter
    - **Goal**: Allow comparing multiple statuses (e.g., Missing + Leave).
    - **Implementation Details**:
        - **UI**: Custom Dropdown with Checkbox/Toggle.
        - **Logic**: Array-based filtering (`array.includes`).

- [ ] [T-048] Fix Project Status Filter (Work Request)
    - **Concept/Goal**: Correctly filter Work Request tasks by resolving language mismatch and improve filter UX.
    - **Implementation Details**:
        - **Logic**: Map Thai labels ("รอ BIM รับงาน") to DB status ("PENDING_BIM") in `applyStatusFilter`.
        - **UI**: Add "Select All" option to Status Dropdown.
    - **Confirmed Behavior**:
        - Selecting "รอ BIM รับงาน" shows items with status `PENDING_BIM`.
        - "Select All" toggles all statuses.
        - Work Requests with missing `currentStep` default to `PENDING_BIM` (Fix logic).
        - **[E2 Fix] Legacy Tasks**: Tasks without `taskStatus` field are now visible (Client-side DELETED check).

- [ ] [T-049] Refine Delete Logic (Active Subtasks)
    - **Concept/Goal**: Safe deletion. Only allow deleting tasks with NO active subtasks.
    - **Implementation Details**:
        - **Logic**: Check `subtasks` status. If all deleted, allow parent delete.
        - **Reference**: Confirm ID-based referencing for stability.
    - **Confirmed Behavior**:
        - Button hidden if active subtasks exist.
        - Button visible if count is 0 OR all subtasks deleted.

- [ ] [T-050] Relocate New Task Row to Top (Project Planning)
    - **Concept/Goal**: Consistency with Task Assignment UI. Input row at the top.
    - **Implementation Details**:
        - **Logic**: Reorder `rows` array (`[initial, ...tasks]`).
        - **UI**: Added "NEW" badge to ID column.
    - **Confirmed Behavior**:
        - Empty row appears at top.
        - Shows "NEW" in blue text.

- [x] [T-004-E10] Auto-Add Row (Project Planning)
    - **Goal**: Auto-prepend new row at the TOP when user fills the first row (Name + Activity + Dates).
    - **Implementation**: `handleRowChange` checks if `row[0]` is complete. If so, `setRows(prev => [newRow, ...prev])`. Pushes data down.

- [x] [T-005-E12] Auto-Add Row (Task Assignment)
    - **Goal**: Auto-prepend new row at the TOP when user fills the first row.
    - **Implementation**: `updateRow` checks if `row[0]` is complete. If so, `setRows(prev => [newRow, ...prev])`.

- [ ] [T-051] Chronological Progress Validation
    - **Goal**: Allow inserting/editing progress between dates correctly.
    - **Logic**: `PrevDate.Progress < Current.Progress <= NextDate.Progress`.
    - **Exception**: Allow "No Change" (Current == Old).
    - **Confirmed Behavior**: System allows 31-59% if Day 12=30% and Day 15=60%.

- [ ] [T-052] Fix Daily Report Auto-Refresh
    - **Goal**: Calendar and Data refresh immediately after submit.
    - **Implementation**: Call fetch/refresh trigger in `onSuccess`.

- [x] [T-053] Immediate Cache Updates
    - **Goal**: Prevent stale data after mutations (Create/Update).
    - **Implementation**: Enabled `invalidateCache` in context. Added manual invalidation triggers in Project Planning (Save/Delete), Task Assignment (Save), and Daily Report (Submit). Data now refreshes instantly.

- [x] [T-045] Fix Missing Data for All Assignees
    - **Goal**: "Missing" status should appear even when viewing all users. (Corrected: Fix empty data in All Assign filter)
    - **Implementation**: Added logic to search by `fullName` first, then fallback to `username`. **Optimized Query**: Removed `!= DELETED` filter from Firestore to utilize existing indexes (preventing "Missing Index" error) and moved deletion filtering to Client-side JavaScript.
        - **Perf**: Memoize generated rows.
- [ ] **[T-020] Task Table Loading State**
    - **Concept/Goal**: Visual feedback during async operations.
    - **Implementation Details**:
        - **UI/UX**: `LoadingOverlay` component.
        - **Logic**: Wrap `fetchProjectData` with `setLoading(true/false)`.
    - **Confirmed Behavior**: Screen blurs and shows spinner while data is loading.
- [ ] **[T-003-E20-1] Fix Leave Keyword Detection**
    - **Concept/Goal**: Prevent false positives on leave detection (e.g., 'ทางลาด').
    - **Implementation Details**:
        - **Logic**: Update `NON_WORK_KEYWORDS` in `page.tsx` to `['ลางาน', 'ประชุม', 'meeting']`.
    - **Confirmed Behavior**: 'ทางลาด' input is unlocked; 'ลางาน' input is locked.
- [ ] **[T-003-E21-1] Blank Relate Drawing on Historical Data**
    - **Concept/Goal**: Ensure historical data integrity even when referenced subtasks are modified/deleted.
    - **Implementation Details**:
        - **Logic**: `DailyReportPage.tsx` - Add fallback to snapshot data in `entriesToShow`.
    - **Confirmed Behavior**: Historical logs show Relate Drawing text using stored snapshot data even if subtask is missing.
- [ ] **[T-021] Task Deletion Guard**
    - **Concept/Goal**: Data Integrity. Prevent orphaned records.
    - **Implementation Details**:
        - **Logic**: `taskService.ts` - Check `dailyReport` collection group before delete.
        - **UI/UX**: `tasks/page.tsx` - Show Error Modal if check returns true.
    - **Implementation Details**:
        - **Logic**: `taskService.ts` - Check `dailyReport` collection group before delete.
        - **UI/UX**: `tasks/page.tsx` - Show Error Modal if check returns true.
    - **Confirmed Behavior**: Attempting to delete a used task shows error; unused task deletes successfully.
- [ ] **[T-003-E22-1] Orphan Data Visual Indication**
    - **Concept/Goal**: Warn users about missing references.
    - **Implementation Details**:
        - **UI/UX**: `DailyReportPage.tsx` - Apply `bg-red-50` and `line-through` if `isOrphan` is true.
    - **Implementation Details**:
        - **UI/UX**: `DailyReportPage.tsx` - Apply `bg-red-50` and `line-through` if `isOrphan` is true.
    - **Confirmed Behavior**: Rows with deleted subtasks appear red and crossed out.
- [ ] **[T-003-E23-1] Exclude Orphan Data from Calculations**
    - **Concept/Goal**: Ensure stats reflect only valid work.
    - **Implementation Details**:
        - **Logic**: `DailyReportPage.tsx` excludes `isOrphan` from reduce.
        - **Logic**: `dashboardService.ts` uses Assignee Whitelist (active subtasks) to filter reports.

- [ ] **[T-022] Dashboard Status Logic**
    - **Concept/Goal**: Improve dashboard accuracy for future dates and leave days.
    - **Implementation Details**:
        - **Logic**: `dashboardService.ts` - Check `date > today` for Future status.
        - **Logic**: `dashboardService.ts` - Check `totalHours == 8` AND `isAllLeave` for Leave status.
        - **Logic**: `dashboardService.ts` - Check `totalHours == 8` AND `isAllLeave` for Leave status.
        - **UI**: `DailyReportView.tsx` - Render Gray row for Future, Purple Badge for Leave.

- [ ] **[T-023] Dashboard Alignment Refinement**
    - **Concept/Goal**: Improve readability and visual balance.
    - **Implementation Details**:
        - **UI**: `DailyReportView.tsx` - Right align numeric DATA, Center align HEADERS and Status.

- [ ] [T-024] Fix Leave & Verify Status Alignment
    - **Concept/Goal**: Ensure Leave data isn't filtered out by whitelist.
    - **Implementation Details**:
        - **Service**: `dashboardService.ts` - Bypass whitelist for Leave tasks.

- [ ] [T-025] Refine Dashboard Status & Alignment
    - **Concept/Goal**: Strict Leave definition and visual polish.
    - **Implementation Details**:
        - **Logic**: `dashboardService.ts` - Calculate `totalLeaveHours`. check `taskName` == "ลางาน".
        - **UI**: `DailyReportView.tsx` - CSS classes for alignment.
    - **Confirmed Behavior**: 
        - Reports with 8 hours of "Task: ลางาน" show "Leave" status.
        - Table headers are centered. status is centered. OT is right-aligned.
- [ ] [T-026] Fix Daily Report Header Z-Index
    - **Concept/Goal**: Fix Z-Index Stacking
    - **Implementation Details**:
        - **UI**: `DailyReportPage.tsx`
    - **Confirmed Behavior**: Header stays on top of inputs.
- [x] [T-027] Fix EmployeeAutocomplete Z-Index (Regression)
    - **Concept/Goal**: Fix Z-Index Regression
    - **Implementation Details**:
        - **UI**: `EmployeeAutocomplete.tsx`
    - **Confirmed Behavior**: Dropdown stays on top of header.
- [ ] [T-003-E26-1] Retroactive Editing for Completed Tasks
    - **Concept/Goal**: Allow editing past logs for completed tasks.
    - **Implementation Details**:
        - **Logic**: `taskAssignService.ts` (Fetch all non-deleted), `DailyReportPage.tsx` (Progress Validation).
    - **Confirmed Behavior**: Can select completed tasks on past dates. Progress input validated against history.
- [ ] [T-003-E29-1] Deletion Confirmation & Sync
    - **Concept/Goal**: Warn user on deletion and sync state correctly.
    - **Implementation Details**:
        - **UI**: `RecheckPopup.tsx` (New Deleted Section).
        - **Logic**: `page.tsx` (Await deletion properly).
    - **Confirmed Behavior**: Popup lists deleted items. Deleted items vanish immediately after submit.
- [ ] [T-003-E30-1] Safe Clear Button for Subtask
    - **Concept/Goal**: UI Safety. Prevent accidental clearing of Subtask.
    - **Implementation Details**:
        - **UI**: `page.tsx` (Wrapped clear button with `editableRows` check).
    - **Confirmed Behavior**: Red Cross only appears when row is in Edit Mode.

- [ ] [T-028] Standardize Subtask ID to Uppercase
    - **Concept/Goal**: Data Quality & Consistency. Prevent case-sensitivity issues in data matching.
    - **Principles**:
        - Normalization at input layer (transform user input immediately)
        - Normalization at service layer (enforce before save/query)
        - Display consistency (show uppercase everywhere)
    - **Implementation Details**:
        - **UI/UX**:
            - `tasks/page.tsx` - Add `.toUpperCase()` to Subtask ID input onChange
            - `daily-report/page.tsx` - Display Subtask ID as uppercase
            - `SubtaskAutocomplete.tsx` - Display uppercase in dropdown
        - **Logic/State**:
            - `taskService.ts` - Normalize before save/update/query
            - `taskAssignService.ts` - Normalize in fetch/save operations
            - `dashboardService.ts` - Normalize during comparison/filtering
        - **Data**: Case-insensitive comparisons where needed
    - **Confirmed Behavior**:
        - Creating new subtask with lowercase input → Stored as UPPERCASE
        - Editing existing subtask → Normalized to UPPERCASE
        - All displays show UPPERCASE
        - Lookup/matching works regardless of input case
    - **Sub-tasks**:
        - [x] Update Task Assignment input normalization
        - [x] Update Task Management forms
        - [x] Update Daily Report display
        - [x] Update SubtaskAutocomplete component
        - [x] Update taskService normalization
        - [x] Update taskAssignService normalization
        - [x] Update dashboardService comparison logic

- [ ] [T-029] Fix Daily Report Editable Logic (New Tasks)
    - **Concept/Goal**: UI Usability. Ensure users can clear/change selected subtask for new entries.
    - **Implementation Details**:
        - **UI**: `page.tsx` (Allow 'x' button for entries where `!isExistingData` OR `editableRows.has(id)`).
    - **Confirmed Behavior**: 
        - New rows (not saved) show 'x' button to clear subtask.
        - Saved rows (locked) do not show 'x' button until "Edit" is clicked.

- [ ] [T-030] Daily Report Progress Validation
    - **Concept/Goal**: Enforce data quality by ensuring work logged corresponds to actual progress.
    - **Principles**: 
        - Progress MUST increase if work is done.
        - Exception for non-work activities (Leave, Meeting).
    - **Implementation Details**:
        - **Logic**: `DailyReportPage.tsx` - In `handleConfirmSubmit`, check `currentProgress > initialProgress`.
        - **Logic**: Exception check using `isLeaveTask` or `NON_WORK_KEYWORDS`.
    - **Confirmed Behavior**:
        - Submit blocked if Progress mismatch.
        - Submit allowed if Progress increased.
        - Submit allowed for Leave/Meeting even with 0 progress.

- [ ] [T-031] Refine Leave Detection with Activity Type
    - **Concept/Goal**: Improve accuracy of Non-Work task detection using strict data fields.
    - **Implementation Details**:
        - **Data**: Ensure `taskCategory` is propagated to `Subtask` and `DailyReportEntry`.
        - **Logic**: Check `taskCategory` against 'Project Meeting' and 'ลางาน'.
    - **Confirmed Behavior**:
        - 'Project Meeting' activity is locked/exempt.
        - 'Design Meeting Room' (Activity: Arch) is NOT locked.

- [ ] [T-032] Add 'Internal Meeting' Activity
    - **Concept/Goal**: Extend non-work activity list.
    - **Implementation Details**:
        - **Logic**: Add 'Internal Meeting' to `isActivityLeaveOrMeeting` check.
    - **Confirmed Behavior**:
        - 'Internal Meeting' tasks are locked/exempt from progress validation.

- [ ] [T-033] Refine Project Status Filter
    - **Concept/Goal**: Unify status definitions between Dashboard and Planning.
    - **Implementation Details**:
        - **Logic**: Use `getTaskStatusCategory` from `dashboardService` for RFA filtering.
        - **UI**: Update Filter Dropdown to show Dashboard categories for RFA.
    - **Confirmed Behavior**:
        - Selecting "รอแก้ไขแบบ BIM" shows REJECTED, REVISION_REQUIRED, etc.

- [ ] [T-033] Refine Project Status Filter
    - **Concept/Goal**: Unify status definitions between Dashboard and Planning.
    - **Implementation Details**:
        - **Logic**: Use `getTaskStatusCategory` from `dashboardService` for RFA filtering.
        - **UI**: Update Filter Dropdown categories.
    - **Confirmed Behavior**:
        - Selecting "รอแก้ไขแบบ BIM" shows REJECTED, REVISION_REQUIRED, etc.

- [ ] [T-034] Fix Top Status Filter & Add Search
    - **Concept/Goal**: Enable comprehensive filtering and searching.
    - **Implementation Details**:
        - **Logic**: Combine Status Filter (Top/Header) and Search Term.
        - **UI**: Add Search Input text field. Update Top Filter Dropdown.
    - **Confirmed Behavior**:
        - Search "Text" -> Shows rows with partial match on Relate Drawing.
        - Filter Status -> Shows rows matching status/category.

- [ ] [T-035] Multi-Select Status Filter & Reset
    - **Concept/Goal**: Enhance filtering usability.
    - **Implementation Details**:
        - **UI**: Custom Multi-Select Dropdown with Checkboxes. Reset Button.
        - **Logic**: OR logic for multiple selected statuses.
    - **Confirmed Behavior**:
        - Select "A" and "B" -> Shows rows with status A OR B.
        - Click Reset -> Clears all filters.

- [ ] [T-036] Remove Header Filter
    - **Concept/Goal**: Simplify UI/UX by removing redundant filter.
    - **Implementation Details**:
        - **UI**: Remove <select> from Table Header.
        - **Logic**: Rely solely on Top Filter.
    - **Confirmed Behavior**:
        - "STATUS DWG." header shows text only.

- [ ] [T-037] Implement Table Header Sorting
    - **Concept/Goal**: Improve data navigability.
    - **Implementation Details**:
        - **UI**: Sort Indicators (▲/▼) on Headers.
        - **Logic**: Client-side sorting on filtered dataset.
    - **Confirmed Behavior**:
        - Click Header -> Toggles Asc/Desc -> Updates Table Order.

- [ ] [T-038] Implement Public Holiday Feature
    - **Concept/Goal**: Manage and Visualize non-working days.
    - **Implementation Details**:
        - **Data**: New Firestore Collection .
        - **UI**: Calendar  logic for highlighting.
        - **Modal**: Input form for new holidays.
    - **Confirmed Behavior**:
        - BimLeader sees "Add Holiday" button.
        - Sundays are Red.
        - Added Holidays are Purple.

- [ ] [T-039] Refactor Public Holiday to Bulk Mode
    - **Concept/Goal**: Streamline data entry for multiple holidays.
    - **Implementation Details**:
        - **UI**: `AddHolidayModal.tsx` supports Year Selection and Temporary List.
        - **Logic**: Batch processing in `holidayService.ts`.
    - **Confirmed Behavior**:
        - Can add multiple dates to list.
        - Can remove item from list.
        - "Save All" persists all items.

- [ ] [T-040] Refine Holiday Manager
    - **Concept/Goal**: See existing data and managing (CRUD).
    - **Implementation Details**:
        - **UI**: Added "Existing Holidays" section in table.
        - **Logic**: Fetch on year change.
    - **Confirmed Behavior**:
        - Switching year loads stored holidays.
    - **Confirmed Behavior**:
        - Switching year loads stored holidays.
        - Can delete existing holiday (with confirm).
        - "Saved" vs "New" status logic.

- [ ] [T-041] Implement Full Calendar Highlighting
    - **Concept/Goal**: Visual cues in calendar (Red/Yellow/Purple).
    - **Implementation Details**:
        - **Logic**: `getTileClassName` computes status.
        - **Performance**: `useMemo` for data lookup.
    - **Confirmed Behavior**:
        - Days with data show Yellow marker.
        - Days without data (past) show Red marker.
        - Holidays/Sundays show Background Color.

- [ ] [T-042] Calendar Tooltip Implementation
    - **Concept/Goal**: Show context details on hover.
    - **Implementation Details**:
        - **Logic**: Pre-calculated `dailyStatsMap`.
        - **UI**: Native `title` attribute on tile overlay.
    - **Confirmed Behavior**:
        - Hover Holiday -> Shows Name.
        - Hover Work -> Shows Normal/OT hours.
        - Hover Leave -> Shows "ลางาน" + Hours.

- [ ] [T-043] Fix Tooltip Data Aggregation
    - **Concept/Goal**: Correct calculation of daily hours (Snapshot).
    - **Implementation Details**:
        - **Logic**: Deduplicate by `${AssignDate}_${SubtaskId}` -> Keep max `Timestamp`.
        - **Logic**: Filter out `status === 'deleted'`.
    - **Confirmed Behavior**:
        - Tooltip sum matches "Active" data only.
        - Deleted/Historic edits are excluded.
        - "Meeting" hours are counted as Normal Work, not Leave.
        - "Leave" is strictly for 'ลางาน' category.

- [ ] [T-046] Fix Holiday vs Missing Status
    - **Goal**: Prevent "Missing" status on Company Holidays.
    - **Implementation Details**:
        - **Logic**: Fetch `PublicHolidays`.
        - **Logic**: In Gap Filling, check if `Date` matches a Holiday -> Set Status "Holiday".

- [ ] [T-047] Default Date Range to Current Week
    - **Goal**: Narrow focus to current week by default.
    - **Implementation Details**:
        - **Logic**: Calculate Mon-Sun based on Today.
        - **State**: Init `startDate`/`endDate` with calculated values.

- [x] **[T-005-E9] Progress Synchronization Logic**
    - **Goal**: Ensure Task Assignment progress reflects latest Daily Report changes, including deletions.
    - **Implementation Details**:
        - **Logic**: `taskAssignService.ts` - `calculateTrueProgress` deduplicates logs by date and filters out deleted entries before updating Subtask.
    - **Confirmed Behavior**:
        - Deleting a Daily Report reverts Subtask progress to previous valid state.
        - Progress never "stucks" on a deleted value.

- [ ] **[T-005-E11-1] Deleted Tasks Visible in Relate Drawing**
    - **Goal**: Prevent deleted tasks from appearing in dropdowns.
    - **Implementation Details**:
        - **Logic**: `tasks/page.tsx` - Strict filtering of `taskStatus === 'DELETED'`.
    - **Confirmed Behavior**: Deleted tasks do not appear in Relate Drawing options.
