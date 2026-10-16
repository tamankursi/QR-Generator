import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidTargetUrl, verifyPin } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const { id, target_url, pin } = await request.json();

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

    const urlValidation = isValidTargetUrl(target_url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase server key belum terkonfigurasi' },
        { status: 500 }
      );
    }

    // Check existing status
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('qr_codes')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: 'QR code tidak ditemukan' },
        { status: 404 }
      );
    }

    if (existing.status !== 'aktif') {
      return NextResponse.json(
        { success: false, error: 'QR code masih kosong. Silakan aktivasi terlebih dahulu.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('qr_codes')
      .update({
        target_url: urlValidation.normalizedUrl || target_url.trim(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Link berhasil diperbarui',
      data,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
