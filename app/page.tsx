// app/page.tsx
import { supabase } from '../lib/supabaseClient';
import BuyButton from '../components/BuyButton'; // อย่าลืม import ปุ่มซื้อ
import styles from './page.module.css';

// กำหนดหน้าตาข้อมูลสินค้า
interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[] | null;
}

export default async function Home() {
  
  // 1. ดึงข้อมูลสินค้าจาก Supabase (เรียงจากใหม่สุดไปเก่าสุด)
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('sold', false) // 👈 เพิ่มบรรทัดนี้ครับ (แปลว่า: เอาเฉพาะ sold = false)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>
        <h2>เกิดข้อผิดพลาด!</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className={styles.title}>🛒 ตลาดตัวกลาง (Escrow Marketplace)</h1>
        
      </div>

      <div className={styles.grid}>
        {!products || products.length === 0 ? (
          <p className={styles.emptyState}>ยังไม่มีสินค้าในระบบ</p>
        ) : (
          products.map((product: any) => (
            <div key={product.id} className={styles.card}>
              
              {/* 👇 จุดที่แก้: เปลี่ยนจากตัวหนังสือ เป็นแท็ก <img> */}
              <div style={{ 
                height: '200px', // เพิ่มความสูงหน่อย
                backgroundColor: '#eee', 
                marginBottom: '15px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: '5px'
              }}>
                {product.images && product.images.length > 0 ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ color: '#888' }}>ไม่มีรูปภาพ</span>
                )}
              </div>

              {/* ชื่อสินค้า */}
              <h2 className={styles.productTitle}>{product.title}</h2>
              
              {/* รายละเอียด */}
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '10px', height: '40px', overflow: 'hidden' }}>
                {product.description || 'ไม่มีรายละเอียด'}
              </p>

              {/* ราคา */}
              <div className={styles.price}>
                ฿{product.price.toLocaleString()} 
              </div>

              {/* ปุ่มซื้อ */}
              <BuyButton product={product} />

            </div>
          ))
        )}
      </div>
    </main>
  );
}