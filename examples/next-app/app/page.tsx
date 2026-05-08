import { redirect } from 'next/navigation';

export default function Home() {
  // Single sample application id seeded into the in-memory store.
  redirect('/applications/demo');
}
