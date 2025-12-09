// app/api/payment/route.ts
import { NextResponse } from 'next/server';
// @ts-ignore
import Omise from 'omise';

const omise = Omise({
  publicKey: process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

export async function POST(req: Request) {
  try {
    const { amount, orderId } = await req.json();

    // -------------------------------------------------------
    // ขั้นตอนที่ 1: สร้าง Source (QR Code PromptPay)
    // -------------------------------------------------------
    const source: any = await new Promise((resolve, reject) => {
      omise.sources.create({
        amount: amount * 100, // หน่วยสตางค์
        currency: 'thb',
        type: 'promptpay'
      }, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    });

    // -------------------------------------------------------
    // ขั้นตอนที่ 2: เอา Source ID ไปสร้าง Charge (ใบแจ้งหนี้)
    // -------------------------------------------------------
    const charge = await new Promise((resolve, reject) => {
      omise.charges.create({
        amount: amount * 100,
        currency: 'thb',
        source: source.id, // ✅ ส่งเป็น ID (String) แทน Object แล้ว หายแดงแน่นอน
        metadata: {
          order_id: orderId
        }
      }, (err: any, resp: any) => {
        if (err) reject(err);
        else resolve(resp);
      });
    });

    // ส่งข้อมูลกลับไปหน้าเว็บ
    return NextResponse.json({ charge });

  } catch (error: any) {
    console.error('Omise Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}