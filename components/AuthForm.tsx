// components/AuthForm.tsx
'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let result;
      
      if (isLogin) {
        // 1. เข้าสู่ระบบ (Sign In)
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        // 2. สมัครสมาชิก (Sign Up)
        result = await supabase.auth.signUp({ email, password });
      }

      if (result.error) throw result.error

      if (isLogin) {
        alert('✅ เข้าสู่ระบบสำเร็จ!');
      } else {
        alert('✅ สมัครสมาชิกสำเร็จ! (กรุณาเช็คอีเมลเพื่อยืนยัน ถ้ามีการตั้งค่าไว้)');
      }
      
      // พาไปหน้าหลักหลังจากสำเร็จ
      router.push('/'); 

    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: 'white' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '24px' }}>
        {isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
      </h2>
      <form onSubmit={handleAuth}>
        <input
          type="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={inputStyle}
        />
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
        </button>
      </form>

      <button 
        onClick={() => setIsLogin(!isLogin)} 
        style={{ background: 'none', border: 'none', color: '#0070f3', textDecoration: 'underline', marginTop: '15px', width: '100%', cursor: 'pointer' }}
      >
        {isLogin ? 'ยังไม่มีบัญชี? สมัครที่นี่' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
      </button>
    </div>
  )
}

// Style Helper
const inputStyle = {
  width: '100%',
  padding: '10px',
  marginBottom: '15px',
  border: '1px solid #ccc',
  borderRadius: '5px',
}

const buttonStyle = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#28a745',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold'
}