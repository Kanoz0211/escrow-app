// app/orders/[id]/page.tsx
'use client'

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Data State
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Payment State
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Seller State (ส่งของ)
  const [trackingNo, setTrackingNo] = useState('');
  const [shippingCondition, setShippingCondition] = useState('');
  const [shippingDefects, setShippingDefects] = useState('');
  const [evidenceImage, setEvidenceImage] = useState<File | null>(null);
  const [evidenceVideo, setEvidenceVideo] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Buyer State (แจ้งปัญหา - เพิ่มของใหม่!)
  const [isReporting, setIsReporting] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [receivedTime, setReceivedTime] = useState(''); // เวลาที่รับของ
  const [disputeImage, setDisputeImage] = useState<File | null>(null);
  const [disputeVideo, setDisputeVideo] = useState<File | null>(null); // วีดีโอตอนแกะกล่อง

  // 1. โหลดข้อมูล
  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, products(*)') 
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

  useEffect(() => {
    fetchOrder();
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [id]);

  // 2. ขอ QR Code
  useEffect(() => {
    if (order && order.status === 'WAITING_PAYMENT' && !qrCodeUrl) {
      fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: order.amount, orderId: order.id })
      })
      .then(res => res.json())
      .then(data => {
        if (data.charge?.source?.scannable_code) {
          setQrCodeUrl(data.charge.source.scannable_code.image.download_uri);
        }
      })
      .catch(err => console.error(err));
    }
  }, [order, qrCodeUrl]);

  // --- Actions ---

  const handleSimulateWebhook = async () => { /* ...โค้ดเดิม... */ }; // ขอละไว้นะครับ (ใช้ของเดิมได้เลย)

  // [Seller] ส่งสินค้า
  const handleShipItem = async () => {
    if (!trackingNo) return alert('กรุณากรอกเลขพัสดุ');
    if (!confirm('ยืนยันการส่งสินค้า?')) return;
    
    setIsUploading(true);

    try {
      let imageUrl = null;
      let videoUrl = null;

      if (evidenceImage) {
        const fileName = `shipping/img-${Date.now()}-${evidenceImage.name}`;
        await supabase.storage.from('products').upload(fileName, evidenceImage);
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }
      if (evidenceVideo) {
        const fileName = `shipping/vdo-${Date.now()}-${evidenceVideo.name}`;
        await supabase.storage.from('products').upload(fileName, evidenceVideo);
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        videoUrl = data.publicUrl;
      }

      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'SHIPPED', 
          tracking_number: trackingNo,
          shipping_condition: shippingCondition,
          shipping_defects: shippingDefects,
          shipping_evidence_image: imageUrl,
          shipping_evidence_video: videoUrl
        })
        .eq('id', id);

      if (error) throw error;
      alert('🚚 บันทึกการส่งของเรียบร้อย!');
      fetchOrder();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // [Buyer] ยอมรับสินค้า
  const handleCompleteOrder = async () => {
    if (!confirm('ยืนยันว่าได้รับสินค้าถูกต้อง?')) return;
    await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', id);
    alert('🎉 ปิดจ็อบเรียบร้อย!');
    fetchOrder();
  };

  // 🚨 [Buyer] แจ้งปัญหา (อัปเกรดใหม่!)
  const handleSubmitDispute = async () => {
    if (!disputeReason) return alert('กรุณาระบุปัญหา');
    if (!receivedTime) return alert('กรุณาระบุเวลาที่ได้รับของ');
    if (!confirm('ยืนยันการแจ้งปัญหา? (ต้องมีคลิปตอนแกะกล่อง)')) return;

    setIsUploading(true); // ใช้ตัวแปรโหลดตัวเดียวกับคนขายได้เลย

    try {
      let imageUrl = null;
      let videoUrl = null;

      // 1. อัปรูปหลักฐาน
      if (disputeImage) {
        const fileName = `disputes/img-${Date.now()}-${disputeImage.name}`;
        await supabase.storage.from('products').upload(fileName, disputeImage);
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      // 2. อัปวีดีโอตอนแกะกล่อง (สำคัญ!)
      if (disputeVideo) {
        const fileName = `disputes/vdo-${Date.now()}-${disputeVideo.name}`;
        const { error } = await supabase.storage.from('products').upload(fileName, disputeVideo);
        if (error) throw error; // ถ้าอัปไม่ผ่านให้แจ้งเตือน
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        videoUrl = data.publicUrl;
      }

      // 3. บันทึกลง Database
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'DISPUTE',
          dispute_reason: disputeReason,
          received_at_text: receivedTime, // เวลาที่รับของ
          dispute_image: imageUrl,
          dispute_video: videoUrl
        })
        .eq('id', id);

      if (error) throw error;

      alert('🚨 แจ้งปัญหาเรียบร้อย! รอแอดมินตรวจสอบคลิปหลักฐาน');
      window.location.reload();

    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };


  if (loading || !order) return <div className="p-10 text-center">⏳ กำลังโหลด...</div>;

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: 'white', fontFamily: 'sans-serif' }}>
      
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
        Order #{order.id.slice(0, 8)}
      </h1>

      {/* รายละเอียดสินค้า */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
        <p><strong>สินค้า:</strong> {order.products?.title}</p>
        <p><strong>สถานะ:</strong> 
           <span style={{ marginLeft:'10px', fontWeight:'bold', color: order.status === 'DISPUTE' ? 'red' : 'black' }}>
             {order.status}
           </span>
        </p>
      </div>

      {/* --- แจ้งเตือน DISPUTE --- */}
      {order.status === 'DISPUTE' && (
        <div style={{ padding: '15px', backgroundColor: '#fff5f5', border: '2px solid red', borderRadius: '8px', marginBottom: '20px', textAlign:'center', color: '#c0392b' }}>
          🚨 <strong>ข้อพิพาท:</strong> รอแอดมินตรวจสอบคลิป Unboxing
        </div>
      )}

      {/* --- ZONE 1: รอจ่ายเงิน --- */}
      {order.status === 'WAITING_PAYMENT' && (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: '15px' }}>📱 สแกน PromptPay เพื่อชำระเงิน</h3>
          {qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="Omise PromptPay QR" 
              style={{ margin: '0 auto', width: '250px', border: '1px solid #eee', borderRadius: '8px' }}
            />
          ) : (
            <p className="text-gray-500">กำลังเชื่อมต่อ Omise...</p>
          )}
          <p style={{ color: '#666', fontSize: '12px', marginTop: '15px' }}>(โหมด Test เงินไม่ตัดจริง)</p>
          <button onClick={handleSimulateWebhook} style={{ marginTop: '20px', width: '100%', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}>
            🛠️ [Developer Only] จำลอง Webhook (กดเพื่อจ่ายเงิน)
          </button>
        </div>
      )}

      {/* --- ZONE 2: จ่ายแล้ว -> รอส่ง (PAID) --- */}
      {order.status === 'PAID' && (
        <>
          {isSeller ? (
            <div style={{ border: '2px solid #ffc107', padding: '20px', borderRadius: '8px', backgroundColor: '#fffbf2' }}>
              <h3 style={{ marginBottom: '15px', color: '#d35400' }}>📦 แบบฟอร์มส่งสินค้า (Seller)</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>เลขพัสดุ <span style={{color:'red'}}>*</span></label>
                  <input type="text" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} style={inputStyle} placeholder="เช่น KERRY123456" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>สภาพสินค้า</label>
                    <input type="text" value={shippingCondition} onChange={(e) => setShippingCondition(e.target.value)} style={inputStyle} placeholder="เช่น 95%" />
                  </div>
                  <div>
                    <label style={labelStyle}>ตำหนิ</label>
                    <input type="text" value={shippingDefects} onChange={(e) => setShippingDefects(e.target.value)} style={inputStyle} placeholder="เช่น รอยขีดข่วน" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>📸 รูปตอนแพ็ค</label>
                  <input type="file" accept="image/*" onChange={(e) => setEvidenceImage(e.target.files?.[0] || null)} style={fileInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🎥 วีดีโอตอนแพ็ค</label>
                  <input type="file" accept="video/*" onChange={(e) => setEvidenceVideo(e.target.files?.[0] || null)} style={fileInputStyle} />
                </div>
                <button onClick={handleShipItem} disabled={isUploading} style={{ ...btnStyle, backgroundColor: isUploading ? '#ccc' : '#f39c12' }}>
                  {isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันการส่งสินค้า 🚚'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f1f2f6', borderRadius: '8px' }}>
              <h3>🕒 รอผู้ขายจัดส่งสินค้า</h3>
              <p>ผู้ขายกำลังแพ็คของและเตรียมหลักฐานการส่ง...</p>
            </div>
          )}
        </>
      )}

      {/* --- ZONE 3: ส่งแล้ว -> รอรับ (SHIPPED) --- */}
      {order.status === 'SHIPPED' && (
        <div style={{ border: '2px dashed #0070f3', padding: '20px', borderRadius: '8px', backgroundColor: '#e7f5ff' }}>
           {isBuyer ? (
             <>
                <h3 style={{ marginBottom: '10px' }}>📦 ผู้ขายส่งของแล้ว</h3>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
                  <p><strong>เลขพัสดุ:</strong> {order.tracking_number}</p>
                  
                  <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize:'13px' }}>
                    {order.shipping_evidence_image && <a href={order.shipping_evidence_image} target="_blank" style={{color: '#0984e3', textDecoration:'underline'}}>📸 ดูรูปตอนแพ็ค</a>}
                    {order.shipping_evidence_video && <a href={order.shipping_evidence_video} target="_blank" style={{color: '#0984e3', textDecoration:'underline'}}>🎥 ดูวีดีโอตอนแพ็ค</a>}
                  </div>
                </div>

                {!isReporting ? (
                  <>
                    <button onClick={handleCompleteOrder} style={{ ...btnStyle, backgroundColor: '#0984e3', marginBottom: '10px' }}>
                      ได้รับของแล้ว (ยอมรับสินค้า) ✅
                    </button>
                    <button onClick={() => setIsReporting(true)} style={{ ...btnStyle, backgroundColor: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', fontSize: '14px' }}>
                      แจ้งปัญหา / สินค้าเสียหาย 🚨
                    </button>
                  </>
                ) : (
                  // 🔥 ฟอร์มแจ้งปัญหา (Dispute Form)
                  <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <h4 style={{marginBottom: '10px', color: '#c0392b'}}>📝 แจ้งปัญหา / ขอคืนเงิน</h4>
                    
                    {/* 1. เวลาที่รับของ */}
                    <div style={{marginBottom: '10px'}}>
                        <label style={{fontSize: '12px', fontWeight:'bold'}}>ได้รับของเมื่อไหร่:</label>
                        <input 
                            type="text" 
                            placeholder="เช่น วันนี้ 10:30 น." 
                            value={receivedTime}
                            onChange={(e) => setReceivedTime(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* 2. รายละเอียดปัญหา */}
                    <div style={{marginBottom: '10px'}}>
                        <label style={{fontSize: '12px', fontWeight:'bold'}}>รายละเอียดปัญหา:</label>
                        <textarea 
                        placeholder="เช่น สินค้าไม่ตรงปก, เปิดมาแล้วแตก..." 
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        rows={3}
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        />
                    </div>

                    {/* 3. หลักฐานรูปภาพ */}
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{fontSize: '12px', fontWeight:'bold'}}>📸 รูปสินค้าที่มีปัญหา:</label>
                      <input type="file" accept="image/*" onChange={(e) => setDisputeImage(e.target.files?.[0] || null)} style={fileInputStyle} />
                    </div>

                    {/* 4. หลักฐานวีดีโอ (สำคัญ!) */}
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{fontSize: '12px', fontWeight:'bold', color: '#c0392b'}}>🎥 คลิปวีดีโอตอนแกะกล่อง (Unboxing):</label>
                      <input type="file" accept="video/*" onChange={(e) => setDisputeVideo(e.target.files?.[0] || null)} style={fileInputStyle} />
                      <p style={{fontSize:'11px', color:'#666'}}>*ต้องมีคลิปตอนแกะกล่องเพื่อยืนยันว่าไม่ได้สลับของ</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleSubmitDispute} disabled={isUploading} style={{ flex: 1, padding: '10px', backgroundColor: isUploading?'#ccc':'#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                        {isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันแจ้งปัญหา'}
                      </button>
                      <button onClick={() => setIsReporting(false)} disabled={isUploading} style={{ flex: 1, padding: '10px', backgroundColor: '#ccc', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
             </>
           ) : (
             <div style={{ textAlign: 'center' }}>
               <h3>🚚 สินค้าอยู่ระหว่างจัดส่ง</h3>
               <p>รอผู้ซื้อตรวจสอบสินค้า</p>
             </div>
           )}
        </div>
      )}

      {/* --- ZONE 4: จบงาน (COMPLETED) --- */}
      {order.status === 'COMPLETED' && (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#d4edda', borderRadius: '10px' }}>
          <h2 style={{ fontSize: '30px' }}>🎉 จบงานเรียบร้อย</h2>
          <p>เงินถูกโอนให้ผู้ขายแล้ว</p>
        </div>
      )}

    </div>
  );
}

// Styles
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold' as const, fontSize: '14px' };
const inputStyle = { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' };
const fileInputStyle = { width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: 'white' };
const btnStyle = { width: '100%', padding: '12px', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: '16px' };