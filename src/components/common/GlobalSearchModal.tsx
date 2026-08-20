import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Layers, 
  MapPin, 
  Car, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Boxes 
} from 'lucide-react';
import { PartMaster, WarehouseLocation } from '../../types/erp';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartMaster[];
  locations: WarehouseLocation[];
  onSelectPart: (part: PartMaster) => void;
  onSelectLocation?: (location: WarehouseLocation) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  parts,
  locations,
  onSelectPart,
  onSelectLocation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Global hotkey Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const term = searchTerm.trim().toLowerCase();

  // Search filtered parts
  const matchedParts = term
    ? parts.filter((p) => {
        const pNum = p.partNumber.toLowerCase();
        const pOrig = (p.originalPartNumber || '').toLowerCase();
        const pEn = p.nameEn.toLowerCase();
        const pAr = p.nameAr.toLowerCase();
        const pGroup = p.categoryGroup.toLowerCase();
        const pBrand = p.brand.toLowerCase();
        const pSuperseded = p.supersededNumbers.some((sn) => sn.toLowerCase().includes(term));
        const pAlt = p.alternativeNumbers.some((an) => an.toLowerCase().includes(term));
        const pChassis = p.compatibility.some((c) =>
          c.chassis.toLowerCase().includes(term) ||
          c.model.toLowerCase().includes(term) ||
          (c.engine && c.engine.toLowerCase().includes(term))
        );

        return (
          pNum.includes(term) ||
          pOrig.includes(term) ||
          pEn.includes(term) ||
          pAr.includes(term) ||
          pGroup.includes(term) ||
          pBrand.includes(term) ||
          pSuperseded ||
          pAlt ||
          pChassis
        );
      })
    : parts.slice(0, 5); // show initial top parts if empty

  // Search filtered locations
  const matchedLocations = term
    ? locations.filter((l) =>
        l.code.toLowerCase().includes(term) ||
        l.zone.toLowerCase().includes(term) ||
        (l.notes && l.notes.toLowerCase().includes(term))
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className="w-full max-w-2xl bg-[#111111] border border-white/10 rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Search Input Box */}
        <div className="flex items-center px-5 py-4 border-b border-white/10 bg-[#0c0c0e] gap-3.5">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث برقم قطعة مرسيدس (مثال: A2133230500)، الشاسيه (W213)، الاسم، أو كود الرف (A-03)..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 text-xs focus:outline-none font-light"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="text-zinc-500 hover:text-white text-xs p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-[10px] bg-[#18181b] hover:bg-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full border border-white/10 font-mono uppercase tracking-wider"
          >
            ESC
          </button>
        </div>

        {/* Quick Filter Tags */}
        <div className="px-5 py-2.5 bg-[#0c0c0e]/80 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs text-zinc-400">
          <span className="text-[10px] font-medium text-zinc-500">بحث سريع:</span>
          {['W213', 'W205', 'W222', 'W167', 'تيل فرامل', 'تيربو', 'مقص', 'A-03'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchTerm(tag)}
              className="px-2.5 py-0.5 rounded-full bg-[#18181b] hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-[10px] whitespace-nowrap transition font-mono"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Parts Results */}
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 px-2 mb-2 flex items-center justify-between">
              <span>قطع الغيار ({matchedParts.length})</span>
              <span className="text-[10px] text-zinc-500 font-mono">Mercedes-Benz Part Master</span>
            </div>

            {matchedParts.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-light">
                لا توجد قطع غيار مطابقة للبحث "{searchTerm}".
              </div>
            ) : (
              <div className="space-y-2">
                {matchedParts.map((part) => {
                  const isLow = part.totalStock <= part.minStock && part.totalStock > 0;
                  const isOut = part.totalStock === 0;

                  return (
                    <div
                      key={part.id}
                      onClick={() => {
                        onSelectPart(part);
                        onClose();
                      }}
                      className="p-3.5 bg-[#141416] hover:bg-[#18181b] border border-white/5 hover:border-white/20 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#18181b] border border-white/10 flex items-center justify-center text-zinc-300 font-mono font-medium text-xs shrink-0 group-hover:border-white/30 transition">
                          MB
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white text-xs font-medium tracking-wider">
                              {part.partNumber}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#18181b] text-zinc-300 border border-white/10 font-mono">
                              {part.quality === 'GENUINE_OEM' ? 'أصلي وكالة OEM' : part.quality === 'ORIGINAL' ? 'أصلي مرسيدس' : part.quality === 'AFTERMARKET' ? 'بديل معتمد' : 'مجدد'}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-white truncate mt-0.5">
                            {part.nameAr || part.nameEn}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate font-light font-mono">
                            {part.nameEn}
                          </div>
                          
                          {/* Compatible chassis pills */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {part.compatibility.slice(0, 3).map((c, i) => (
                              <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-[#0c0c0e] text-zinc-400 border border-white/5 font-mono">
                                {c.chassis} ({c.model})
                              </span>
                            ))}
                            {part.compatibility.length > 3 && (
                              <span className="text-[9px] text-zinc-500 font-mono">
                                +{part.compatibility.length - 3} موديلات إضافية
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock & Price */}
                      <div className="text-left shrink-0">
                        <div className="text-sm font-mono text-white">
                          ${part.sellingPrice}
                        </div>
                        <div className={`text-xs font-mono mt-0.5 ${
                          isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {part.totalStock} {part.unit === 'PCS' ? 'قطعة' : part.unit}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium">
                          {isOut ? 'نفد المخزون' : isLow ? 'مخزون منخفض' : 'متوفر بالمخزن'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Locations Results */}
          {matchedLocations.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-zinc-400 px-2 mb-2 flex items-center justify-between">
                <span>أرفف ومواقع التخزين بالمستودع ({matchedLocations.length})</span>
                <span className="text-[10px] text-zinc-500 font-mono">المنطقة / الممر / الحامل / الرف</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedLocations.map((loc) => (
                  <div
                    key={loc.id}
                    onClick={() => {
                      if (onSelectLocation) {
                        onSelectLocation(loc);
                        onClose();
                      }
                    }}
                    className="p-3 bg-[#141416] hover:bg-[#18181b] border border-white/5 hover:border-white/20 rounded-xl cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-white text-xs tracking-wider">
                          {loc.code}
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate font-light">
                          المنطقة {loc.zone} • الحامل {loc.shelf} ({loc.notes || 'تخزين عام'})
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-[#0c0c0e] px-2 py-0.5 rounded border border-white/5">
                      السعة: {loc.capacity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-[#0c0c0e] border-t border-white/10 text-[10px] text-zinc-500 flex items-center justify-between">
          <span>انقر على أي صنف لعرض بطاقة التفاصيل الكاملة، الأرفف وسجل الحركات</span>
          <span className="font-mono">ESC للإغلاق</span>
        </div>

      </div>
    </div>
  );
};
