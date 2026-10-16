import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidTargetUrl, verifyPin, MemoryRateLimiter } from '@/lib/validation';

const rateLimiter = new MemoryRateLimiter(60 * 1000, 10);

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = rateLimiter.check(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Terlalu banyak percobaan aktivasi. Harap tunggu sebentar.`,
        },
        { status: 429 }
      );
    }

    const { id, business_name, target_url, pin } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID QR code tidak valid' },
        { status: 400 }
      );
    }

    // Verify PIN strictly server-side
    const serverPin = process.env.ACTIVATION_PIN || '140405';
    if (!verifyPin(pin, serverPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN salah, coba lagi' },
        { status: 401 }
      );
    }

    // Validate target URL
    const urlValidation = isValidTargetUrl(target_url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, error: urlValidation.error },
        { status: 400 }
      );
    }

    // Sanitize business_name: optional, max 100 chars, trimmed
    let cleanBusinessName: string | null = null;
    if (typeof business_name === 'string') {
      const trimmed = business_name.trim();
      if (trimmed.length > 0) {
        cleanBusinessName = trimmed.substring(0, 100);
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase server key belum terkonfigurasi' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('qr_codes')
      .update({
        status: 'aktif',
        business_name: cleanBusinessName,
        target_url: urlValidation.normalizedUrl || target_url.trim(),
        activated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: error?.message || 'QR code tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'QR code berhasil diaktivasi',
      data,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
