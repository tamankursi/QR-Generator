import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyPin } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const { id, pin } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID QR code tidak valid' },
        { status: 400 }
      );
    }

    const serverPin = process.env.ACTIVATION_PIN || '140405';
    if (!verifyPin(pin, serverPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN salah, coba lagi' },
        { status: 401 }
      );
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('qr_codes')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'QR code berhasil dihapus',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
