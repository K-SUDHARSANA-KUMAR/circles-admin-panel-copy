import NavKeys from '@/constants/navkeys';
import { redirect } from 'next/navigation';

export default function AdsPage() {
  // Single source of truth: use dashboard advertisement pages
  redirect(NavKeys.Advertisement);
}
