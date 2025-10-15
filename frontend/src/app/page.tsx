/*'use client';

import Link from 'next/link';
import PageLayout from '@/components/shared/PageLayout';

const features = [
  {
    name: 'Project Dashboard',
    description: 'Visualize project statistics and track progress in real-time.',
    path: '/dashboard',
    icon: '📊',
  },
  {
    name: 'Manage Projects',
    description: 'Create, update, and manage all your projects from one place.',
    path: '/projects',
    icon: '📂',
  },
  {
    name: 'Document Tracking',
    description: 'Track the status and revisions of all project documents.',
    path: '/document-tracking',
    icon: '📄',
  },
  {
    name: 'Task Assignment',
    description: 'Assign and monitor tasks for different team members.',
    path: '/task-assignment',
    icon: '📝',
  },
];

export default function LandingPage() {
  return (
    <PageLayout>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800">Welcome to BIM Tracking</h1>
        <p className="text-lg text-gray-800 mt-4">Your central hub for managing and monitoring construction projects.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {features.map((feature) => (
          <Link href={feature.path} key={feature.name}>
            <div className="block bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{feature.name}</h2>
              <p className="text-gray-800">{feature.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
*/
// frontend/src/app/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <p>กำลังเปลี่ยนเส้นทางไปยังแดชบอร์ด...</p>
    </div>
  );
}