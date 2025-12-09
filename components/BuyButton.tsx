// components/BuyButton.tsx
'use client'

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function BuyButton({ product }: { product: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleBuy = async () => {
    if (loading) return;

    setLoading(true);

    try {
      // 1. เช็คก่อนว่า "ใครล็อกอินอยู่?" (สำคัญมาก!)
      const { data: { user } } = await supabase.auth.getUser();

      // ถ้าไม่มีคนล็อกอิน -> ดีดไปหน้า Login/Register
      if (!user) {
        alert('กรุณาเข้าสู่ระบบก่อนสั่งซื้อสินค้า');
        router.push('/auth');
        return;
      }

      // 2. (Optional) ป้องกันไม่ให้ซื้อของตัวเอง
      if (user.id === product.seller_id) {
        alert('คุณไม่สามารถซื้อสินค้าของตัวเองได้ (ใจเย็นๆ นะวัยรุ่น)');
        return;
      }

      const confirmBuy = confirm(`คุณต้องการซื้อ "${product.title}" ราคา ${product.price} บาท ใช่ไหม?`);
      if (!confirmBuy) return;

      // 3. สร้าง Order โดยใช้ "ไอดีจริง" ของคนที่ล็อกอินอยู่
      const { data, error } = await supabase
        .from('orders')
        .insert([
          {
            buyer_id: user.id,          // ✅ ใช้ ID ของคนที่ล็อกอินอยู่จริงๆ!
            seller_id: product.seller_id,
            product_id: product.id,
            amount: product.price,
            status: 'WAITING_PAYMENT' 
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // 4. ไปหน้าจ่ายเงิน
      router.push(`/orders/${data.id}`); 

    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleBuy}
      disabled={loading}
      style={{
        marginTop: '15px',
        width: '100%',
        padding: '10px',
        backgroundColor: loading ? '#ccc' : '#0070f3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? 'กำลังตรวจสอบ...' : 'ซื้อเลย 🛒'}
    </button>
  );
}