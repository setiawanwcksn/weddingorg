// ------------------------------
// ESC/POS HELPERS FOR RAWBT
// ------------------------------

// Convert text → bytes
export function escposText(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

// Line feed (default 1)
export function escposLF(lines = 1): number[] {
  return Array.from({ length: lines }, () => 0x0A);
}

// ESC/POS QR Code (Model 2, dengan module size & ECC)
export function escposQRCode(data: string, moduleSize = 4, ecc: 'L' | 'M' | 'Q' | 'H' = 'L'): number[] {
  const bytes: number[] = [];
  const append = (...vals: number[]) => bytes.push(...vals);

  const encoder = new TextEncoder();
  const qrData = encoder.encode(data);
  const storeLen = qrData.length + 3; // k + 3

  // Map error correction
  const eccMap: Record<typeof ecc, number> = {
    L: 48, // '0'
    M: 49, // '1'
    Q: 50, // '2'
    H: 51  // '3'
  };
  const eccCode = eccMap[ecc];

  // 1. Select model: 2
  // GS ( k 4 0 49 65 50 0
  append(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

  // 2. Set module size
  // GS ( k 3 0 49 67 n
  const size = Math.max(1, Math.min(16, moduleSize));
  append(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);

  // 3. Set error correction level
  // GS ( k 3 0 49 69 n
  append(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, eccCode);

  // 4. Store data
  // GS ( k pL pH 49 80 48 d1..dk
  append(
    0x1D, 0x28, 0x6B,
    storeLen & 0xFF,
    (storeLen >> 8) & 0xFF,
    0x31, 0x50, 0x30,
    ...Array.from(qrData)
  );

  // 5. Print symbol
  // GS ( k 3 0 49 81 48
  append(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);

  return bytes;
}


// Encode bytes → Base64 for RawBT
export function escposToBase64(bytes: number[]): string {
  const uint8 = new Uint8Array(bytes);
  const binary = String.fromCharCode(...uint8);
  return btoa(binary);
}

// Send final ESC/POS bytes to RawBT
// rawbt:base64,<data>
export function sendToRawBT(bytes: number[]) {
  const base64 = escposToBase64(bytes);
  window.location.href = `rawbt:base64,${base64}`;
}
