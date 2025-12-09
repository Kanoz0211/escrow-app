// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const event = await req.json();

    // ตรวจสอบว่าเป็น Event จ่ายเงินสำเร็จ
    if (event.key === 'charge.complete' && event.data.status === 'successful') {
      
      const orderId = event.data.metadata.order_id;
      const chargeId = event.data.id;

      console.log(`💰 Payment Successful for Order: ${orderId}`);

      // 1. อัปเดตสถานะ Order เป็น PAID
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'PAID',
          payment_ref_id: chargeId 
        })
        .eq('id', orderId)
        .select() // ขอข้อมูลที่อัปเดตกลับมาด้วย (จะได้รู้ product_id)
        .single();

      if (orderError) throw orderError;

      // 2. 👇 (เพิ่มใหม่) ไปอัปเดตสินค้าว่า "ขายแล้ว" (sold = true)
      if (order) {
        await supabase
          .from('products')
          .update({ sold: true })
          .eq('id', order.product_id);
      }
      
      return NextResponse.json({ message: 'Order & Product updated successfully' });
    }

    return NextResponse.json({ message: 'Event ignored' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}