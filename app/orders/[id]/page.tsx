// app/orders/[id]/page.tsx
'use client'

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  // แกะ ID จาก URL
  const { id } = use(params);
  
  // State สำหรับเก็บข้อมูล
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState(''); // เก็บรูป QR จาก Omise
  const [trackingNo, setTrackingNo] = useState(''); // เก็บเลขพัสดุ
  const router = useRouter();

  // ฟังก์ชันโหลดข้อมูลออเดอร์ (ใช้บ่อย เลยแยกออกมา)
  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(*)') // Join เอาข้อมูลสินค้ามาด้วย
      .eq('id', id)
      .single();

    if (error || !data) {
      alert('❌ หาออเดอร์ไม่เจอ');
      router.push('/');
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  // 1. โหลดข้อมูลเมื่อเข้าหน้าเว็บ
  useEffect(() => {
    fetchOrder();
  }, [id]);

  // 2. ถ้าสถานะเป็น "รอจ่ายเงิน" ให้ไปขอสร้าง QR Code จาก API (Omise)
  useEffect(() => {
    if (order && order.status === 'WAITING_PAYMENT' && !qrCodeUrl) {
      fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: order.amount, 
          orderId: order.id 
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.charge && data.charge.source && data.charge.source.scannable_code) {
           // ดึง URL รูป QR Code มาเก็บไว้ใน State
           setQrCodeUrl(data.charge.source.scannable_code.image.download_uri);
        }
      })
      .catch(err => console.error('สร้าง QR ไม่ได้:', err));
    }
  }, [order, qrCodeUrl]);

  // ------------------------------------------------------------------
  // 🎯 ฟังก์ชันจำลอง Webhook (ใช้ปุ่ม Developer Only ยิง)
  // ------------------------------------------------------------------
  const handleSimulateWebhook = async () => {
    if (!confirm('ยืนยันจำลองการจ่ายเงิน (ยิงเข้า Webhook)?')) return;

    setLoading(true);

    // จำลองข้อมูลหน้าตาเหมือนที่ Omise จะส่งมาเป๊ะๆ
    const fakeOmiseEvent = {
      key: 'charge.complete',
      data: {
        status: 'successful',
        id: 'chrg_test_fake_' + Math.floor(Math.random() * 10000), // สุ่มรหัสเล่นๆ
        metadata: {
          order_id: order.id // ส่ง ID ออเดอร์นี้ไปบอก Webhook
        }
      }
    };

    try {
      // ยิงเข้า API Webhook ของเราเอง
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fakeOmiseEvent)
      });

      if (res.ok) {
        alert('🔔 Webhook ทำงานสำเร็จ! (ระบบรับรู้ว่าจ่ายแล้ว)');
        window.location.reload(); // รีเฟรชเพื่อดูสถานะใหม่
      } else {
        alert('❌ Webhook Error');
      }
    } catch (err) {
      console.error(err);
      alert('❌ เชื่อมต่อ Webhook ไม่ได้');
    } finally {
      setLoading(false);
    }
 };

  // ------------------------------------------------------------------
  // 📦 ฟังก์ชันคนขายส่งของ
  // ------------------------------------------------------------------
  const handleShipItem = async () => {
    if (!trackingNo) return alert('กรุณากรอกเลขพัสดุ / ข้อมูลการส่ง');
    
    await supabase
      .from('orders')
      .update({ 
        status: 'SHIPPED',
        tracking_number: trackingNo 
      })
      .eq('id', id);

    alert('🚚 บันทึกการส่งของเรียบร้อย!');
    fetchOrder();
  };

  // ------------------------------------------------------------------
  // 🤝 ฟังก์ชันคนซื้อยอมรับของ (จบงาน)
  // ------------------------------------------------------------------
  const handleCompleteOrder = async () => {
    if (!confirm('คุณได้รับสินค้าและตรวจสอบแล้วว่าถูกต้องใช่ไหม?')) return;

    await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', id);

    alert('🎉 เย้! ปิดจ็อบ ระบบจะโอนเงินให้ผู้ขายต่อไป');
    fetchOrder();
  };

  // --- ส่วนแสดงผล (Render UI) ---
  if (loading || !order) return <div className="p-10 text-center">⏳ กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: 'white', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
        รายการสั่งซื้อ #{order.id.slice(0, 8)}
      </h1>

      {/* รายละเอียดสินค้า */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <p style={{ marginBottom: '5px' }}><strong>สินค้า:</strong> {order.products?.title}</p>
        <p style={{ marginBottom: '5px' }}><strong>ราคา:</strong> <span style={{ color: 'green', fontWeight: 'bold' }}>฿{order.amount.toLocaleString()}</span></p>
        <p><strong>สถานะ:</strong> 
          <span style={{ 
             marginLeft: '10px', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', color: 'white',
             backgroundColor: 
               order.status === 'COMPLETED' ? '#28a745' : 
               order.status === 'PAID' ? '#17a2b8' : 
               order.status === 'SHIPPED' ? '#ffc107' : '#6c757d'
          }}>
            {order.status}
          </span>
        </p>
      </div>

      {/* --- ZONE 1: รอจ่ายเงิน (WAITING_PAYMENT) --- */}
      {order.status === 'WAITING_PAYMENT' && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>📱 สแกน PromptPay เพื่อชำระเงิน</h3>
          
          {/* QR Code */}
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="Omise PromptPay QR" 
              style={{ margin: '0 auto', width: '250px', border: '1px solid #eee', borderRadius: '8px' }}
            />
          ) : (
            <p className="text-gray-500">กำลังเชื่อมต่อ Omise...</p>
          )}
          
          <p style={{ color: '#666', fontSize: '12px', marginTop: '15px' }}>
            (ใช้แอปธนาคารสแกนได้จริง แต่เงินจะไม่ตัดเพราะเป็น Test Mode)
          </p>

          <hr style={{ margin: '20px 0' }} />

          {/* ปุ่มลับ Developer */}
          <button 
            onClick={handleSimulateWebhook} 
            style={{ 
              width: '100%', padding: '10px', backgroundColor: '#6c757d', color: 'white', 
              border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' 
            }}
          >
            🛠️ [Developer Only] จำลอง Webhook (กดเพื่อจ่ายเงิน)
          </button>
        </div>
      )}

      {/* --- ZONE 2: จ่ายแล้ว -> รอคนขายส่ง (PAID) --- */}
      {order.status === 'PAID' && (
        <div style={{ border: '2px dashed #ffc107', padding: '20px', borderRadius: '8px', backgroundColor: '#fff3cd' }}>
          <h3 style={{ marginBottom: '10px' }}>📦 ส่วนของคนขาย (Seller Zone)</h3>
          <p style={{ fontSize: '14px', marginBottom: '10px' }}>ได้รับเงินแล้ว! กรุณาส่งสินค้าแล้วแจ้งเลขพัสดุ</p>
          
          <input 
            type="text" 
            placeholder="กรอกเลขพัสดุ / รหัสสินค้า / ไอดีเกม"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button 
            onClick={handleShipItem} 
            style={{ width: '100%', padding: '10px', backgroundColor: '#ffc107', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ยืนยันการส่งสินค้า 🚚
          </button>
        </div>
      )}

      {/* --- ZONE 3: ส่งแล้ว -> รอคนซื้อรับ (SHIPPED) --- */}
      {order.status === 'SHIPPED' && (
        <div style={{ border: '2px dashed #0070f3', padding: '20px', borderRadius: '8px', backgroundColor: '#e7f5ff' }}>
           <h3 style={{ marginBottom: '10px' }}>🙋‍♂️ ส่วนของคนซื้อ (Buyer Zone)</h3>
           <p style={{ marginBottom: '10px' }}>
             ผู้ขายแจ้งส่งของแล้ว: <strong>{order.tracking_number}</strong>
           </p>
           <button 
             onClick={handleCompleteOrder} 
             style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
           >
             ได้รับของแล้ว (ยอมรับสินค้า) ✅
           </button>
        </div>
      )}

      {/* --- ZONE 4: จบงาน (COMPLETED) --- */}
      {order.status === 'COMPLETED' && (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#d4edda', borderRadius: '10px' }}>
          <h2 style={{ fontSize: '50px', marginBottom: '10px' }}>🎉</h2>
          <h3 style={{ color: '#155724' }}>การซื้อขายเสร็จสมบูรณ์!</h3>
          <p style={{ color: '#155724' }}>เงินถูกโอนให้ผู้ขายเรียบร้อยแล้ว</p>
          <button 
            onClick={() => router.push('/')} 
            style={{ marginTop: '20px', textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer', color: '#155724' }}
          >
            กลับหน้าแรก
          </button>
        </div>
      )}

    </div>
  );
}