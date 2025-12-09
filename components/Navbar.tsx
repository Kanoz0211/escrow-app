// components/Navbar.tsx
'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. เช็คตอนเข้าเว็บว่าใครล็อกอินอยู่
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // 2. ฟังเหตุการณ์ Login/Logout (เมนูเปลี่ยนเองไม่ต้องรีเฟรช)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') router.push('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // alert('ออกจากระบบเรียบร้อย'); // เอาออกก็ได้จะได้ไม่รก
    router.push('/');
  };

  return (
    <nav style={navStyle}>
      <div style={containerStyle}>
        {/* Logo ฝั่งซ้าย */}
        <Link href="/" style={logoStyle}>
          🛒 ESCROW <span style={{ color: '#d4af37' }}>GOLD</span>
        </Link>

        {/* เมนูฝั่งขวา */}
        <div style={menuStyle}>
          <Link href="/" style={linkStyle}>หน้าแรก</Link>
          
          {user ? (
            <>
              {/* 👇 เพิ่มปุ่มนี้ครับ */}
              <Link href="/dashboard" style={linkStyle}>บัญชีของฉัน</Link>
              
              <Link href="/sell" style={linkStyle}>ลงขายสินค้า</Link>
              <Link href="/admin" style={linkStyle}>Admin</Link>
              
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

// --- CSS Styles (Theme: Luxury Gold & White) ---
const navStyle = {
  backgroundColor: '#ffffff',
  borderBottom: '1px solid #f0f0f0',
  boxShadow: '0 4px 20px rgba(0,0,0,0.03)', // เงาบางๆ
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
  gap: '25px' // ระยะห่างเมนู
};

const linkStyle = {
  color: '#636e72',
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '14px',
  transition: 'color 0.2s',
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
  transition: 'all 0.2s',
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
};

const logoutBtnStyle = {
  padding: '8px 16px',
  backgroundColor: 'transparent',
  border: '1px solid #ff7675',
  color: '#ff7675', // สีแดงอ่อนๆ ดูแพง
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600'
};