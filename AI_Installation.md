# AI Collaboration Protocol (The "Spec-First" Model)

เอกสารนี้สรุปขั้นตอนมาตรฐาน (Standard Operating Procedure) สำหรับการเริ่มและดำเนินโปรเจกต์ร่วมกับ AI เพื่อให้ได้โครงสร้างที่เป็นระเบียบ ตรวจสอบได้ และลดข้อผิดพลาด (Traceability & Maintainability)

---

## Phase 1: Preparation (Context Setting)
**Goal**: เตรียมพื้นที่สมอง (Brain) ให้ AI เข้าใจขอบเขตงานและโครงสร้างมาตรฐานและกฎการทำงานที่เคร่งครัด

**คำสั่งเริ่มโปรเจกต์ (Initial Prompt):**
> "เราจะเริ่มโปรเจกต์ใหม่ชื่อ **[Project Name]** โดยเน้นความเป็นระเบียบและ Traceability สูง และยึดหลัก **Spec-First Development**
>
> ขอให้ช่วยเตรียมการดังนี้:
> 1. สร้าง Folder `spec_project_detail/`
> 2. สร้างไฟล์เปล่า 3 ไฟล์รอไว้ก่อน:
>    - `spec.md` (Functional Spec)
>    - `instruction.md` (Tech Stack & Conventions)
>    - `task.md` (Checklist Roadmap)
>    - `traceability.md` (Traceability Matrix)
> 3. อ่านและทำความเข้าใจ `implement.md` (ถ้ามี) หรือเตรียมตัวสำหรับ Protocol การทำงานแบบ 8 ขั้นตอน
>
> **กฎเหล็ก**: ยังไม่ต้องเขียน Code จนกว่าเราจะทำเอกสาร specification เสร็จและแผนงานได้รับการอนุมัติ"

---

## Phase 1.5: Adoption (Onboarding Existing Project)
**Goal**: สำหรับโปรเจกต์ที่มี Code อยู่แล้ว ต้องการนำเข้าสู่ระบบ **Spec-Kit Development Model** โดยให้ AI ทำการ Reverse Engineer เอกสารออกมา

**คำสั่งเริ่มงาน (Adoption Prompt):**
> "เรามีโปรเจกต์เดิมชื่อ **[Project Name]** ที่ต้องการนำเข้าสู่ระบบมาตรฐาน **Spec-Kit**
>
> **ภารกิจ (Mission):**
>
> 1.  **Survey & Analyze**:
>     -   รบกวนช่วย Scan โครงสร้าง Folder ทั้งหมด (`list_dir`)
>     -   อ่าน `package.json` เพื่อดู Tech Stack
>     -   สุ่มอ่านไฟล์สำคัญใน `src/` เพื่อดู Coding Style
>
> 2.  **Reverse Engineer Documentation** (สร้างไฟล์ใน `spec_project_detail/`):
>     -   **`instruction.md`**: ร่างคู่มือพัฒนาจากสิ่งที่คุณเห็น (Framework, Libs, Conventions)
>     -   **`spec.md`**: แกะฟีเจอร์จาก Code ที่มี เขียนเป็น Feature List `[F-XXX]` พร้อม User Flow คร่าวๆ
>     -   **`traceability.md`**: สร้างตารางเชื่อมโยง Code ปัจจุบันเข้ากับ Feature IDs `[F-XXX]`
>     -   **`task.md`**:
>         -   สร้าง Section "Phase 1: Existing Features" แล้ว Mark [x] ให้งานที่เสร็จแล้ว
>         -   สร้าง Section "Phase 2: Next Steps" สำหรับสิ่งที่ต้องทำต่อ (ถ้ามี)
>
> 3.  **Action Plan**:
>     -   เมื่อสร้างเอกสารเสร็จแล้ว ให้สรุปว่า **"สถานะปัจจุบันของโปรเจกต์คืออะไร"** และรอคำสั่งต่อไป
>
> **หมายเหตุ**: ห้ามแก้ Code ใดๆ ในขั้นตอนนี้ เน้นการทำเอกสารให้ตรงกับ Code จริงก่อน"

---

## Phase 2: The 3 Pillars (Documentation First)
**Goal**: สร้าง Single Source of Truth ที่ AI และ User ยึดถือร่วมกัน

### Step 2.1: Functional Spec (`spec.md`)
**Prompt Guidance:**
> "เริ่มร่าง `spec.md` โดยใช้โครงสร้างมาตรฐาน:
> 1. **System Features**:
>    - **Rich Feature Schema** (`[F-XXX]`):
>      - **Description**: คำอธิบาย
>      - **User Flow**: Step-by-step
>      - **Key Components**: Path ของไฟล์
>      - **Data Usage**: Entity.field ที่เกี่ยวข้อง
> 2. **Data Models**: Mermaid ER Diagram
> 3. **Architecture**: Mermaid Diagram

### Step 2.2: Instruction & Standards (`instruction.md`)
**Prompt Guidance:**
> "ร่าง `instruction.md`:
> 1. **Tech Stack**: ภาษา, Framework
> 2. **Folder Structure**: Root & Source Level
> 3. **Conventions**: Naming, State Management rules"

