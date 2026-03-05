import React, { useState } from 'react';

interface RejectTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    taskName: string;
}

const RejectTaskModal: React.FC<RejectTaskModalProps> = ({ isOpen, onClose, onConfirm, taskName }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0, 0, 0, 0.5)" }}>
            <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#111827", display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#dc2626' }}>⚠️</span> ปฏิเสธการรับงาน
                </h2>

                <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#4b5563", lineHeight: 1.5 }}>
                    คุณต้องการปฏิเสธงาน <strong>{taskName}</strong> ใช่หรือไม่?
                </p>

                <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#374151", marginBottom: "8px" }}>
                        เหตุผลที่ปฏิเสธ (จำเป็นต้องระบุ)
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="โปรดระบุเหตุผล เช่น ข้อมูลไม่ครบถ้วน, ขอบเขตงานไม่ชัดเจน..."
                        style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", minHeight: "80px", fontSize: "14px", fontFamily: "inherit" }}
                    />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                    <button
                        onClick={() => {
                            setReason('');
                            onClose();
                        }}
                        style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "14px", cursor: "pointer", fontWeight: 500 }}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => {
                            if (reason.trim()) {
                                onConfirm(reason.trim());
                                setReason('');
                            }
                        }}
                        disabled={!reason.trim()}
                        style={{ padding: "8px 16px", borderRadius: "4px", border: "none", background: reason.trim() ? "#dc2626" : "#fca5a5", color: "#fff", fontSize: "14px", cursor: reason.trim() ? "pointer" : "not-allowed", fontWeight: 500 }}
                    >
                        ยืนยันการปฏิเสธ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RejectTaskModal;
