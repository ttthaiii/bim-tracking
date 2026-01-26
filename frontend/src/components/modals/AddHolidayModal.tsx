import React, { useState, useEffect } from 'react';
import { getPublicHolidays, deletePublicHoliday, PublicHoliday } from '@/services/holidayService';

interface AddHolidayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (holidays: { date: string, label: string }[]) => Promise<void>;
    initialDate?: string; // YYYY-MM-DD
}

interface HolidayDraft {
    id: string;
    date: string;
    label: string;
}

export const AddHolidayModal: React.FC<AddHolidayModalProps> = ({ isOpen, onClose, onSubmit, initialDate }) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Data
    const [existingHolidays, setExistingHolidays] = useState<PublicHoliday[]>([]);

    // Form Input
    const [date, setDate] = useState('');
    const [label, setLabel] = useState('');

    // Draft List
    const [drafts, setDrafts] = useState<HolidayDraft[]>([]);
    const [loading, setLoading] = useState(false);

    // Initialize logic
    useEffect(() => {
        if (isOpen) {
            const nowYear = new Date().getFullYear();
            if (initialDate) {
                const d = new Date(initialDate);
                if (!isNaN(d.getTime())) {
                    setSelectedYear(d.getFullYear());
                    setDate(initialDate);
                }
            } else {
                setSelectedYear(nowYear);
                setDate('');
            }
            // Reset other states
            setLabel('');
            setDrafts([]);
        }
    }, [isOpen, initialDate]);

    // Fetch existing holidays when year changes or on open
    useEffect(() => {
        if (!isOpen) return;
        const loadHolidays = async () => {
            const data = await getPublicHolidays(selectedYear);
            // Sort by date asc
            data.sort((a, b) => a.date.localeCompare(b.date));
            setExistingHolidays(data);
        };
        loadHolidays();
    }, [isOpen, selectedYear]);

    const handleAddToList = () => {
        if (!date || !label) return;

        // Validate Year
        const d = new Date(date);
        if (d.getFullYear() !== selectedYear) {
            alert(`กรุณาเลือกวันที่ในปี ${selectedYear} เท่านั้น`);
            return;
        }

        // Check duplicate in existing
        if (existingHolidays.some(h => h.date === date)) {
            alert('วันนี้มีอยู่ในระบบแล้ว');
            return;
        }
        // Check duplicate in drafts
        if (drafts.some(d => d.date === date)) {
            alert('วันนี้อยู่ในรายการที่กำลังจะเพิ่มแล้ว');
            return;
        }

        const newDraft: HolidayDraft = {
            id: Math.random().toString(36).substr(2, 9),
            date,
            label
        };

        // Sort by date
        const newDrafts = [...drafts, newDraft].sort((a, b) => a.date.localeCompare(b.date));
        setDrafts(newDrafts);

        // Reset inputs
        setLabel('');
        setDate('');
    };

    const handleRemoveDraft = (id: string) => {
        setDrafts(prev => prev.filter(d => d.id !== id));
    };

    const handleDeleteExisting = async (id: string, dateStr: string, labelStr: string) => {
        if (!confirm(`ต้องการลบวันหยุด "${labelStr} (${dateStr})" ใช่หรือไม่?`)) return;

        try {
            await deletePublicHoliday(id);
            // Optimistic update
            setExistingHolidays(prev => prev.filter(h => h.id !== id));
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSaveAll = async () => {
        if (drafts.length === 0) return;

        setLoading(true);
        try {
            // Remove id before sending
            const payload = drafts.map(({ date, label }) => ({ date, label }));
            await onSubmit(payload);
            // Don't close immediately? Or refresh? 
            // Better to refresh list and clear drafts so user can continue working?
            // User requested "Add", usually implies closing. 
            // But for "Manager", maybe stay open? 
            // Let's stick to closing for now as per previous behavior, unless "Save & Continue" is requested.
            onClose();
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการบันทึกวันหยุด');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '8px', padding: '24px',
                width: '100%', maxWidth: '700px', // Wider for table
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                        จัดการวันหยุดประจำปี (Holiday Manager)
                    </h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}>
                        &times;
                    </button>
                </div>

                {/* Year Selector */}
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
                        เลือกปี (Year)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => setSelectedYear(prev => prev - 1)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                        >
                            &lt;
                        </button>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>{selectedYear}</span>
                        <button
                            type="button"
                            onClick={() => setSelectedYear(prev => prev + 1)}
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                        >
                            &gt;
                        </button>
                    </div>
                </div>

                {/* Input Form */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#6b7280' }}>วันที่</label>
                        <input
                            type="date"
                            value={date}
                            min={`${selectedYear}-01-01`}
                            max={`${selectedYear}-12-31`}
                            onChange={e => setDate(e.target.value)}
                            style={{
                                width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
                            }}
                        />
                    </div>
                    <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#6b7280' }}>ชื่อวันหยุด</label>
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="เช่น วันขึ้นปีใหม่"
                            onKeyDown={e => e.key === 'Enter' && handleAddToList()}
                            style={{
                                width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '14px'
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddToList}
                        disabled={!date || !label}
                        style={{
                            padding: '8px 16px', borderRadius: '4px', border: 'none',
                            background: '#10b981', color: 'white', cursor: (!date || !label) ? 'not-allowed' : 'pointer', fontSize: '14px',
                            fontWeight: 600
                        }}
                    >
                        เพิ่ม +
                    </button>
                </div>

                {/* Combined List Table */}
                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}>
                            <tr>
                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '120px' }}>วันที่ ({selectedYear})</th>
                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ชื่อวันหยุด</th>
                                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '80px' }}>สถานะ</th>
                                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '60px' }}>ลบ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Existing Holidays Section */}
                            {existingHolidays.map((h) => (
                                <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6', background: '#fff' }}>
                                    <td style={{ padding: '8px', color: '#374151' }}>
                                        {new Date(h.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td style={{ padding: '8px', color: '#374151' }}>{h.label}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', background: '#e5e7eb', color: '#374151', padding: '2px 6px', borderRadius: '4px' }}>
                                            Saved
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDeleteExisting(h.id!, h.date, h.label)}
                                            title="ลบรายการเดิม"
                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Drafts Section */}
                            {drafts.map((draft) => (
                                <tr key={draft.id} style={{ borderBottom: '1px solid #f3f4f6', background: '#f0fdf4' }}>
                                    <td style={{ padding: '8px', color: '#111827', fontWeight: '500' }}>
                                        {new Date(draft.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                    </td>
                                    <td style={{ padding: '8px', color: '#111827', fontWeight: '500' }}>{draft.label}</td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>
                                            New
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleRemoveDraft(draft.id)}
                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {existingHolidays.length === 0 && drafts.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                        ไม่มีรายการวันหยุดในปี {selectedYear}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '8px 16px', borderRadius: '4px', border: '1px solid #d1d5db',
                            background: 'white', color: '#374151', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        ปิด
                    </button>
                    {drafts.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={loading}
                            style={{
                                padding: '8px 24px', borderRadius: '4px', border: 'none',
                                background: '#6366f1', color: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                                fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center'
                            }}
                        >
                            {loading ? 'กำลังบันทึก...' : `บันทึกรายการใหม่ (${drafts.length})`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
