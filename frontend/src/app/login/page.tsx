      'use client';

      // ✅ เพิ่มบรรทัดนี้
      export const dynamic = 'force-dynamic';

      import { useState } from 'react';
      import { useRouter } from 'next/navigation';
      import { db } from '@/lib/firebase'; 
      import { collection, query, where, getDocs } from 'firebase/firestore';
      import { useAuth } from '@/context/AuthContext'; // Import useAuth hook
      import { User as AppUser } from '@/types/database'; // Import AppUser type

      export default function LoginPage() {
        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');
        const router = useRouter();
        const { loginUser } = useAuth(); // Get loginUser function from AuthContext

        const handleLogin = async (e: React.FormEvent) => {
          e.preventDefault();
          setError('');

          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('username', '==', username.toLowerCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
              return;
            }

            const userData = querySnapshot.docs[0].data() as AppUser; // Cast to AppUser

            if (userData.password === password) {
              // Call loginUser from AuthContext to set global state and redirect
              loginUser(userData);
              // No need for router.push('/dashboard') here as loginUser handles it
            } else {
              setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            }
          } catch (err: any) {
            console.error("Login error:", err);
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
          }
        };

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
              <h1 className="text-2xl font-bold mb-6 text-center">เข้าสู่ระบบ</h1>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <form onSubmit={handleLogin}>
                <div className="mb-4">
                  <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                    ชื่อผู้ใช้
                  </label>
                  <input
                    type="text"
                    id="username"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                    รหัสผ่าน
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                  >
                    เข้าสู่ระบบ
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      }