/**
 * Excel Import Modal Component
 * Handles bulk guest import from Excel files
 */

import React, { useState, useRef } from 'react';
import { X, UploadCloud, Download, CheckCircle, AlertCircle, FileText, Users, Phone, Mail, User, Hash, Calendar, Edit3 } from 'lucide-react';
import { parseExcelData, ParsedGuestData, generateSampleExcelData } from '../../utils/excelParser';
import { useAuth } from '../../contexts/AuthContext';
import { Toast } from '../common/Toast';
import { apiUrl } from '../../lib/api';

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ open, onClose, onImportComplete }) => {
  const { apiRequest } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedGuestData[]>([]);
  const [importSummary, setImportSummary] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!open) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls') && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setToast({ message: 'Please select a valid Excel or CSV file', type: 'error' });
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setIsProcessing(true);
    setStep('processing');

    try {
      // Read file content
      const fileContent = await readFileContent(selectedFile);
      
      // Parse data based on file type
      let rows: any[] = [];
      
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        rows = parseCSV(fileContent);
      } else {
        // For Excel files, we'll use a simple approach
        // In a real implementation, you'd use a library like xlsx
        setToast({ message: 'Excel file parsing requires additional library. Please use CSV format for now.', type: 'error' });
        setStep('upload');
        setIsProcessing(false);
        return;
      }

      // Parse and validate data
      const result = parseExcelData(rows);
      setParsedData(result.guests);
      setStep('preview');
    } catch (error) {
      console.error('Error processing file:', error);
      setToast({ message: 'Error processing file. Please check the format and try again.', type: 'error' });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }

    return rows;
  };

  const handleImport = async () => {
    const validGuests = parsedData.filter(guest => guest.isValid);
    
    if (validGuests.length === 0) {
      setToast({ message: 'No valid guests to import', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    try {
      // Use bulk import API for better performance
      const response = await apiRequest(apiUrl(`/api/bulk-import/guests`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: validGuests.map(guest => ({
            name: guest.name,
            phone: guest.phone,
            category: guest.category,
            session: guest.session.toString(),
            limit: guest.limit.toString(),
            notes: guest.notes || '',
            tableNo: guest.tableNo || ''
          })),
          generateInvitations: true
        })
      });

      const result = await response.json();

      if (result.success) {
        setImportSummary({
          success: result.data.success,
          failed: result.data.failed,
          errors: result.data.errors || []
        });
        setStep('complete');
        onImportComplete();
      } else {
        setToast({ message: result.error || 'Import failed', type: 'error' });
        setStep('preview');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setToast({ message: error.message || 'Failed to import guests', type: 'error' });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSample = () => {
    const sampleData = generateSampleExcelData();
    const csvContent = convertToCSV(sampleData);
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest-import-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    ).join('\n');
    
    return csvHeaders + '\n' + csvRows;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setImportSummary({ success: 0, failed: 0, errors: [] });
    setIsProcessing(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-3 md:p-4 z-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Import Guests from Excel</h2>
              <p className="text-xs sm:text-sm text-text/60">Upload and preview your guest data</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 sm:p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-secondary rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6">
                <h3 className="font-medium mb-2 sm:mb-3 text-sm sm:text-base">File Requirements</h3>
                <ul className="text-xs sm:text-sm text-text/70 space-y-1">
                  <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
                  <li>• Required columns: Name, Phone</li>
                  <li>• Optional columns: Email, Category, Session, Limit, Table No, Notes</li>
                  <li>• Phone numbers will be automatically formatted to Indonesian format (62...)</li>
                </ul>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg sm:rounded-xl p-6 sm:p-8 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud className="w-8 h-8 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4" />
                <p className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">Drop your file here</p>
                <p className="text-xs sm:text-sm text-text/60 mb-3 sm:mb-4">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
                >
                  Choose File
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <button
                  onClick={downloadSample}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-sm sm:text-base"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  Download Sample
                </button>
                <div className="text-xs sm:text-sm text-text/60">
                  Need help? Download the sample file to see the correct format
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">
                      {parsedData.filter(g => g.isValid).length} Valid
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm">
                      {parsedData.filter(g => !g.isValid).length} Invalid
                    </span>
                  </div>
                </div>
                <div className="text-sm text-text/60">
                  Total: {parsedData.length} guests
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium">Name</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium">Phone</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium hidden sm:table-cell">Email</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium hidden md:table-cell">Category</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium hidden lg:table-cell">Session</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium hidden lg:table-cell">Limit</th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedData.map((guest, index) => (
                        <tr key={index} className={guest.isValid ? '' : 'bg-red-50'}>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">{guest.name}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">{guest.phone}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 hidden sm:table-cell">{guest.email || '-'}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 hidden md:table-cell">{guest.category}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 hidden lg:table-cell">{guest.session}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 hidden lg:table-cell">{guest.limit}</td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                            {guest.isValid ? (
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                            ) : (
                              <div className="flex items-center gap-1 sm:gap-2">
                                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                                <span className="text-xs text-red-600 hidden sm:inline">
                                  {guest.errors[0]}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                <button
                  onClick={() => setStep('upload')}
                  className="px-3 sm:px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm sm:text-base"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={parsedData.filter(g => g.isValid).length === 0 || isProcessing}
                  className="px-4 sm:px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Import {parsedData.filter(g => g.isValid).length} Guests
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3 sm:mb-4"></div>
              <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Processing Import</h3>
              <p className="text-sm sm:text-base text-text/60">Please wait while we import your guests...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-6 sm:py-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              </div>
              <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Import Complete</h3>
              <p className="text-sm sm:text-base text-text/60 mb-4 sm:mb-6">
                Successfully imported {importSummary.success} guests. {importSummary.failed > 0 && `${importSummary.failed} failed.`}
              </p>
              
              {importSummary.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left">
                  <h4 className="font-medium text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">Errors:</h4>
                  <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                    {importSummary.errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importSummary.errors.length > 5 && (
                      <li className="text-red-600 font-medium">... and {importSummary.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 sm:px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm sm:text-base"
                >
                  Done
                </button>
                {importSummary.failed > 0 && (
                  <button
                    onClick={() => setStep('preview')}
                    className="px-4 sm:px-6 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-sm sm:text-base"
                  >
                    Review Errors
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
};