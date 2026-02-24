'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
                    <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-md">
                        <h2 className="text-3xl font-bold text-red-600 mb-4">500 Server Error</h2>
                        <p className="text-gray-500 mb-6">ขออภัย เซิร์ฟเวอร์เกิดข้อผิดพลาดร้ายแรง</p>
                        <button
                            onClick={() => reset()}
                            className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                        >
                            รีเฟรชหน้าเว็บใหม่
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
