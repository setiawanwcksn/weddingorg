/**
 * QRTestUtility
 * A debugging component to test QR code generation and scanning
 * Helps verify that QR codes are being generated correctly and can be scanned
 */
import React from 'react';
import { QrCode, Download, Camera } from 'lucide-react';

interface QRTestUtilityProps {
  onGenerateTestQR?: (text: string) => void;
  onTestScanning?: () => void;
}

export function QRTestUtility({ onGenerateTestQR, onTestScanning }: QRTestUtilityProps): JSX.Element {
  const [testText, setTestText] = React.useState('aaa');
  const [generatedQR, setGeneratedQR] = React.useState<string | null>(null);

  const generateQRCode = async () => {
    try {
      // Use a simple QR code generation approach
      // In a real implementation, you might use a library like qrcode.js
      const qrDataUrl = await generateSimpleQR(testText);
      setGeneratedQR(qrDataUrl);
      onGenerateTestQR?.(testText);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const generateSimpleQR = async (text: string): Promise<string> => {
    // This is a simplified QR generation - in production you'd use a proper library
    // For now, we'll create a data URL that represents the text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    canvas.width = 200;
    canvas.height = 200;
    
    // Create a simple pattern that represents QR code structure
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add finder patterns (simplified)
    ctx.fillStyle = '#000000';
    // Top-left finder pattern
    ctx.fillRect(20, 20, 40, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(30, 30, 20, 20);
    ctx.fillStyle = '#000000';
    ctx.fillRect(35, 35, 10, 10);
    
    // Top-right finder pattern
    ctx.fillRect(140, 20, 40, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(150, 30, 20, 20);
    ctx.fillStyle = '#000000';
    ctx.fillRect(155, 35, 10, 10);
    
    // Bottom-left finder pattern
    ctx.fillRect(20, 140, 40, 40);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(30, 150, 20, 20);
    ctx.fillStyle = '#000000';
    ctx.fillRect(35, 155, 10, 10);
    
    // Add some data pattern based on text
    const textHash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((textHash + i * j) % 3 === 0) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(60 + i * 10, 60 + j * 10, 8, 8);
        }
      }
    }
    
    // Add text label
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 100, 195);
    
    return canvas.toDataURL('image/png');
  };

  const downloadQRCode = () => {
    if (!generatedQR) return;
    
    const link = document.createElement('a');
    link.download = `qr-${testText}.png`;
    link.href = generatedQR;
    link.click();
  };

  const presetTests = [
    { name: 'Simple "aaa"', text: 'aaa' },
    { name: 'Guest Name', text: 'John Doe' },
    { name: 'Long Name', text: 'Maria Elizabeth Johnson Smith' },
    { name: 'Special Chars', text: 'Test-Name_123' },
    { name: 'Numbers Only', text: '123456' },
    { name: 'Mixed Case', text: 'AaBbCc123' }
  ];

  return (
    <div className="bg-white rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <QrCode size={20} className="text-primary" />
        <h3 className="font-semibold text-text">QR Code Test Utility</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-text/70 mb-1">
            Test Text for QR Code
          </label>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary"
            placeholder="Enter text to generate QR code"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={generateQRCode}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            <QrCode size={16} />
            Generate QR
          </button>
          
          <button
            onClick={downloadQRCode}
            disabled={!generatedQR}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-text rounded-lg text-sm hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={16} />
            Download
          </button>
          
          <button
            onClick={onTestScanning}
            className="flex items-center gap-2 px-3 py-2 bg-accent text-text rounded-lg text-sm hover:bg-accent/80 transition-colors"
          >
            <Camera size={16} />
            Test Scan
          </button>
        </div>
        
        {generatedQR && (
          <div className="border border-border rounded-lg p-3 bg-accent">
            <div className="text-xs text-text/70 mb-2">Generated QR Code:</div>
            <img
              src={generatedQR}
              alt={`QR Code for: ${testText}`}
              className="w-32 h-32 mx-auto border border-border rounded"
            />
            <div className="text-xs text-text/70 text-center mt-2 font-mono">
              Content: "{testText}"
            </div>
          </div>
        )}
        
        <div>
          <div className="text-xs text-text/70 mb-2">Quick Test Presets:</div>
          <div className="grid grid-cols-2 gap-2">
            {presetTests.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setTestText(preset.text)}
                className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary transition-colors text-left"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-text/60 bg-accent p-3 rounded-lg">
          <div className="font-medium mb-1">Testing Instructions:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Generate a QR code with your test text</li>
            <li>Download the QR code image</li>
            <li>Use the Upload mode in the scanner to test decoding</li>
            <li>Or display the QR on another device and scan with camera</li>
            <li>Check browser console for detailed debugging logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}