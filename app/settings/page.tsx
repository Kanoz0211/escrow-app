// app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // State ข้อมูลทั่วไป
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // State สำหรับ KYC (บัตรประชาชน)
  const [kycStatus, setKycStatus] = useState('pending');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [existingIdCard, setExistingIdCard] = useState('');
  const [existingSelfie, setExistingSelfie] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setBankName(data.bank_name || '');
        setAccountNumber(data.bank_account_number || '');
        setAccountName(data.bank_account_name || '');
        setPhone(data.phone_number || '');
        setAddress(data.address || '');
        setKycStatus(data.kyc_status || 'pending');
        setExistingIdCard(data.id_card_image || '');
        setExistingSelfie(data.selfie_image || '');
      }
      setLoading(false);
    };
    getProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      let idCardUrl = existingIdCard;
      let selfieUrl = existingSelfie;

      // 1. อัปโหลดรูปบัตร (ถ้ามีการเปลี่ยน)
      if (idCardFile) {
        const fileName = `kyc/${user.id}-idcard-${Date.now()}`;
        const { error } = await supabase.storage.from('products').upload(fileName, idCardFile);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        idCardUrl = data.publicUrl;
      }

      // 2. อัปโหลดรูปเซลฟี่ (ถ้ามีการเปลี่ยน)
      if (selfieFile) {
        const fileName = `kyc/${user.id}-selfie-${Date.now()}`;
        const { error } = await supabase.storage.from('products').upload(fileName, selfieFile);
        if (error) throw error;
        const { data } = supabase.storage.from('products').getPublicUrl(fileName);
        selfieUrl = data.publicUrl;
      }

      // 3. บันทึกข้อมูล
      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: bankName,
          bank_account_number: accountNumber,
          bank_account_name: accountName,
          phone_number: phone,
          address: address,
          id_card_image: idCardUrl,
          selfie_image: selfieUrl,
          // ถ้ามีการอัปรูปใหม่ ให้เปลี่ยนสถานะเป็น pending รอแอดมินตรวจใหม่
          kyc_status: (idCardFile || selfieFile) ? 'pending' : kycStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      alert('✅ บันทึกข้อมูลเรียบร้อย!');
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">⏳ กำลังโหลด...</div>;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '30px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#2d3436', textAlign: 'center' }}>
        ⚙️ ตั้งค่าข้อมูล & ยืนยันตัวตน
      </h1>

      <div style={{ display: 'grid', gap: '20px' }}>
        
        {/* --- โซน KYC (สำคัญ!) --- */}
        <div style={{ padding: '20px', backgroundColor: '#eef2f3', borderRadius: '12px', border: '1px solid #bdc3c7' }}>
           <h3 style={{ marginBottom: '15px', color: '#2c3e50', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
             🪪 ยืนยันตัวตน (KYC)
             <span style={{
               fontSize: '12px', padding: '4px 10px', borderRadius: '20px', color: 'white',
               backgroundColor: kycStatus === 'verified' ? '#27ae60' : kycStatus === 'rejected' ? '#c0392b' : '#f39c12'
             }}>
               {kycStatus === 'verified' ? 'ผ่านแล้ว ✅' : kycStatus === 'rejected' ? 'ไม่ผ่าน ❌' : 'รอตรวจสอบ ⏳'}
             </span>
           </h3>
           <p style={{fontSize:'13px', color:'#7f8c8d', marginBottom:'15px'}}>
             *เพื่อป้องกันมิจฉาชีพ กรุณาอัปโหลดหลักฐานให้ครบถ้วน (ข้อมูลนี้จะถูกเก็บเป็นความลับ)
           </p>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* อัปโหลดบัตรประชาชน */}
              <div>
                <label style={labelStyle}>📸 รูปหน้าบัตรประชาชน</label>
                <input type="file" accept="image/*" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} style={fileInputStyle} />
                {existingIdCard && !idCardFile && <a href={existingIdCard} target="_blank" style={linkStyle}>ดูรูปเดิมที่อัปโหลดไว้</a>}
              </div>

              {/* อัปโหลดรูปคู่บัตร */}
              <div>
                <label style={labelStyle}>🤳 รูปถ่ายหน้าคุณคู่กับบัตร</label>
                <input type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} style={fileInputStyle} />
                {existingSelfie && !selfieFile && <a href={existingSelfie} target="_blank" style={linkStyle}>ดูรูปเดิมที่อัปโหลดไว้</a>}
              </div>
           </div>
        </div>

        {/* --- โซนการเงิน --- */}
        <div style={{ padding: '20px', backgroundColor: '#fffbf2', borderRadius: '12px', border: '1px solid #ffeaa7' }}>
          <h3 style={{ marginBottom: '15px', color: '#d35400' }}>💰 ข้อมูลรับเงิน (สำหรับคนขาย)</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>ธนาคาร</label>
            <select value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle}>
              <option value="">-- เลือกธนาคาร --</option>
              <option value="KBANK">กสิกรไทย (KBANK)</option>
              <option value="SCB">ไทยพาณิชย์ (SCB)</option>
              <option value="BBL">กรุงเทพ (BBL)</option>
              <option value="KTB">กรุงไทย (KTB)</option>
              <option value="TTB">ทหารไทยธนชาต (TTB)</option>
              <option value="PROMPTPAY">พร้อมเพย์ (PromptPay)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
                <label style={labelStyle}>เลขบัญชี</label>
                <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={inputStyle} placeholder="123-4-56789-0" />
            </div>
            <div>
                <label style={labelStyle}>ชื่อบัญชี <span style={{color:'red'}}>*ต้องตรงกับบัตร</span></label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} style={inputStyle} placeholder="ชื่อ-นามสกุลจริง" />
            </div>
          </div>
        </div>

        {/* --- โซนทั่วไป --- */}
        <div>
           <h3 style={{ marginBottom: '15px', color: '#2d3436' }}>📍 ข้อมูลทั่วไป</h3>
           <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>เบอร์โทรศัพท์</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} placeholder="08x-xxx-xxxx" />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>ที่อยู่ (สำหรับจัดส่ง)</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} style={inputStyle} placeholder="บ้านเลขที่, ถนน, แขวง/เขต..." />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '14px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)' }}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล ✅'}
        </button>

      </div>
    </div>
  );
}

// Styles
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600' as const, fontSize: '14px', color: '#636e72' };
const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', outline: 'none' };
const fileInputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor:'white', fontSize:'14px' };
const linkStyle = { fontSize:'12px', color:'#0984e3', textDecoration:'underline', marginTop:'5px', display:'block' };