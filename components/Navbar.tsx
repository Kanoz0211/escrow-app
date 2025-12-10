// components/Navbar.tsx
'use client'

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // State สำหรับ Dropdown ของ Admin
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ⚠️ ระบุอีเมลแอดมินตรงนี้ (เปลี่ยนเป็นอีเมลลูกพี่!)
  const ADMIN_EMAIL = 'kkanoz0211@gmail.com'; // <--- เปลี่ยนตรงนี้!!!
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') router.push('/');
    });

    // ปิด Dropdown เมื่อคลิกที่อื่น
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        
        {/* --- LOGO --- */}
        <Link href="/" style={logoStyle}>
          🛒 ESCROW <span style={{ color: '#d4af37' }}>GOLD</span>
        </Link>

        {/* --- MENU --- */}
        <div style={menuStyle}>
          <Link href="/" style={linkStyle}>หน้าแรก</Link>
          
          {user ? (
            <>
              {/* เมนูสำหรับสมาชิกทั่วไป */}
              <Link href="/dashboard" style={linkStyle}>บัญชีของฉัน</Link>
              <Link href="/sell" style={linkStyle}>ลงขายสินค้า</Link>
              <Link href="/settings" style={linkStyle}>⚙️ ตั้งค่า</Link>
              
              {/* 👑 เมนู ADMIN DROPDOWN (เห็นเฉพาะ Admin ตัวจริง) */}
              {isAdmin && (
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button 
                    onClick={() => setIsAdminDropdownOpen(!isAdminDropdownOpen)}
                    style={adminBtnStyle}
                  >
                    👮‍♂️ Admin Tools ▾
                  </button>
                  
                  {isAdminDropdownOpen && (
                    <div style={dropdownMenuStyle}>
                      <Link href="/admin" onClick={() => setIsAdminDropdownOpen(false)} style={dropdownItemStyle}>
                        ⚖️ ห้องพิจารณาคดี (Dashboard)
                      </Link>
                      <a href="https://dashboard.omise.co/test/charges" target="_blank" style={dropdownItemStyle}>
                        💸 ไปหน้า Omise (การเงิน)
                      </a>
                      <a href="https://www.blacklistseller.com/" target="_blank" style={dropdownItemStyle}>
                        🔍 เว็บเช็คคนโกง
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              <button onClick={handleLogout} style={logoutBtnStyle}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <Link href="/auth" style={loginBtnStyle}>
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// --- CSS Styles ---
const navStyle = {
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #f0f0f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  position: 'sticky' as const,
  top: 0,
  zIndex: 100,
  padding: '15px 0'
};

const containerStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const logoStyle = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#2d3436',
  textDecoration: 'none',
  letterSpacing: '-0.5px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
};

const menuStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '20px'
};

const linkStyle = {
  color: '#636e72',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer'
};

const loginBtnStyle = {
  padding: '10px 20px',
  backgroundColor: '#2d3436',
  color: '#d4af37',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: 'bold',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
};

const logoutBtnStyle = {
  padding: '8px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #ff7675',
  color: '#ff7675',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600'
};

// สไตล์ปุ่ม Admin Dropdown
const adminBtnStyle = {
  padding: '8px 12px',
  backgroundColor: '#2d3436',
  color: '#d4af37', // ทอง
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
};

// สไตล์กล่อง Dropdown
const dropdownMenuStyle = {
  position: 'absolute' as const,
  top: '40px',
  right: '0',
  backgroundColor: 'white',
  minWidth: '220px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
  borderRadius: '8px',
  border: '1px solid #eee',
  padding: '10px 0',
  zIndex: 1000,
  overflow: 'hidden'
};

const dropdownItemStyle = {
  display: 'block',
  padding: '12px 20px',
  color: '#2d3436',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background 0.2s',
  borderBottom: '1px solid #f9f9f9',
  ':hover': {
      backgroundColor: '#f8f9fa'
  }
};