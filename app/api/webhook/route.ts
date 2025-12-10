// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ❌ ลบบรรทัดที่อยู่นอกฟังก์ชันทิ้งไปครับ (ที่เคยอยู่ตรงนี้)

export async function POST(req: Request) {
  try {
    // ✅ ย้ายมาสร้างข้างในนี้แทนครับ (จะทำงานเมื่อมีคนเรียกใช้เท่านั้น)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const event = await req.json();

    if (event.key === 'charge.complete' && event.data.status === 'successful') {
      const orderId = event.data.metadata.order_id;
      const chargeId = event.data.id;

      // 1. อัปเดต Order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'PAID', payment_ref_id: chargeId })
        .eq('id', orderId)
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. ตัดสต็อกสินค้า
      if (order) {
        await supabaseAdmin
          .from('products')
          .update({ sold: true })
          .eq('id', order.product_id);
      }
      
      return NextResponse.json({ message: 'Success' });
    }

    return NextResponse.json({ message: 'Ignored' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}