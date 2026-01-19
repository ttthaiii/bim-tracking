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
- [ ] **[T-020] Task Table Loading State**
    - **Concept/Goal**: Visual feedback during async operations.
    - **Implementation Details**:
        - **UI/UX**: `LoadingOverlay` component.
        - **Logic**: Wrap `fetchProjectData` with `setLoading(true/false)`.
    - **Confirmed Behavior**: Screen blurs and shows spinner while data is loading.
- [ ] **[T-003-EX-20] Fix Leave Keyword Detection**
    - **Concept/Goal**: Prevent false positives on leave detection (e.g., 'ทางลาด').
    - **Implementation Details**:
        - **Logic**: Update `NON_WORK_KEYWORDS` in `page.tsx` to `['ลางาน', 'ประชุม', 'meeting']`.
    - **Confirmed Behavior**: 'ทางลาด' input is unlocked; 'ลางาน' input is locked.
```
