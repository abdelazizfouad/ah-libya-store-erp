import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  AlertTriangle
} from 'lucide-react';
import { PartMaster, WarehouseLocation, Branch, Warehouse, MovementType } from '../../types/erp';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { executeStockMovement } from '../../lib/firestoreService';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: PartMaster[];
  locations: WarehouseLocation[];
  warehouses: Warehouse[];
  branches: Branch[];
  preselectedPart?: PartMaster | null;
  onSuccess: () => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  parts,
  locations,
  warehouses,
  branches,
  preselectedPart,
  onSuccess
}) => {
  const { currentUser, activeBranch } = useAuth();
  const { isDark } = useTheme();

  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [movementType, setMovementType] = useState<MovementType>('PURCHASE');
  const [quantity, setQuantity] = useState<number>(5);
  const [sourceLocationId, setSourceLocationId] = useState<string>('');
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Part
  const activePart = parts.find(p => p.id === selectedPartId) || parts[0];

  useEffect(() => {
    if (preselectedPart) {
      setSelectedPartId(preselectedPart.id);
    } else if (parts.length > 0 && !selectedPartId) {
      setSelectedPartId(parts[0].id);
    }
  }, [preselectedPart, parts, selectedPartId]);

  useEffect(() => {
    if (locations.length > 0) {
      if (!sourceLocationId) setSourceLocationId(locations[0].id);
      if (!targetLocationId && locations.length > 1) setTargetLocationId(locations[1].id);
    }
  }, [locations, sourceLocationId, targetLocationId]);

  if (!isOpen || !activePart) return null;

  const sourceLoc = locations.find(l => l.id === sourceLocationId) || locations[0];
  const targetLoc = locations.find(l => l.id === targetLocationId) || locations[1] || locations[0];
  const defaultWarehouse = warehouses[0] || { id: 'wh_main', name: 'المستودع الرئيسي' };

  // Calculate delta based on movement type
  let quantityDelta = Math.abs(quantity);
  if (['SALE', 'DAMAGED', 'LOST', 'SUPPLIER_RETURN'].includes(movementType)) {
    quantityDelta = -Math.abs(quantity);
  } else if (movementType === 'TRANSFER') {
    quantityDelta = Math.abs(quantity);
  }

  const projectedNewTotal = movementType === 'TRANSFER'
    ? activePart.totalStock
    : Math.max(0, activePart.totalStock + quantityDelta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (quantity <= 0) {
      setErrorMsg('يجب أن تكون الكمية أكبر من الصفر.');
      return;
    }

    if (movementType === 'TRANSFER' && sourceLoc.id === targetLoc.id) {
      setErrorMsg('يجب أن يكون موقع الرف المصدر مختلفاً عن موقع الرف الوجهة لإجراء النقل.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('يرجى كتابة سبب أو بيان للعملية لأغراض التدقيق المحاسبي والمخزني.');
      return;
    }

    setLoading(true);
    try {
      await executeStockMovement({
        part: activePart,
        movementType,
        quantityDelta,
        branch: activeBranch,
        warehouse: defaultWarehouse,
        location: sourceLoc,
        targetLocation: movementType === 'TRANSFER' ? targetLoc : undefined,
        reference: referenceDoc.trim() || `REF-${Date.now().toString().slice(-6)}`,
        reason: reason.trim(),
        user: {
          id: currentUser.id,
          name: currentUser.displayName
        }
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Movement execution error:', err);
      setErrorMsg(err.message || 'فشل تسجيل الحركة المخزنية.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full rounded-xl px-3.5 py-2.5 text-xs font-medium border transition ${
    isDark 
      ? 'bg-[#09090c] border-white/10 text-white focus:border-emerald-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark ? 'bg-[#0f0f13] border-white/10 text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-4 border-b ${isDark ? 'bg-[#09090c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${isDark ? 'bg-zinc-800 border-white/10 text-emerald-400' : 'bg-slate-200 border-slate-300 text-emerald-700'}`}>
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                تسجيل حركة مخزنية
              </h2>
              <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                AH.Libya Store (فرع الحرفيين): استلام، صرف، تحويل، أو تسوية جردية
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Part Selection */}
          <div>
            <label className="block text-xs font-bold mb-1 opacity-80">
              اختر قطعة غيار مرسيدس *
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className={`${inputClass} font-mono font-bold text-emerald-600 dark:text-emerald-400`}
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} — {p.nameAr || p.nameEn} (الرصيد: {p.totalStock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-xs font-bold mb-1.5 opacity-80">
              نوع المعاملة المخزنية *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'PURCHASE', label: 'استلام توريد' },
                { id: 'SALE', label: 'صرف مبيعات' },
                { id: 'TRANSFER', label: 'نقل بين الأرفف' },
                { id: 'ADJUSTMENT', label: 'تسوية جردية' },
                { id: 'DAMAGED', label: 'هالك / تالف' },
                { id: 'CUSTOMER_RETURN', label: 'مرتجع عميل' }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMovementType(m.id as MovementType)}
                  className={`p-2.5 rounded-xl text-center text-xs transition font-bold ${
                    movementType === m.id
                      ? isDark
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-slate-900 text-white shadow-sm'
                      : isDark
                      ? 'bg-[#141418] border border-white/10 text-zinc-400 hover:text-white'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Balance Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                الكمية ({activePart.unit}) *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={`${inputClass} font-mono font-bold text-base`}
                required
              />
            </div>

            {/* Projected Balance Pill */}
            <div className={`p-3 rounded-xl border flex flex-col justify-center text-center ${isDark ? 'bg-[#141418] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[11px] opacity-75">الرصيد المتوقع بعد الحركة</span>
              <div className="font-mono text-sm sm:text-base font-bold mt-0.5">
                {activePart.totalStock} ← <span className="text-emerald-600 dark:text-emerald-400">{projectedNewTotal}</span> {activePart.unit}
              </div>
            </div>
          </div>

          {/* Storage Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                {movementType === 'TRANSFER' ? 'رف التخزين المصدر' : 'موقع الرف بالمستودع'} *
              </label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                className={inputClass}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    الرف: {l.code} (المنطقة {l.zone} • {l.notes || 'موقع'})
                  </option>
                ))}
              </select>
            </div>

            {movementType === 'TRANSFER' && (
              <div>
                <label className="block text-xs font-bold mb-1 opacity-80">
                  رف التخزين الوجهة (المستقبل) *
                </label>
                <select
                  value={targetLocationId}
                  onChange={(e) => setTargetLocationId(e.target.value)}
                  className={inputClass}
                >
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>
                      الرف: {l.code} (المنطقة {l.zone} • {l.notes || 'موقع'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Reference & Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                رقم السند / الفاتورة / أمر التوريد
              </label>
              <input
                type="text"
                value={referenceDoc}
                onChange={(e) => setReferenceDoc(e.target.value)}
                placeholder="مثال: INV-2026-089"
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 opacity-80">
                الموظف المسؤول
              </label>
              <input
                type="text"
                disabled
                value={`${currentUser.displayName} (${currentUser.role === 'ADMIN' ? 'مدير النظام' : 'أمين مخزن'})`}
                className={`${inputClass} opacity-70`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 opacity-80">
              السبب والمبرر المخزني للعملية *
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: توريد شحنة جديدة لمستودع فرع الحرفيين"
              className={inputClass}
              required
            />
          </div>

          {/* Footer Buttons */}
          <div className={`pt-4 border-t flex items-center justify-end gap-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-full font-bold transition border text-xs ${
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-2.5 rounded-full font-bold transition shadow-sm text-xs ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {loading ? 'جاري الاعتماد...' : 'اعتماد وتسجيل الحركة'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
