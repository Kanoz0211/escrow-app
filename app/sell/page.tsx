// app/sell/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // State สำหรับฟอร์ม
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  // 1. เช็ค Auth ก่อน (คนไม่ล็อกอิน ห้ามขาย)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('กรุณาล็อกอินก่อนลงขายสินค้า');
        router.push('/auth');
      } else {
        setUser(user);
      }
    };
    checkUser();
  }, [router]);

  // ฟังก์ชันเลือกรูปภาพและแสดงตัวอย่าง
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // สร้าง URL ชั่วคราวไว้โชว์รูป
    }
  };

  // 2. ฟังก์ชันบันทึกข้อมูล (หัวใจหลัก)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !imageFile) return alert('กรุณากรอกข้อมูลให้ครบและใส่รูปภาพ');
    
    setLoading(true);

    try {
      // A. อัปโหลดรูปภาพขึ้น Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`; // ตั้งชื่อไฟล์ไม่ให้ซ้ำ
      const filePath = `${user.id}/${fileName}`; // แยกโฟลเดอร์ตาม User ID

      const { error: uploadError } = await supabase.storage
        .from('products') // ⚠️ ต้องตรงกับชื่อ Bucket ที่สร้างใน Supabase
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      // B. ดึงลิงก์รูปภาพ (Public URL)
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      // C. บันทึกข้อมูลลง Database
      const { error: dbError } = await supabase
        .from('products')
        .insert([
          {
            seller_id: user.id,
            title: title,
            description: description,
            price: Number(price),
            images: [publicUrl] // เก็บเป็น Array ตามโครงสร้างเดิม
          }
        ]);

      if (dbError) throw dbError;

      alert('✅ ลงขายสินค้าเรียบร้อย!');
      router.push('/'); // กลับหน้าแรกไปดูผลงาน

    } catch (error: any) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-center">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
        📝 ลงขายสินค้าใหม่
      </h1>

      <form onSubmit={handleSubmit}>
        
        {/* ชื่อสินค้า */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ชื่อสินค้า</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ไอดี ROV, รหัส Netflix"
            required
            style={inputStyle}
          />
        </div>

        {/* ราคา */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ราคา (บาท)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="ระบุราคา"
            required
            style={inputStyle}
          />
        </div>

        {/* รายละเอียด */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>รายละเอียด</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายสินค้าเพิ่มเติม..."
            rows={4}
            style={{ ...inputStyle, height: 'auto' }}
          />
        </div>

        {/* อัปโหลดรูปภาพ */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>รูปภาพสินค้า</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            style={{ marginBottom: '10px' }}
          />
          
          {/* พรีวิวรูปภาพ */}
          {previewUrl && (
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #ddd' }} 
              />
            </div>
          )}
        </div>

        {/* ปุ่ม Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
        >
          {loading ? 'กำลังอัปโหลด...' : 'ลงขายทันที 🚀'}
        </button>

      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ccc',
  borderRadius: '5px',
  fontSize: '16px'
};