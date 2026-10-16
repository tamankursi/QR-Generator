import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateGenerateCount, verifyPin } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { count: rawCount, pin } = body || {};

    const serverPin = process.env.ACTIVATION_PIN || '140405';
    if (!verifyPin(pin, serverPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN salah, coba lagi' },
        { status: 401 }
      );
    }

    const validation = validateGenerateCount(rawCount);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const count = validation.count;
    const items = Array.from({ length: count }, () => ({
      status: 'kosong',
      target_url: null,
    }));

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('qr_codes')
        .insert(items)
        .select('*');

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, message: `Berhasil generate ${data.length} QR code`, data },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: true, message: `Berhasil generate ${count} QR code (demo)`, data: items },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
