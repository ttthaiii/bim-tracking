export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
            <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">404 - ไม่พบหน้าเว็บ</h2>
                <p className="text-gray-500 mb-8">หน้าที่คุณพยายามเข้าถึงไม่มีอยู่ในระบบ หรือถูกย้ายไปแล้ว</p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    กลับสู่หน้าหลัก
                </Link>
            </div>
        </div>
    );
}
