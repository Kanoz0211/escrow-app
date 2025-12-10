// app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลออเดอร์ทั้งหมด + ข้อมูล KYC ของคนขาย
  const fetchAllOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (title, price),
        buyer:profiles!orders_buyer_id_fkey (username),
        seller:profiles!orders_seller_id_fkey (
          id,
          username, 
          bank_name, 
          bank_account_number, 
          bank_account_name,
          id_card_image,
          selfie_image,
          kyc_status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      alert('Error fetching orders: ' + error.message);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // --- Helper: สร้างลิงก์เช็คคนโกง ---
  const getFraudCheckLink = (keyword: string) => {
    if (!keyword) return '#';
    return `https://www.google.com/search?q=site:blacklistseller.com+"${keyword}"`;
  };

  // --- Actions: ตัดสินคดี ---

  const handleSellerWin = async (orderId: string) => {
    if (!confirm('ยืนยันให้ "คนขายชนะ"? (ปิดเคส)')) return;
    const { error } = await supabase.from('orders').update({ status: 'COMPLETED' }).eq('id', orderId);
    if (error) alert(error.message);
    else { alert('✅ บันทึกสถานะ: จบงาน (คนขายได้เงิน)'); fetchAllOrders(); }
  };

  const handleBuyerWin = async (orderId: string, chargeId: string) => {
    const confirmMsg = `⚠️ กรุณาทำตามขั้นตอนนี้:\n\n1. ไปที่ Omise Dashboard (Charge ID: ${chargeId})\n2. กดปุ่ม "Refund" ใน Omise ให้เสร็จสิ้น\n3. กลับมาที่นี่ แล้วกด OK เพื่อเปลี่ยนสถานะในเว็บ\n\nคุณทำรายการใน Omise เรียบร้อยแล้วใช่ไหม?`;
    if (!confirm(confirmMsg)) return;
    const { error } = await supabase.from('orders').update({ status: 'REFUNDED' }).eq('id', orderId);
    if (error) alert(error.message);
    else { alert('✅ บันทึกสถานะ: คืนเงินแล้ว (REFUNDED)'); fetchAllOrders(); }
  };

  // --- Actions: ตรวจ KYC (คนขาย) ---
  const handleUpdateKYC = async (sellerId: string, status: string) => {
    const confirmMsg = status === 'verified' ? 'ยืนยัน "อนุมัติ" ตัวตนคนนี้?' : 'ยืนยัน "ปฏิเสธ" ตัวตนคนนี้?';
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ kyc_status: status })
      .eq('id', sellerId);

    if (error) alert('Error: ' + error.message);
    else {
      alert(status === 'verified' ? '✅ อนุมัติเรียบร้อย' : '❌ ปฏิเสธเรียบร้อย');
      fetchAllOrders();
    }
  };

  // คำนวณ Fee (5%)
  const FEE_PERCENT = 5; 
  const calculatePayout = (amount: number) => {
    const fee = Math.round(amount * (FEE_PERCENT / 100));
    const net = amount - fee;
    return { fee, net };
  };

  if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล Admin...</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '20px auto', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#2d3436' }}>
        👮‍♂️ Admin Dashboard (ห้องพิจารณาคดี & ตรวจคนเข้าเมือง)
      </h1>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left', color:'#636e72' }}>
              <th style={thStyle}>ออเดอร์ & การเงิน (Payout Info)</th>
              <th style={thStyle}>สถานะ</th>
              <th style={thStyle}>🔥 หลักฐานข้อพิพาท (Dispute Evidence)</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const { fee, net } = calculatePayout(order.amount);
              const seller = order.seller; // ย่อให้เรียกง่ายๆ
              
              return (
              <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                
                {/* 1. ข้อมูลการเงิน & บัญชีคนขาย & KYC */}
                <td style={{...tdStyle, width: '400px'}}>
                    <div style={{fontWeight:'bold', fontSize:'16px', marginBottom:'5px'}}>{order.products?.title}</div>
                    
                    {/* กล่องคำนวณเงิน */}
                    <div style={{backgroundColor:'#f9f9f9', padding:'10px', borderRadius:'8px', fontSize:'13px', border:'1px solid #eee', marginBottom:'10px'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span>ยอดขาย:</span> <span>฿{order.amount.toLocaleString()}</span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', color:'#e17055'}}>
                            <span>หักค่าธรรมเนียม ({FEE_PERCENT}%):</span> <span>-฿{fee.toLocaleString()}</span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', color:'#00b894', marginTop:'5px', borderTop:'1px dashed #ccc', paddingTop:'5px'}}>
                            <span>ยอดโอนสุทธิ:</span> <span>฿{net.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* ข้อมูลธนาคารคนขาย */}
                    <div style={{fontSize:'13px', marginBottom:'10px'}}>
                        <strong>🏦 บัญชีคนขาย:</strong>
                        {seller?.bank_account_number ? (
                            <div style={{padding:'5px', backgroundColor:'#e3f2fd', borderRadius:'4px', marginTop:'2px', color:'#0984e3'}}>
                                {seller.bank_name} <br/>
                                <strong>{seller.bank_account_number}</strong> <br/>
                                ({seller.bank_account_name})

                                {/* ปุ่มสแกนคนโกง */}
                                <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
                                    <a href={getFraudCheckLink(seller.bank_account_number)} target="_blank" style={btnScanStyle}>🔍 เช็คเลขบัญชี</a>
                                    <a href={getFraudCheckLink(seller.bank_account_name)} target="_blank" style={btnScanStyle}>🔍 เช็คชื่อ</a>
                                </div>
                            </div>
                        ) : (
                            <div style={{color:'#c0392b', fontStyle:'italic'}}>❌ ยังไม่กรอกเลขบัญชี</div>
                        )}
                    </div>

                    {/* 🔥 ระบบตรวจ KYC (เพิ่มใหม่!) */}
                    <div style={{border:'1px solid #ddd', borderRadius:'6px', padding:'10px', backgroundColor:'#fff'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px'}}>
                           <strong>🪪 ยืนยันตัวตน (KYC):</strong>
                           <span style={{
                               fontSize:'10px', padding:'2px 6px', borderRadius:'10px', color:'white',
                               backgroundColor: seller?.kyc_status === 'verified' ? '#27ae60' : seller?.kyc_status === 'rejected' ? '#c0392b' : '#f39c12'
                           }}>
                               {seller?.kyc_status === 'verified' ? 'ผ่านแล้ว' : seller?.kyc_status === 'rejected' ? 'ไม่ผ่าน' : 'รอตรวจ'}
                           </span>
                        </div>
                        
                        {(seller?.id_card_image || seller?.selfie_image) ? (
                            <div>
                                <div style={{display:'flex', gap:'5px', marginBottom:'8px'}}>
                                    {seller.id_card_image && <a href={seller.id_card_image} target="_blank" style={linkStyle}>📸 บัตรประชาชน</a>}
                                    {seller.selfie_image && <a href={seller.selfie_image} target="_blank" style={linkStyle}>🤳 รูปคู่บัตร</a>}
                                </div>
                                {/* ปุ่มอนุมัติ */}
                                {seller.kyc_status === 'pending' && (
                                    <div style={{display:'flex', gap:'5px'}}>
                                        <button onClick={() => handleUpdateKYC(seller.id, 'verified')} style={btnVerify}>✅ อนุมัติ</button>
                                        <button onClick={() => handleUpdateKYC(seller.id, 'rejected')} style={btnRejectKYC}>❌ ปฏิเสธ</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{fontSize:'11px', color:'#999'}}>ยังไม่อัปโหลดเอกสาร</div>
                        )}
                    </div>
                </td>

                {/* 2. สถานะออเดอร์ */}
                <td style={{...tdStyle, width: '100px'}}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                    backgroundColor: getStatusColor(order.status), color: 'white'
                  }}>
                    {order.status}
                  </span>
                </td>

                {/* 3. หลักฐานข้อพิพาท (Dispute) */}
                <td style={tdStyle}>
                  {order.status === 'DISPUTE' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {/* 🔴 ฝั่งคนซื้อ */}
                        <div style={{ backgroundColor: '#fff5f5', padding: '10px', borderRadius: '8px', border: '1px solid #fab1a0' }}>
                            <h4 style={{color:'#d63031', fontSize:'12px', marginBottom:'5px'}}>🙋‍♂️ คนซื้อ:</h4>
                            <div style={infoBox}>{order.dispute_reason}</div>
                            <div style={{marginTop:'5px'}}>
                                {order.dispute_image && <a href={order.dispute_image} target="_blank" style={linkRed}>📸 รูปของพัง</a>}
                                {order.dispute_video && <a href={order.dispute_video} target="_blank" style={linkRed}>🎥 คลิปแกะกล่อง</a>}
                            </div>
                            <button onClick={() => handleBuyerWin(order.id, order.payment_ref_id)} style={btnRefund}>⬅️ คืนเงินคนซื้อ</button>
                        </div>
                        {/* 🔵 ฝั่งคนขาย */}
                        <div style={{ backgroundColor: '#f0f8ff', padding: '10px', borderRadius: '8px', border: '1px solid #bdc3c7' }}>
                            <h4 style={{color:'#2980b9', fontSize:'12px', marginBottom:'5px'}}>📦 คนขาย:</h4>
                            <div style={infoBox}>{order.shipping_condition}</div>
                            <div style={{marginTop:'5px'}}>
                                {order.shipping_evidence_image && <a href={order.shipping_evidence_image} target="_blank" style={linkBlue}>📸 รูปตอนแพ็ค</a>}
                                {order.shipping_evidence_video && <a href={order.shipping_evidence_video} target="_blank" style={linkBlue}>🎥 คลิปตอนแพ็ค</a>}
                            </div>
                            <button onClick={() => handleSellerWin(order.id)} style={btnApprove}>คนขายชนะ ➡️</button>
                        </div>
                    </div>
                  ) : (
                    <div style={{color:'#aaa', fontSize:'12px', fontStyle:'italic', textAlign:'center', marginTop:'20px'}}>
                       - ไม่มีข้อพิพาท -
                    </div>
                  )}
                </td>
              </tr>
            );})} 
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Styles ---
const thStyle = { padding: '15px', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '15px', verticalAlign: 'top' };
const btnApprove = { marginTop: '10px', width: '100%', padding: '8px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize:'12px' };
const btnRefund = { marginTop: '10px', width: '100%', padding: '8px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' as const, fontSize:'12px' };
const infoBox = { fontSize: '12px', marginBottom: '5px', color: '#2d3436' };

// ปุ่มสแกน & Link
const btnScanStyle = { display: 'inline-block', padding: '2px 6px', backgroundColor: '#2d3436', color: '#d4af37', fontSize: '9px', textDecoration: 'none', borderRadius: '3px', fontWeight: 'bold' as const };
const linkStyle = { fontSize:'11px', color:'#0984e3', textDecoration:'underline', cursor:'pointer' };
const linkRed = { ...linkStyle, color: '#c0392b' };
const linkBlue = { ...linkStyle, color: '#2980b9' };

// ปุ่ม KYC
const btnVerify = { flex:1, padding: '4px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize:'11px' };
const btnRejectKYC = { flex:1, padding: '4px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize:'11px' };

function getStatusColor(status: string) {
  switch (status) {
    case 'WAITING_PAYMENT': return '#b2bec3';
    case 'PAID': return '#3498db'; 
    case 'SHIPPED': return '#f1c40f';
    case 'COMPLETED': return '#2ecc71';
    case 'REFUNDED': return '#e74c3c'; 
    case 'DISPUTE': return '#e17055'; 
    default: return '#636e72';
  }
}