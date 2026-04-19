import { Suspense } from 'react';
import { DashboardQueue } from './dashboard-queue';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <DashboardQueue />
    </Suspense>
  );
}
