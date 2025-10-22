"use client";

import React, { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import {
  UserRecord,
  getUsers,
  createUserRecord,
  updateUserRecord,
  deleteUserRecord,
} from "@/services/firebase";

interface ManageUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = ['BimModeler', 'BimCoordinate', 'BimLeader', 'BimManager'] as const;

const createEmptyForm = (): Partial<UserRecord> => ({
  employeeId: "",
  fullName: "",
  fullNameEn: "",
  username: "",
  role: "",
  email: "",
  password: "",
});

const ManageUsersModal: React.FC<ManageUsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRecord>>(createEmptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const normalizeNullable = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
      setError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setCreateForm(createEmptyForm());
      setEditingId(null);
      setEditForm(createEmptyForm());
      setDeleteConfirm(null);
    }
  }, [isOpen]);

  const isCreateValid = useMemo(() => {
    return (
      (createForm.employeeId || "").trim() !== "" &&
      (createForm.fullName || "").trim() !== "" &&
      (createForm.username || "").trim() !== "" &&
      (createForm.role || "").trim() !== ""
    );
  }, [createForm]);

  const isEditValid = useMemo(() => {
    return (
      (editForm.employeeId || "").trim() !== "" &&
      (editForm.fullName || "").trim() !== "" &&
      (editForm.username || "").trim() !== "" &&
      (editForm.role || "").trim() !== ""
    );
  }, [editForm]);

  const handleCreate = async () => {
    if (!isCreateValid) return;
    try {
      setLoading(true);
      const id = await createUserRecord({
        employeeId: createForm.employeeId!.trim(),
        fullName: createForm.fullName!.trim(),
        username: createForm.username!.trim(),
        role: createForm.role!.trim(),
        fullNameEn: createForm.fullNameEn?.trim() || undefined,
        email: createForm.email?.trim() || undefined,
        password: createForm.password?.trim() || undefined,
      });
      setUsers(prev => [
        {
          id,
          employeeId: createForm.employeeId!.trim(),
          fullName: createForm.fullName!.trim(),
          username: createForm.username!.trim(),
          role: createForm.role!.trim(),
          fullNameEn: createForm.fullNameEn?.trim(),
          email: createForm.email?.trim(),
          password: createForm.password?.trim(),
        },
        ...prev,
      ]);
      setCreateForm(createEmptyForm());
    } catch (err) {
      console.error("Failed to create user", err);
      setError("เกิดข้อผิดพลาดในการเพิ่มผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: UserRecord) => {
    setEditingId(user.id);
    setEditForm({
      id: user.id,
      employeeId: user.employeeId,
      fullName: user.fullName,
      fullNameEn: user.fullNameEn || "",
      username: user.username,
      role: user.role || "",
      email: user.email || "",
      password: user.password || "",
    });
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !isEditValid) return;
    try {
      setLoading(true);
      const normalizedFullNameEn = normalizeNullable(editForm.fullNameEn ?? null);
      const normalizedEmail = normalizeNullable(editForm.email ?? null);
      const normalizedPassword = normalizeNullable(editForm.password ?? null);
      await updateUserRecord(editingId, {
        employeeId: editForm.employeeId!.trim(),
        fullName: editForm.fullName!.trim(),
        username: editForm.username!.trim(),
        role: editForm.role!.trim(),
        fullNameEn: normalizedFullNameEn ?? undefined,
        email: normalizedEmail ?? undefined,
        password: normalizedPassword ?? undefined,
      });
      setUsers(prev => prev.map(user => user.id === editingId ? {
        id: editingId,
        employeeId: editForm.employeeId!.trim(),
        fullName: editForm.fullName!.trim(),
        username: editForm.username!.trim(),
        role: editForm.role!.trim(),
        fullNameEn: normalizedFullNameEn ?? undefined,
        email: normalizedEmail ?? undefined,
        password: normalizedPassword ?? undefined,
        deletedAt: user.deletedAt,
      } : user));
      setEditingId(null);
      setEditForm(createEmptyForm());
    } catch (err) {
      console.error("Failed to update user", err);
      setError("เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await deleteUserRecord(id);
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      console.error("Failed to delete user", err);
      setError("เกิดข้อผิดพลาดในการลบผู้ใช้");
    } finally {
      setLoading(false);
      setDeleteConfirm(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="จัดการสมาชิก"
      size="full"
      footer={<Button onClick={onClose}>ปิด</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {error && (
          <div style={{ padding: "12px", borderRadius: "8px", background: "#fee2e2", color: "#991b1b", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <div style={{ padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <div style={{ fontWeight: 600, marginBottom: "12px", color: "#111827" }}>เพิ่มผู้ใช้ใหม่</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <input
              placeholder="รหัสพนักงาน"
              value={createForm.employeeId}
              onChange={e => setCreateForm(prev => ({ ...prev, employeeId: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            />
            <input
              placeholder="ชื่อ-นามสกุล"
              value={createForm.fullName}
              onChange={e => setCreateForm(prev => ({ ...prev, fullName: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            />
            <input
              placeholder="ชื่อภาษาอังกฤษ"
              value={createForm.fullNameEn}
              onChange={e => setCreateForm(prev => ({ ...prev, fullNameEn: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            />
            <input
              placeholder="ชื่อผู้ใช้ (Username)"
              value={createForm.username}
              onChange={e => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            />
            <select
              value={createForm.role || ""}
              onChange={e => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#ffffff" }}
            >
              <option value="">เลือกบทบาท</option>
              {ROLE_OPTIONS.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <input
              placeholder="อีเมล"
              value={createForm.email}
              onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            />
            <input
              placeholder="รหัสผ่าน"
              value={createForm.password}
              onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
              style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
              type="password"
            />
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <Button onClick={handleCreate} disabled={!isCreateValid || loading}>
              เพิ่มผู้ใช้
            </Button>
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflowX: "auto", overflowY: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={{ padding: "10px", textAlign: "left" }}>รหัสพนักงาน</th>
                <th style={{ padding: "10px", textAlign: "left" }}>ชื่อ-นามสกุล</th>
                <th style={{ padding: "10px", textAlign: "left" }}>ชื่อผู้ใช้</th>
                <th style={{ padding: "10px", textAlign: "left" }}>บทบาท</th>
                <th style={{ padding: "10px", textAlign: "left" }}>อีเมล</th>
                <th style={{ padding: "10px", textAlign: "left" }}>รหัสผ่าน</th>
                <th style={{ padding: "10px", textAlign: "center", width: "140px" }}>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>กำลังโหลด...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#6b7280" }}>ยังไม่มีข้อมูลผู้ใช้</td>
                </tr>
              ) : (
                users.map((user) => {
                  const isEditingRow = editingId === user.id;
                  return (
                    <tr key={user.id} style={{ borderTop: "1px solid #e5e7eb", background: isEditingRow ? "#fff7ed" : "#ffffff" }}>
                      <td style={{ padding: "10px" }}>
                        {isEditingRow ? (
                          <input
                            value={editForm.employeeId}
                            onChange={e => setEditForm(prev => ({ ...prev, employeeId: e.target.value }))}
                            style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                          />
                        ) : (
                          user.employeeId
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {isEditingRow ? (
                <input
                  value={editForm.fullName}
                  onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  placeholder="ชื่อ-นามสกุล"
                />
              ) : (
                <div>{user.fullName}</div>
              )}
              {isEditingRow ? (
                <input
                  value={editForm.fullNameEn || ""}
                  onChange={e => setEditForm(prev => ({ ...prev, fullNameEn: e.target.value }))}
                  style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                  placeholder="ชื่อภาษาอังกฤษ"
                />
              ) : (
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{user.fullNameEn || '-'}</div>
              )}
            </div>
          </td>
          <td style={{ padding: "10px" }}>
            {isEditingRow ? (
              <input
                value={editForm.username}
                            onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                            style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                          />
                        ) : (
                          user.username
                        )}
                      </td>
          <td style={{ padding: "10px" }}>
            {isEditingRow ? (
              <select
                value={editForm.role || ""}
                onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px", background: "#ffffff" }}
              >
                <option value="">เลือกบทบาท</option>
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            ) : (
              user.role
            )}
          </td>
          <td style={{ padding: "10px" }}>
            {isEditingRow ? (
              <input
                value={editForm.email || ""}
                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                placeholder="อีเมล"
              />
            ) : (
              user.email || '-'
            )}
          </td>
          <td style={{ padding: "10px" }}>
            {isEditingRow ? (
              <input
                type="password"
                value={editForm.password || ""}
                onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                style={{ padding: "6px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
                placeholder="รหัสผ่าน"
              />
            ) : (
              user.password ? '••••••' : '-'
            )}
          </td>
          <td style={{ padding: "10px", textAlign: "center" }}>
            {isEditingRow ? (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                <Button onClick={handleSaveEdit} disabled={!isEditValid || loading}>บันทึก</Button>
                <Button variant="outline" onClick={() => { setEditingId(null); setEditForm(createEmptyForm()); }}>ยกเลิก</Button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                            <Button variant="outline" onClick={() => handleEdit(user)}>แก้ไข</Button>
                            <Button variant="danger" onClick={() => setDeleteConfirm(user.id)}>ลบ</Button>
                          </div>
                        )}
                        {deleteConfirm === user.id && (
                          <div style={{ marginTop: "12px", fontSize: "12px", color: "#dc2626" }}>
                            <div>ยืนยันการลบผู้ใช้นี้?</div>
                            <div style={{ marginTop: "8px", display: "flex", gap: "8px", justifyContent: "center" }}>
                              <Button variant="danger" onClick={() => handleDelete(user.id!)}>ลบ</Button>
                              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

export default ManageUsersModal;
