import Link from 'next/link';
import { useState } from 'react';
import { isLoggedIn, logout as authLogout } from '../lib/auth';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';

export default function Nav() {
  const router = useRouter();
  const loggedIn = typeof window !== 'undefined' && isLoggedIn();
  const [open, setOpen] = useState(false);

  function logout() {
    authLogout();
    router.push('/login');
  }

  return (
    <nav className="bg-white shadow p-3 flex items-center justify-between">
      <div className="text-lg font-semibold">Admin</div>
      <button
        className="lg:hidden p-2"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className={`${open ? 'block' : 'hidden'} lg:flex space-x-3`}> 
        <Link href="/admin/companies"><a className="text-gray-700">Companies</a></Link>
        {loggedIn ? (
          <button onClick={logout} className="text-red-600">Logout</button>
        ) : (
          <Link href="/login"><a>Login</a></Link>
        )}
      </div>
    </nav>
  );
}
