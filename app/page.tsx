// app/page.tsx
import { supabase } from '../lib/supabaseClient'; // แก้ Path ให้ถูกต้องแล้ว
import BuyButton from '../components/BuyButton';
import styles from './page.module.css';

// กำหนดหน้าตาข้อมูลสินค้า (TypeScript Interface)
interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[] | null;
}

export default async function Home() {
  
  // 1. ดึงข้อมูลสินค้าจาก Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  // 2. ถ้ามี Error ให้แสดงข้อความแจ้งเตือน
  if (error) {
    return (
      <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>
        <h2>เกิดข้อผิดพลาด!</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  // 3. แสดงหน้าเว็บ
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>
        🛒 ตลาดตัวกลาง (Escrow Marketplace)
      </h1>

      <div className={styles.grid}>
        {/* กรณีไม่มีสินค้าเลย */}
        {!products || products.length === 0 ? (
          <p className={styles.emptyState}>ยังไม่มีสินค้าในระบบ</p>
        ) : (
          /* กรณีมีสินค้า: วนลูปแสดงการ์ดสินค้า */
          products.map((product: any) => (
            <div key={product.id} className={styles.card}>
              
              {/* ส่วนรูปภาพ (ถ้ามี) */}
              <div style={{ 
                height: '150px', 
                backgroundColor: '#eee', 
                marginBottom: '15px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#888'
              }}>
                {product.images ? 'มีรูปภาพ' : 'ไม่มีรูปภาพ'}
              </div>

              {/* ชื่อสินค้า */}
              <h2 className={styles.productTitle}>{product.title}</h2>
              
              {/* รายละเอียด */}
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                {product.description || 'ไม่มีรายละเอียด'}
              </p>

              {/* ราคา */}
              <div className={styles.price}>
                ฿{product.price.toLocaleString()} 
              </div>

              {/* ปุ่มซื้อ (ใส่ไว้โชว์ก่อน ยังกดไม่ได้) */}
              {/* ส่งข้อมูลสินค้า product ไปให้ปุ่มด้วย */}
<BuyButton product={product} />

            </div>
          ))
        )}
      </div>
    </main>
  );
}