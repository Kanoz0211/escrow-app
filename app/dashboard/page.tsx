// app/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [myOrders, setMyOrders] = useState<any[]>([]); // ของที่ฉันซื้อ
  const [mySales, setMySales] = useState<any[]>([]);   // ของที่ฉันขาย (เพิ่มอันนี้!)
  const [myProducts, setMyProducts] = useState<any[]>([]); // สินค้าในสต็อก

  useEffect(() => {
    const fetchData = async () => {
      // 1. เช็ค Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      // 2. ดึงรายการที่ฉัน "ซื้อ" (Buyer)
      const { data: orders } = await supabase
        .from('orders')
        .select('*, products(*)') 
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      setMyOrders(orders || []);

      // 3. ดึงรายการที่ฉัน "ขาย" (Seller) - อันนี้แหละที่ต้องใช้ส่งของ
      const { data: sales } = await supabase
        .from('orders')
        .select('*, products(*)')
        .eq('seller_id', user.id) // ดึงเฉพาะออเดอร์ที่เป็นของฉัน
        .order('created_at', { ascending: false });
      setMySales(sales || []);

      // 4. ดึงสินค้าในสต็อก (Inventory)
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      setMyProducts(products || []);

      setLoading(false);
    };

    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-gray-500">⏳ กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      
      {/* หัวข้อหน้า */}
      <div style={{ marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#2d3436' }}>
          Dashboard <span style={{ color: '#d4af37', fontSize: '1.2rem', fontWeight: 'normal' }}>/ บัญชีของฉัน</span>
        </h1>
        <p style={{ color: '#636e72', marginTop: '5px' }}>จัดการคำสั่งซื้อและสินค้าของคุณ ({user.email})</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
        
        {/* === ZONE 1: รายการขาย (Seller) - ต้องมากดส่งของตรงนี้ === */}
        <div style={{...cardStyle, border: '2px solid #d4af37'}}> {/* เน้นขอบทองให้รู้ว่าสำคัญ */}
          <h2 style={headerStyle}>
            📦 รายการขาย (รอจัดส่ง) <span style={{fontSize: '0.9rem', color: '#d4af37', fontWeight:'bold'}}>({mySales.length})</span>
          </h2>
          
          {mySales.length === 0 ? (
            <div style={emptyStateStyle}>ยังไม่มีคำสั่งซื้อเข้ามา</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {mySales.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} style={itemCardStyle}>
                  <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: 'bold', color: '#2d3436', marginBottom: '5px' }}>
                       ขาย: {order.products?.title}
                     </div>
                     <div style={{ fontSize: '0.85rem', color: '#636e72' }}>
                       ลูกค้า: {order.buyer_id.slice(0,6)}...
                     </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#28a745', fontWeight: 'bold', marginBottom: '5px' }}>
                      +฿{order.amount.toLocaleString()}
                    </div>
                    <span style={{ 
                       padding: '4px 10px', borderRadius: '20px', color: 'white', fontSize: '10px', fontWeight: 'bold',
                       backgroundColor: getStatusColor(order.status)
                    }}>
                      {order.status === 'PAID' ? 'รอส่งของ 🚚' : order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === ZONE 2: ประวัติการซื้อของฉัน (Buyer) === */}
        <div style={cardStyle}>
          <h2 style={headerStyle}>
            🛒 ของที่ฉันซื้อไป <span style={{fontSize: '0.9rem', color: '#999'}}>({myOrders.length})</span>
          </h2>
          
          {myOrders.length === 0 ? (
             <div style={emptyStateStyle}>คุณยังไม่เคยซื้อสินค้า</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} style={itemCardStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#2d3436' }}>{order.products?.title}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#d4af37', fontWeight: 'bold' }}>-฿{order.amount.toLocaleString()}</div>
                    <span style={{ fontSize: '10px', color: '#999' }}>{order.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === ZONE 3: สินค้าในสต็อก (Inventory) === */}
        <div style={cardStyle}>
          <h2 style={headerStyle}>
            🏷️ สินค้าที่ลงขายไว้ <span style={{fontSize: '0.9rem', color: '#999'}}>({myProducts.length})</span>
          </h2>
          
          {myProducts.length === 0 ? (
            <div style={emptyStateStyle}>
              <Link href="/sell" style={{ color: '#d4af37', fontWeight: 'bold' }}>+ ลงขายเลย</Link>
            </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myProducts.map((product) => (
                <div key={product.id} style={itemCardStyle}>
                   <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: product.sold ? '#ccc' : '#2d3436', textDecoration: product.sold ? 'line-through' : 'none' }}>
                        {product.title}
                      </div>
                      {product.sold && <span style={{color: 'red', fontSize: '10px', fontWeight: 'bold'}}>ขายแล้ว</span>}
                   </div>
                   <div style={{ fontWeight: 'bold', color: '#2d3436' }}>฿{product.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// --- Styles Helper ---
const cardStyle = {
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '25px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.02)'
};

const headerStyle = {
  fontSize: '1.2rem',
  marginBottom: '20px',
  paddingBottom: '15px',
  borderBottom: '1px solid #f5f5f5',
  color: '#2d3436',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const itemCardStyle = {
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  padding: '15px',
  backgroundColor: '#fcfcfc',
  borderRadius: '12px',
  border: '1px solid #f0f0f0',
  transition: 'all 0.2s ease',
  cursor: 'pointer'
};

const emptyStateStyle = {
  textAlign: 'center' as const,
  padding: '40px 0',
  color: '#b2bec3',
  fontSize: '0.9rem'
};

function getStatusColor(status: string) {
  switch (status) {
    case 'WAITING_PAYMENT': return '#b2bec3';
    case 'PAID': return '#0984e3'; 
    case 'SHIPPED': return '#f1c40f';
    case 'COMPLETED': return '#00b894';
    case 'REFUNDED': return '#d63031';
    default: return '#636e72';
  }
}