'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md">
                <h2 className="text-2xl font-bold text-red-600 mb-4">ระบบเกิดข้อผิดพลาด (500)</h2>
                <p className="text-gray-500 mb-6">ขออภัย เกิดข้อผิดพลาดบางอย่างในระบบ กรุณาลองใหม่อีกครั้ง</p>
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                        ลองใหม่อีกครั้ง
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    );
}
