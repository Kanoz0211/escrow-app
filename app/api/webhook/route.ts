// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const event = await req.json();

    console.log('🔔 Webhook Received:', event.key); // ดู Log ว่ามีใครเรียกมาไหม

    // ตรวจสอบว่า Event คือ "จ่ายเงินสำเร็จ" (charge.complete) และสถานะต้อง successful
    if (event.key === 'charge.complete' && event.data.status === 'successful') {
      
      const orderId = event.data.metadata.order_id; // ดึง Order ID ที่เราเคยแนบไว้
      const chargeId = event.data.id;

      console.log(`💰 Payment Successful for Order: ${orderId}`);

      // อัปเดต Database เป็น PAID
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'PAID',
          payment_ref_id: chargeId // เก็บเลข Ref ไว้ตรวจสอบย้อนหลัง
        })
        .eq('id', orderId);

      if (error) throw error;
      
      return NextResponse.json({ message: 'Order updated successfully' });
    }

    return NextResponse.json({ message: 'Event ignored' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}