### Step 2.3: Task Roadmap (`task.md`)
**Prompt Guidance:**
> "ร่าง `task.md` โดยแบ่ง Phase และใช้ **Rich Task Schema**:
> - [ ] **[T-XXX] Task Name**
>     - **Concept/Goal**: เป้าหมาย
>     - **Principles**: หลักการออกแบบ
>     - **Implementation Details**: UI, Logic, Data
>     - **Confirmed Behavior**: สิ่งที่ต้อง Test
>     - **Traceability**: [F-XXX] ลิงก์กลับไปที่ Spec"

---

## Phase 3: Traceability (The Matrix)
**Goal**: เชื่อมโยง Requirement -> Task -> Code

**Prompt Guidance:**
> "สร้าง `traceability.md` ด้วย 2 ตารางมาตรฐาน:
> 1. **RTM**: `| Feature ID | Name | Tasks | Files | Status |`
> 2. **Data Traceability**: `| Entity | Type | Key State Vars | Related Files | Notes |`"

---

## Phase 4: Implementation Protocol (Strict 8-Step Workflow)
**Goal**: ควบคุมทิศทางการเขียน Code ด้วยเอกสารอย่างเคร่งครัดตาม `implement.md`

### 1. Context Loading & Rehydration
ทุกครั้งที่เริ่ม Session ให้ AI อ่าน 4 ไฟล์หลัก (`instruction`, `spec`, `traceability`, `task`) และสรุปสถานะปัจจุบัน

### 2. Analysis & Planning
- วิเคราะห์ผลกระทบ (Impact Analysis)
- ใช้ **CRUD Heuristic**: เพิ่ม Field -> แก้ 3 จุด (Create, View, Edit)

### 3. Ephemeral Planning (Mandatory)
- **ห้ามข้ามขั้นตอน**: สร้างไฟล์ `implementation_plan.md` เสมอ
- ระบุ Goal, Proposed Changes, Verification Plan
- ใช้ `notify_user` ขอ Approval ก่อนไปต่อ

### 4. Permanent Documentation (Critical Gatekeeper)
- **Pre-condition**: Plan Approved
- **Action**: อัปเดตไฟล์จริง **ก่อน** เขียนโค้ด
    1. **Update `task.md`**: สร้าง Task ใหม่ หรือ log error ใส่ Task เดิม (No New Task Policy สำหรับ Bug)
    2. **Update `traceability.md`**: เพิ่ม Task/Feature ใหม่
    3. **Update `spec.md`**: ปรับ User Flow หรือ Data Model
- *Gatekeeper*: ห้ามเริ่ม Coding ถ้าเอกสารไม่ครบ 4 ฉบับ

### 5. Implementation
- เขียน Code ตามแผนที่วางไว้
- ทำทีละ Sub-task

### 6. Verification
- รัน Lint/Build/Test
- ตรวจสอบตาม "Confirmed Behavior"

### 7. Closure & Handoff
- [x] Mark Complete ใน `task.md`
- อัปเดต Status ใน `traceability.md`

### 8. Documentation Summary (Mandatory Final Check)
- **ต้องสรุปท้ายสุดเสมอ**:
  ```markdown
  ### Documentation Summary
  1. **instruction.md**: [Updated/No Change]
  2. **spec.md**: [Updated/No Change]
  3. **task.md**: [Updated] - Marked T-XXX as complete
  4. **traceability.md**: [Updated] - Updated status
  ```

---

## Error Handling Standards
หากเจอ Error ให้บันทึกแบบ **Nested Log** ใน `task.md` (ห้ามสร้าง Task ใหม่สำหรับ Bug ของงานเดิม):

```markdown
- [ ] [T-XXX] Task Name
    - **Error Logs**:
      - **[T-XXX-EX-Y]**: Error Name
        1. **Root Cause**: ...
        2. **Action**: ...
        3. **Status**: Fixed
```

---

## Phase 5: Deployment & Handoff (Rehydration)

**Rehydration Prompt (คำสั่งเริ่มงานต่อ):**
> "สวัสดี เรากำลังทำโปรเจกต์ **[Project Name]** ต่อจากเดิม
>
> **Mission:**
> 1.  เข้าไปอ่านโฟลเดอร์ `spec_project_detail/`
> 2.  อ่าน (Contextualize) 4 ไฟล์หลัก: `instruction.md`, `spec.md`, `traceability.md`, `task.md`
> 3.  **สรุปสถานะปัจจุบัน** จาก `task.md` ว่าล่าสุดทำอะไรเสร็จ และ Next Step คืออะไร
> 4.  **ห้ามแก้ไข Code** จนกว่าจะเข้าใจเอกสารครบถ้วน และเริ่มทำตาม Protocol ข้อ 3 (Ephemeral Planning)"

---

## Summary Checklist for New Project
- [ ] Folder `spec_project_detail/` created
- [ ] `spec.md` defined with [F-XXX]
- [ ] `instruction.md` defined
- [ ] `task.md` initialized with [T-XXX]
- [ ] `traceability.md` initialized with RTM & Data Tables
- [ ] **Handoff Prompt** ready
