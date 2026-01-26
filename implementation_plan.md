# Implementation Plan: Standardize Subtask ID to Uppercase

## 1. Goal (เป้าหมาย)
บังคับให้ Subtask ID ถูกจัดเก็บเป็น **พิมพ์ใหญ่ทั้งหมด (UPPERCASE)** ในทุกจุดของระบบ เพื่อป้องกันปัญหาการ Matching ข้อมูลที่เกิดจาก Case Sensitivity

## 2. Current State (สภาพปัจจุบัน)
- Subtask ID มีทั้งแบบพิมพ์ใหญ่ทั้งหมด (`UFM-018-026-01`) และแบบผสมพิมพ์ (`TTS-BIM-Ufm-002-001-01`)
- ไม่มีการ Normalize ข้อมูลก่อนบันทึกหรือเปรียบเทียบ

## 3. Proposed Changes (การเปลี่ยนแปลงที่เสนอ)

### 3.1 Frontend Components (ส่วนหน้าบ้าน)

#### A. Task Assignment Page (`frontend/src/app/tasks/page.tsx`)
- **Location**: Input field สำหรับ Subtask ID
- **Action**:
  - เพิ่ม `.toUpperCase()` ใน `onChange` handler
  - แสดงผลเป็นพิมพ์ใหญ่ในตาราง

#### B. Task Management / Create Form
- **Location**: Dialog/Form สำหรับสร้าง Subtask ใหม่
- **Action**:
  - Transform input เป็น uppercase ก่อนบันทึก
  - Validate format (ถ้ามี)

#### C. Daily Report Page (`frontend/src/app/daily-report/page.tsx`)
- **Location**: การแสดงผล Subtask ID
- **Action**:
  - Ensure rendering เป็น uppercase
  - Normalize ตอนทำ lookup/comparison

### 3.2 Service Layer (ชั้น Service)

#### A. Task Service (`frontend/src/services/taskService.ts`)
- **Action**:
  - Normalize `subtaskId` เป็น uppercase ก่อน `save`/`update`
  - Normalize ตอน query/filter

#### B. Task Assign Service (`frontend/src/services/taskAssignService.ts`)
- **Action**:
  - Normalize ตอน fetch/save

#### C. Dashboard Service (`frontend/src/services/dashboardService.ts`)
- **Action**:
  - Normalize ตอนทำ comparison กับ whitelist

### 3.3 Database Migration (ไม่จำเป็นในเฟสแรก)
- **Note**: ข้อมูลเก่าใน Firestore จะค่อยๆ normalized ผ่านการแก้ไขครั้งถัดไป
- **Optional**: สร้าง Script migration สำหรับ update ข้อมูลเก่าทั้งหมด

## 4. Implementation Steps (ขั้นตอนการทำงาน)

### Phase 1: Frontend Input Normalization
1. ✅ Update Task Assignment Page (Input & Display)
2. ✅ Update Task Management Page (Create/Edit Forms)
3. ✅ Update Daily Report Page (Display)

### Phase 2: Service Layer Normalization
4. ✅ Update `taskService.ts` (Save/Update/Query)
5. ✅ Update `taskAssignService.ts` (Fetch/Save)
6. ✅ Update `dashboardService.ts` (Comparison)

### Phase 3: Testing & Verification
7. ✅ Test Create new Subtask → Verify stored as UPPERCASE
8. ✅ Test Edit existing Subtask → Verify normalized to UPPERCASE
9. ✅ Test Daily Report lookup → Verify matching works
10. ✅ Test Dashboard whitelist → Verify filtering works

## 5. Verification Plan (แผนการตรวจสอบ)

### Test Cases:
1. **Create Subtask**: Input `ufm-001-01` → Stored as `UFM-001-01`
2. **Edit Subtask**: Change `Ufm-002-01` → Saved as `UFM-002-01`
3. **Daily Report**: Select subtask `ufm-001-01` → Match with `UFM-001-01`
4. **Dashboard**: Filter by subtask `UFM-001-01` → Show all matching entries

### Acceptance Criteria:
- ✅ ทุก Subtask ID ใหม่ถูกบันทึกเป็นพิมพ์ใหญ่
- ✅ การแก้ไข Subtask ID เก่า normalize เป็นพิมพ์ใหญ่
- ✅ การเปรียบเทียบ/สืบหา ทำงานได้ถูกต้องไม่ว่า input จะเป็นพิมพ์ใหญ่หรือเล็ก
- ✅ UI แสดงผล Subtask ID เป็นพิมพ์ใหญ่ทุกที่

## 6. Files to Modify (ไฟล์ที่ต้องแก้ไข)

### Frontend:
1. `frontend/src/app/tasks/page.tsx` - Task Assignment Table
2. `frontend/src/app/daily-report/page.tsx` - Daily Report Display
3. `frontend/src/components/SubtaskAutocomplete.tsx` - Subtask Dropdown

### Services:
4. `frontend/src/services/taskService.ts` - Task CRUD
5. `frontend/src/services/taskAssignService.ts` - Assignment Service
6. `frontend/src/services/dashboardService.ts` - Dashboard Service

## 7. Risk Assessment (ประเมินความเสี่ยง)

### Low Risk:
- การเพิ่ม `.toUpperCase()` ใน Input fields
- การแสดงผล Uppercase ใน UI

### Medium Risk:
- การ Normalize ใน Service layer อาจกระทบ existing queries
- ต้องทดสอบให้ครอบคลุม

### Mitigation:
- Test ทุก CRUD operation
- ตรวจสอบ Console logs สำหรับ errors
- Backup database ก่อนเริ่มงาน (ถ้าทำ migration)

## 8. Dependencies (ความสัมพันธ์)
- **Traceability**: [F-005] Task Management, [F-006] Task Assignment, [F-003] Daily Reporting
- **Blocked By**: None
- **Blocks**: None

---

## Request for Approval (ขออนุมัติ)

โปรดตรวจสอบแผนงานด้านบนและยืนยันว่า:
1. ✅ แนวทางการแก้ไขถูกต้องตามความต้องการ
2. ✅ ไฟล์ที่ต้องแก้ไขครบถ้วน
3. ✅ Verification Plan เพียงพอ

**กรุณาตอบกลับ "อนุมัติ" หรือแจ้งข้อเสนอแนะเพิ่มเติมครับ**
