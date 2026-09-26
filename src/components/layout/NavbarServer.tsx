import { auth, signOut } from '@/auth';
import Navbar from './Navbar';

export default async function NavbarServer() {
  const session = await auth();
  return <Navbar user={session?.user ?? null} />;
}
