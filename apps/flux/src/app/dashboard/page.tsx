import { Suspense } from 'react';
import { DashboardQueue } from './dashboard-queue';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <span className="spinner" />
        </div>
      }
    >
      <DashboardQueue />
    </Suspense>
  );
}
