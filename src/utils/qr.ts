import QRCode from 'qrcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Generates a clean, high-contrast black-and-white QR code PNG data URL.
 */
export async function generateQRCodeDataUrl(
  text: string,
  width: number = 256
): Promise<string> {
  return QRCode.toDataURL(text, {
    width,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Downloads a single QR code image as PNG.
 */
export function downloadSingleQRCodePng(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Packages all QR codes into a single ZIP archive and triggers browser download.
 */
export async function downloadAllQRCodesZip(
  items: Array<{ id: string; url: string; status: string }>,
  zipFilename: string = 'semua-qr-codes.zip'
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('qr-codes') || zip;

  for (const item of items) {
    const shortId = item.id.substring(0, 8);
    // Generate high resolution 512x512 for print quality
    const dataUrl = await generateQRCodeDataUrl(item.url, 512);
    // Remove base64 prefix
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `qr-${shortId}-${item.status}.png`;
    folder.file(filename, base64Data, { base64: true });
  }

  // Add a manifest text file
  const manifest = items
    .map(
      (item, index) =>
        `#${index + 1} | ID: ${item.id} | Short: ${item.id.substring(0, 8)} | Status: ${item.status} | URL: ${item.url}`
    )
    .join('\n');
  folder.file('daftar-qr.txt', `DAFTAR QR CODE GENERATED\nTanggal: ${new Date().toLocaleString('id-ID')}\nTotal: ${items.length}\n\n${manifest}`);

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, zipFilename);
}
