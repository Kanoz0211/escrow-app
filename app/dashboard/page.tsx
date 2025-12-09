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
  
  const [myOrders, setMyOrders] = useState<any[]>([]); 
  const [myProducts, setMyProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. เช็ค Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);

      // 2. ดึงรายการที่ฉัน "ซื้อ"
      const { data: orders } = await supabase
        .from('orders')
        .select('*, products(*)') 
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });
      setMyOrders(orders || []);

      // 3. ดึงสินค้าที่ฉัน "ลงขาย"
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
        
        {/* === CARD 1: รายการซื้อของฉัน === */}
        <div style={cardStyle}>
          <h2 style={headerStyle}>
            🛒 ประวัติการสั่งซื้อ <span style={{fontSize: '0.9rem', color: '#999'}}>({myOrders.length})</span>
          </h2>
          
          {myOrders.length === 0 ? (
            <div style={emptyStateStyle}>คุณยังไม่เคยซื้อสินค้า</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`} style={itemCardStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#2d3436', marginBottom: '5px' }}>
                      {order.products?.title || 'สินค้าไม่ทราบชื่อ'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999' }}>
                      Order #{order.id.slice(0, 8)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#d4af37', fontWeight: 'bold', marginBottom: '5px' }}>
                      ฿{order.amount.toLocaleString()}
                    </div>
                    <span style={{ 
                       padding: '4px 10px', borderRadius: '20px', color: 'white', fontSize: '10px', fontWeight: 'bold',
                       backgroundColor: getStatusColor(order.status)
                    }}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* === CARD 2: รายการขายของฉัน === */}
        <div style={cardStyle}>
          <h2 style={headerStyle}>
            🏷️ สินค้าที่ลงขาย <span style={{fontSize: '0.9rem', color: '#999'}}>({myProducts.length})</span>
          </h2>
          
          {myProducts.length === 0 ? (
            <div style={emptyStateStyle}>
              คุณยังไม่ได้ลงขาย <br/>
              <Link href="/sell" style={{ color: '#d4af37', fontWeight: 'bold', marginTop: '10px', display: 'inline-block' }}>+ ลงขายเลย</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {myProducts.map((product) => (
                <div key={product.id} style={itemCardStyle}>
                   {/* รูปภาพ */}
                   <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#eee', flexShrink: 0 }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#ccc' }}>No Pic</div>
                      )}
                   </div>

                   <div style={{ flex: 1, marginLeft: '15px' }}>
                      <div style={{ fontWeight: 'bold', color: '#2d3436' }}>{product.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#636e72' }}>
                        ลงขายเมื่อ: {new Date(product.created_at).toLocaleDateString('th-TH')}
                      </div>
                   </div>

                   <div style={{ fontWeight: 'bold', color: '#2d3436' }}>
                      ฿{product.price.toLocaleString()}
                   </div>
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
  boxShadow: '0 10px 40px rgba(0,0,0,0.05)', // เงาฟุ้งๆ Luxury
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
    case 'WAITING_PAYMENT': return '#b2bec3'; // เทา
    case 'PAID': return '#0984e3'; // ฟ้า
    case 'SHIPPED': return '#f1c40f'; // เหลืองทอง
    case 'COMPLETED': return '#00b894'; // เขียว
    case 'REFUNDED': return '#d63031'; // แดง
    default: return '#636e72';
  }
}