import { redirect } from 'next/navigation';

export default function MinePage() {
  redirect('/dashboard?assignedMe=true');
}
