// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. ดึงข้อมูลออเดอร์ "ทั้งหมด" ในระบบ
  const fetchAllOrders = async () => {
    setLoading(true);
    
    // Join ตาราง products เพื่อเอาชื่อสินค้า และ profiles เพื่อเอาชื่อคนซื้อ
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (title, price),
        buyer:profiles!orders_buyer_id_fkey (username) 
      `)
      .order('created_at', { ascending: false }); // ใหม่สุดขึ้นก่อน

    if (error) {
      console.error('Error fetching orders:', error);
      alert('ดึงข้อมูลไม่สำเร็จ: ' + error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // --- Actions ---

  // A. บังคับจบงาน (ปล่อยเงินให้คนขาย)
  const handleForceComplete = async (orderId: string) => {
    if (!confirm('ยืนยันที่จะ "บังคับจบงาน" (เงินจะถูกโอนให้ผู้ขาย)?')) return;
    
    const { error } = await supabase
      .from('orders')
      .update({ status: 'COMPLETED' })
      .eq('id', orderId);

    if (error) alert('Error: ' + error.message);
    else {
      alert('✅ อนุมัติสำเร็จ!');
      fetchAllOrders(); // รีโหลดตาราง
    }
  };

  // B. คืนเงิน (ยกเลิกออเดอร์)
  const handleRefund = async (orderId: string) => {
    if (!confirm('ยืนยันที่จะ "คืนเงิน" ให้คนซื้อ? (สถานะจะเปลี่ยนเป็น REFUNDED)')) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: 'REFUNDED' })
      .eq('id', orderId);

    if (error) alert('Error: ' + error.message);
    else {
      alert('✅ คืนเงินสำเร็จ! (อย่าลืมไปกดคืนเงินใน Omise Dashboard ด้วยนะ)');
      fetchAllOrders();
    }
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล Admin...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#333' }}>
        👮‍♂️ Admin Dashboard (ห้องบัญชาการ)
      </h1>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left' }}>
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>สินค้า</th>
              <th style={thStyle}>ราคา</th>
              <th style={thStyle}>ผู้ซื้อ</th>
              <th style={thStyle}>สถานะ</th>
              <th style={thStyle}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>#{order.id.slice(0, 6)}...</td>
                <td style={tdStyle}>{order.products?.title || 'Unknown'}</td>
                <td style={tdStyle}>฿{order.amount.toLocaleString()}</td>
                <td style={tdStyle}>{order.buyer?.username || order.buyer_id.slice(0,6)}</td>
                <td style={tdStyle}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: getStatusColor(order.status), color: 'white'
                  }}>
                    {order.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  {/* ปุ่ม Action จะเปลี่ยนไปตามสถานะ */}
                  {order.status === 'PAID' || order.status === 'SHIPPED' ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleForceComplete(order.id)} style={btnApprove}>
                        ✅ อนุมัติ
                      </button>
                      <button onClick={() => handleRefund(order.id)} style={btnReject}>
                        🚫 คืนเงิน
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '12px' }}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {orders.length === 0 && <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>ยังไม่มีออเดอร์ในระบบ</p>}
    </div>
  );
}

// --- Styles ---
const thStyle = { padding: '12px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px' };

const btnApprove = { padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };
const btnReject = { padding: '5px 10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' };

function getStatusColor(status: string) {
  switch (status) {
    case 'WAITING_PAYMENT': return '#6c757d'; // เทา
    case 'PAID': return '#17a2b8'; // ฟ้า
    case 'SHIPPED': return '#ffc107'; // เหลือง
    case 'COMPLETED': return '#28a745'; // เขียว
    case 'REFUNDED': return '#dc3545'; // แดง
    default: return '#000';
  }
}