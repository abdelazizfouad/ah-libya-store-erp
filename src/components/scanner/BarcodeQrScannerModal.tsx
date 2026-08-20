import React, { useState } from 'react';
import { 
  QrCode, 
  Barcode, 
  X, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles
} from 'lucide-react';
import { PartMaster, WarehouseLocation, InventoryItem } from '../../types/erp';
import { useTheme } from '../../lib/themeContext';
import { formatEGP } from '../../lib/formatters';

interface BarcodeQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartMaster[];
  locations: WarehouseLocation[];
  inventory: InventoryItem[];
  onSelectPart: (part: PartMaster) => void;
  onSelectLocation: (location: WarehouseLocation) => void;
}

export const BarcodeQrScannerModal: React.FC<BarcodeQrScannerModalProps> = ({
  isOpen,
  onClose,
  parts,
  locations,
  inventory,
  onSelectPart,
  onSelectLocation
}) => {
  const { isDark } = useTheme();
  const [scanInput, setScanInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<{
    type: 'PART' | 'LOCATION' | 'NOT_FOUND';
    part?: PartMaster;
    location?: WarehouseLocation;
    locationParts?: InventoryItem[];
    code: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleScan = (codeToScan: string) => {
    const raw = codeToScan.trim();
    if (!raw) return;

    const normalized = raw.toUpperCase();

    // 1. Check if it matches a Part (Part Number, Barcode, or QR)
    const matchedPart = parts.find(
      (p) =>
        p.partNumber.toUpperCase() === normalized ||
        (p.barcode && p.barcode === raw) ||
        (p.qrCode && p.qrCode.toUpperCase() === normalized) ||
        p.alternativeNumbers.some((a) => a.toUpperCase() === normalized)
    );

    if (matchedPart) {
      setLastScannedResult({
        type: 'PART',
        part: matchedPart,
        code: raw
      });
      return;
    }

    // 2. Check if it matches a Location Code
    const matchedLocation = locations.find(
      (l) => l.code.toUpperCase() === normalized || l.id === raw
    );

    if (matchedLocation) {
      const partsInLoc = inventory.filter((inv) => inv.locationId === matchedLocation.id || inv.locationCode === matchedLocation.code);
      setLastScannedResult({
        type: 'LOCATION',
        location: matchedLocation,
        locationParts: partsInLoc,
        code: raw
      });
      return;
    }

    // 3. Not found
    setLastScannedResult({
      type: 'NOT_FOUND',
      code: raw
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
          isDark ? 'bg-[#0f0f13] border-white/10 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${isDark ? 'bg-[#09090c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDark ? 'bg-zinc-800 border-white/10 text-emerald-400' : 'bg-slate-200 border-slate-300 text-emerald-700'}`}>
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                ماسح الباركود ورمز الاستجابة السريعة (QR Code)
              </h3>
              <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                مسح ملصقات قطع الغيار أو كود الأرفف بالمستودع
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Scanner Simulation Viewfinder */}
          <div className={`relative aspect-video max-h-48 w-full rounded-2xl border border-dashed flex flex-col items-center justify-center p-4 overflow-hidden group ${
            isDark ? 'bg-[#09090c] border-white/20' : 'bg-slate-100 border-slate-300'
          }`}>
            {/* Animated Laser line */}
            <div className="absolute inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse top-1/2 -translate-y-1/2 w-full" />

            <div className="relative z-10 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Camera className="w-4 h-4 animate-bounce" />
                <span>القارئ البصري نشط / جاهز لمسح الباركود أو الـ QR</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                يمكنك استخدام قارئ الباركود اليدوي، كاميرا الموبايل، أو الإدخال اليدوي المباشر
              </p>
            </div>
          </div>

          {/* Manual Input or Scanner Feed */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan(scanInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Barcode className={`w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="امسح أو اكتب رقم القطعة (مثل A2233302303) أو كود الرف (مثل A-03-02-07)..."
                className={`w-full rounded-xl pr-11 pl-4 py-2.5 text-xs font-mono font-bold border transition focus:outline-none ${
                  isDark
                    ? 'bg-[#09090c] border-white/10 text-white focus:border-emerald-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                }`}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className={`px-5 py-2.5 font-bold text-xs rounded-xl transition shrink-0 ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              بحث / مسح
            </button>
          </form>

          {/* Quick Click-to-Test Barcode Presets */}
          <div className="space-y-2">
            <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>نماذج تجريبية سريعة:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setScanInput('A2233302303');
                  handleScan('A2233302303');
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200 text-emerald-800 border-slate-300'
                }`}
              >
                قطعة: A2233302303 (مقص أمامي مرسيدس W223)
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanInput('A-03-02-07');
                  handleScan('A-03-02-07');
                }}
                className={`px-3 py-1.5 rounded-full border text-xs font-mono font-bold transition ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                رف تخزين: A-03-02-07
              </button>
            </div>
          </div>

          {/* Scan Result Card */}
          {lastScannedResult && (
            <div className={`mt-4 p-5 rounded-2xl border space-y-4 animate-fadeIn ${
              isDark ? 'bg-[#141418] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              
              {/* Part Found */}
              {lastScannedResult.type === 'PART' && lastScannedResult.part && (
                <div>
                  <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم التعرف على قطعة غيار مرسيدس بنجاح</span>
                    </div>
                    <span className="text-xs font-mono opacity-60">
                      الكود: {lastScannedResult.code}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                          {lastScannedResult.part.partNumber}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold border ${
                          isDark ? 'bg-zinc-900 text-zinc-300 border-zinc-800' : 'bg-white text-slate-700 border-slate-300'
                        }`}>
                          {lastScannedResult.part.quality === 'GENUINE_OEM' ? 'أصلي وكالة OEM' : 'مطابق للأصلي'}
                        </span>
                      </div>
                      <div className="text-sm font-bold">
                        {lastScannedResult.part.nameAr || lastScannedResult.part.nameEn}
                      </div>
                      <div className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        {lastScannedResult.part.nameEn}
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-xs opacity-60 font-mono">الرصيد المتاح</div>
                      <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {lastScannedResult.part.totalStock} {lastScannedResult.part.unit}
                      </div>
                      <div className="text-xs font-mono font-bold mt-0.5">
                        {formatEGP(lastScannedResult.part.sellingPrice)}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-4 pt-3 border-t flex justify-end gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                      onClick={() => {
                        onSelectPart(lastScannedResult.part!);
                        onClose();
                      }}
                      className={`px-5 py-2 font-bold text-xs rounded-full transition ${
                        isDark
                          ? 'bg-white hover:bg-zinc-200 text-black'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      فتح بطاقة الصنف ←
                    </button>
                  </div>
                </div>
              )}

              {/* Location Found */}
              {lastScannedResult.type === 'LOCATION' && lastScannedResult.location && (
                <div>
                  <div className={`flex items-center justify-between border-b pb-3 mb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم التعرف على موقع رف التخزين بالمستودع</span>
                    </div>
                    <span className="text-xs font-mono opacity-60">
                      الكود: {lastScannedResult.code}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-mono font-bold text-base tracking-wider text-emerald-600 dark:text-emerald-400">
                        {lastScannedResult.location.code}
                      </div>
                      <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        المنطقة {lastScannedResult.location.zone} • الممر {lastScannedResult.location.aisle} • الرف {lastScannedResult.location.shelf}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-mono font-bold ${
                        isDark ? 'bg-zinc-900 text-zinc-300 border-white/10' : 'bg-white text-slate-700 border-slate-300'
                      }`}>
                        السعة القصوى: {lastScannedResult.location.capacity} قطعة
                      </span>
                    </div>
                  </div>

                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    القطع المخزنة في هذا الرف ({lastScannedResult.locationParts?.length || 0}):
                  </div>

                  {lastScannedResult.locationParts && lastScannedResult.locationParts.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {lastScannedResult.locationParts.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isDark ? 'bg-[#09090c] border-white/5' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 ml-2">
                              {item.partNumber}
                            </span>
                            <span className="font-medium">{item.partNameAr || item.partNameEn}</span>
                          </div>
                          <span className="font-mono font-bold">
                            {item.quantity} قطعة
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs italic p-3 opacity-60">
                      هذا الرف فارغ حالياً وجاهز للتخزين.
                    </div>
                  )}

                  <div className={`mt-4 pt-3 border-t flex justify-end gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                      onClick={() => {
                        onSelectLocation(lastScannedResult.location!);
                        onClose();
                      }}
                      className={`px-5 py-2 font-bold text-xs rounded-full transition ${
                        isDark
                          ? 'bg-white hover:bg-zinc-200 text-black'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      معاينة الرف ←
                    </button>
                  </div>
                </div>
              )}

              {/* Not Found */}
              {lastScannedResult.type === 'NOT_FOUND' && (
                <div className="text-center py-5 space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <div className="text-sm font-bold">
                    لم يتم العثور على رمز الباركود أو الـ QR: "{lastScannedResult.code}"
                  </div>
                  <p className={`text-xs font-medium max-w-sm mx-auto ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    تأكد من صحة رقم القطعة أو كود الرف التخزيني.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`px-4 sm:px-6 py-3 border-t text-xs flex items-center justify-between ${isDark ? 'bg-[#09090c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <span className="font-mono text-[11px] opacity-75 hidden sm:inline">نظام المسح البصري: MB-PART-[CODE]</span>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition border ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
