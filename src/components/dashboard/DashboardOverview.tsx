import React from 'react';
import { 
  Layers, 
  Boxes, 
  Coins, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowLeftRight, 
  PlusCircle, 
  QrCode, 
  Clock, 
  ChevronLeft,
  Building2,
  CheckCircle2,
  Car,
  ShoppingCart,
  Truck,
  AlertOctagon,
  BarChart3
} from 'lucide-react';
import { PartMaster, InventoryItem, StockMovement, WarehouseLocation } from '../../types/erp';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { useLanguage } from '../../lib/languageContext';
import { formatEGP } from '../../lib/formatters';

interface DashboardOverviewProps {
  parts: PartMaster[];
  inventory: InventoryItem[];
  movements: StockMovement[];
  locations: WarehouseLocation[];
  onOpenAddPart: () => void;
  onOpenScanner: () => void;
  onOpenMovementModal: (part?: PartMaster) => void;
  onSelectPart: (part: PartMaster) => void;
  onNavigateToParts: () => void;
  onNavigateToMovements: () => void;
  onNavigateToInventory: () => void;
  onNavigateToVinDecoder?: () => void;
  onNavigateToSales?: () => void;
  onNavigateToPurchases?: () => void;
  onNavigateToShortages?: () => void;
  onNavigateToReports?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  parts,
  inventory,
  movements,
  locations,
  onOpenAddPart,
  onOpenScanner,
  onOpenMovementModal,
  onSelectPart,
  onNavigateToParts,
  onNavigateToMovements,
  onNavigateToInventory,
  onNavigateToVinDecoder,
  onNavigateToSales,
  onNavigateToPurchases,
  onNavigateToShortages,
  onNavigateToReports
}) => {
  const { activeBranch, canViewFinancials, canEditParts, canPerformStockMovements } = useAuth();
  const { isDark } = useTheme();
  const { language, t } = useLanguage();

  // Metrics calculations
  const totalParts = parts.length;
  const totalStockUnits = parts.reduce((sum, p) => sum + (p.totalStock || 0), 0);
  
  // Total Valuation in EGP
  const totalCostValuationEGP = parts.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.costPrice || 0)), 0);
  const totalRetailValuationEGP = parts.reduce((sum, p) => sum + ((p.totalStock || 0) * (p.sellingPrice || 0)), 0);

  const lowStockParts = parts.filter((p) => p.totalStock > 0 && p.totalStock <= p.minStock);
  const outOfStockParts = parts.filter((p) => (p.totalStock || 0) === 0);
  const criticalCount = lowStockParts.length + outOfStockParts.length;

  // Category breakdown
  const categoryCounts: Record<string, { count: number; units: number; val: number }> = {};
  parts.forEach((p) => {
    const cat = p.categoryGroup || 'أخرى';
    if (!categoryCounts[cat]) {
      categoryCounts[cat] = { count: 0, units: 0, val: 0 };
    }
    categoryCounts[cat].count += 1;
    categoryCounts[cat].units += (p.totalStock || 0);
    categoryCounts[cat].val += (p.totalStock || 0) * (p.sellingPrice || 0);
  });

  const getMovementTypeArabic = (type: string) => {
    switch (type) {
      case 'INITIAL_STOCK': return t('رصيد افتتاحي', 'Initial Stock');
      case 'PURCHASE': return t('توريد / شراء', 'Purchase / Inbound');
      case 'SALE': return t('صرف / مبيعات', 'Sale / Outbound');
      case 'TRANSFER': return t('نقل بين الأرفف', 'Bin Transfer');
      case 'ADJUSTMENT': return t('تسوية جرد', 'Stocktake Adjustment');
      case 'DAMAGED': return t('تالف / هالك', 'Damaged');
      case 'CUSTOMER_RETURN': return t('مرتجع عميل', 'Customer Return');
      case 'SUPPLIER_RETURN': return t('مرتجع مورد', 'Supplier Return');
      default: return type;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 select-none">
      
      {/* Top Banner / Welcome with Quick Actions */}
      <div
        className={`rounded-2xl p-5 sm:p-7 lg:p-8 border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden transition-colors duration-200 ${
          isDark
            ? 'bg-[#0f0f13] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className="relative z-10 space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full font-medium border flex items-center gap-1.5 ${
                isDark
                  ? 'bg-zinc-900 border-white/10 text-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <Building2 className="w-3 h-3" />
              {t('الفرع التشغيلي: فرع الحرفيين', 'Operational Branch: El-Harefeyin')}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-medium flex items-center gap-1 ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {t('مزامنة مباشرة (EGP)', 'Live Database Sync (EGP)')}
            </span>
          </div>

          <h1
            className={`text-xl sm:text-2xl lg:text-3xl font-serif-luxury font-bold tracking-tight leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t('لوحة التحكم والمؤشرات — AH.Libya Store', 'Dashboard & WMS Overview — AH.Libya Store')}
          </h1>

          <p
            className={`text-xs sm:text-sm font-normal max-w-xl leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}
          >
            {t('نظام إدارة قطع غيار مرسيدس-بنز، تنظيم مصفوفات الرفوف، وتتبع العمليات المالية بالجنيه المصري (EGP).', 'Mercedes-Benz spare parts WMS, bin location tracking, and real-time inventory valuations.')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 relative z-10 w-full sm:w-auto">
          
          {onNavigateToVinDecoder && (
            <button
              onClick={onNavigateToVinDecoder}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold border transition-all ${
                isDark
                  ? 'bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/30 text-emerald-400'
                  : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white border-emerald-300 text-emerald-800'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{t('فك الشاسيه VIN', 'VIN Decoder')}</span>
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border transition-all ${
              isDark
                ? 'bg-zinc-900 hover:bg-white hover:text-black border-white/10 text-zinc-200'
                : 'bg-slate-100 hover:bg-slate-900 hover:text-white border-slate-300 text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{t('مسح باركود', 'Scanner')}</span>
          </button>

          {canPerformStockMovements && (
            <button
              onClick={() => onOpenMovementModal()}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border transition-all ${
                isDark
                  ? 'bg-zinc-900 hover:bg-white hover:text-black border-white/10 text-zinc-200'
                  : 'bg-slate-100 hover:bg-slate-900 hover:text-white border-slate-300 text-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{t('تسجيل حركة', 'Stock Move')}</span>
            </button>
          )}

          {canEditParts && (
            <button
              onClick={onOpenAddPart}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md ${
                isDark
                  ? 'bg-white hover:bg-zinc-200 text-black shadow-white/10'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('إضافة قطعة جديدة', 'Add Part')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Access Modules Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {onNavigateToSales && (
          <div
            onClick={onNavigateToSales}
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
              isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{t('صرف مبيعات', 'Sales Invoices')}</div>
                <div className="text-[10px] text-zinc-400">{t('فواتير وصرف عملاء', 'Issue sales')}</div>
              </div>
            </div>
            <ChevronLeft className={`w-4 h-4 text-zinc-500 ${language === 'en' ? 'rotate-180' : ''}`} />
          </div>
        )}

        {onNavigateToPurchases && (
          <div
            onClick={onNavigateToPurchases}
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
              isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{t('أوامر المشتريات', 'Purchase Orders')}</div>
                <div className="text-[10px] text-zinc-400">{t('استلام وتوريد', 'Inbound & receiving')}</div>
              </div>
            </div>
            <ChevronLeft className={`w-4 h-4 text-zinc-500 ${language === 'en' ? 'rotate-180' : ''}`} />
          </div>
        )}

        {onNavigateToShortages && (
          <div
            onClick={onNavigateToShortages}
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
              isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{t('سجل النواقص', 'Shortage Requests')}</div>
                <div className="text-[10px] text-zinc-400">{t('إعادة الطلب والاستيراد', 'Reorder tracking')}</div>
              </div>
            </div>
            <ChevronLeft className={`w-4 h-4 text-zinc-500 ${language === 'en' ? 'rotate-180' : ''}`} />
          </div>
        )}

        {onNavigateToReports && (
          <div
            onClick={onNavigateToReports}
            className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-between ${
              isDark ? 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">{t('التقارير المالية', 'Financial Reports')}</div>
                <div className="text-[10px] text-zinc-400">{t('تحليلات وتقييم المخزون', 'Analytics & Valuation')}</div>
              </div>
            </div>
            <ChevronLeft className={`w-4 h-4 text-zinc-500 ${language === 'en' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Catalog Parts */}
        <div 
          onClick={onNavigateToParts}
          className={`rounded-2xl p-5 sm:p-6 border cursor-pointer transition-all shadow-xs group relative overflow-hidden ${
            isDark
              ? 'bg-[#0f0f13] border-white/10 hover:border-white/25 text-white'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              قطع الغيار المسجلة
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                isDark ? 'bg-zinc-900 border-white/10 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight mt-3">
            {totalParts}
          </div>
          <div
            className={`flex items-center justify-between text-xs mt-4 pt-3 border-t font-light ${
              isDark ? 'border-white/5 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}
          >
            <span>المخزون الإجمالي: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalStockUnits} قطعة</strong></span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Inventory Valuation in EGP */}
        <div
          className={`rounded-2xl p-5 sm:p-6 border shadow-xs relative overflow-hidden ${
            isDark
              ? 'bg-[#0f0f13] border-white/10 text-white'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              تقييم المخزون (بالتكلفة)
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                isDark ? 'bg-zinc-900 border-white/10 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
            >
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight mt-3 text-emerald-600 dark:text-emerald-400">
            {canViewFinancials ? formatEGP(totalCostValuationEGP, { short: true }) : '••••••'}
          </div>
          <div
            className={`flex items-center justify-between text-xs mt-4 pt-3 border-t font-light ${
              isDark ? 'border-white/5 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}
          >
            <span>القيمة بسعر البيع:</span>
            <strong className={isDark ? 'text-zinc-200 font-mono' : 'text-slate-800 font-mono'}>
              {canViewFinancials ? formatEGP(totalRetailValuationEGP, { short: true }) : '••••'}
            </strong>
          </div>
        </div>

        {/* Stock Alerts */}
        <div 
          onClick={onNavigateToParts}
          className={`rounded-2xl p-5 sm:p-6 border cursor-pointer transition-all shadow-xs group relative overflow-hidden ${
            isDark
              ? 'bg-[#0f0f13] border-white/10 hover:border-white/25 text-white'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              تنبيهات نواقص المخزون
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                isDark ? 'bg-zinc-900 border-white/10 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight mt-3">
            {criticalCount} <span className="text-xs font-sans font-normal opacity-70">صنف</span>
          </div>
          <div
            className={`flex items-center justify-between text-xs mt-4 pt-3 border-t font-light ${
              isDark ? 'border-white/5 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}
          >
            <span>{outOfStockParts.length} نفد • {lowStockParts.length} منخفض</span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Warehouse Bin Occupancy */}
        <div 
          onClick={onNavigateToInventory}
          className={`rounded-2xl p-5 sm:p-6 border cursor-pointer transition-all shadow-xs group relative overflow-hidden ${
            isDark
              ? 'bg-[#0f0f13] border-white/10 hover:border-white/25 text-white'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              مواقع الأرفف (الحرفيين)
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                isDark ? 'bg-zinc-900 border-white/10 text-zinc-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono tracking-tight mt-3">
            {locations.length} <span className="text-xs font-sans font-normal opacity-70">خانة / رف</span>
          </div>
          <div
            className={`flex items-center justify-between text-xs mt-4 pt-3 border-t font-light ${
              isDark ? 'border-white/5 text-zinc-400' : 'border-slate-100 text-slate-500'
            }`}
          >
            <span>المجموعات: <strong className={isDark ? 'text-white' : 'text-slate-900'}>A, B, C</strong></span>
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Main Content Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 spans): Active Parts & EPC Categories */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Mercedes Spare Part Card */}
          <div
            className={`rounded-2xl p-5 sm:p-6 border shadow-sm ${
              isDark ? 'bg-[#0f0f13] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  القطعة المسجلة بالكتالوج (Active Item)
                </h3>
              </div>
              <button
                onClick={onNavigateToParts}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition"
              >
                عرض في الكتالوج ←
              </button>
            </div>

            {parts.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectPart(p)}
                className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-[#141418] hover:bg-zinc-900 border-white/10 hover:border-white/20 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-900'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                      {p.partNumber}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.brand}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                      أصلي OEM
                    </span>
                  </div>

                  <h4 className="text-sm font-bold truncate">{p.nameAr}</h4>
                  <p className={`text-xs truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{p.nameEn}</p>
                  
                  <div className="flex items-center gap-3 text-xs pt-1">
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                      الرصيد الفعلي: <strong className="font-mono text-emerald-500">{p.totalStock} قطع</strong>
                    </span>
                    <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>•</span>
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                      سعر البيع: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatEGP(p.sellingPrice)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenMovementModal(p);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                      isDark
                        ? 'bg-zinc-800 hover:bg-white hover:text-black border-white/10 text-white'
                        : 'bg-slate-200 hover:bg-slate-900 hover:text-white border-slate-300 text-slate-800'
                    }`}
                  >
                    تسجيل حركة +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* EPC Groups Distribution */}
          <div
            className={`rounded-2xl p-5 sm:p-6 border shadow-sm ${
              isDark ? 'bg-[#0f0f13] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  مجموعات كتالوج مرسيدس-بنز EPC
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  توزيع المخزون حسب الأقسام الميكانيكية المعتمدة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(categoryCounts).map(([catName, data]) => (
                <div
                  key={catName}
                  className={`p-3.5 rounded-xl border transition ${
                    isDark ? 'bg-[#141418] border-white/5 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold truncate">{catName}</span>
                    <span className="font-mono text-xs opacity-75">{data.count} صنف</span>
                  </div>
                  <div className={`w-full rounded-full h-1.5 overflow-hidden mb-2 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                    <span>المخزون: <strong className="font-mono text-emerald-500">{data.units} قطعة</strong></span>
                    <span className="font-mono">{formatEGP(data.val, { short: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1 span): Recent Stock Movement Feed */}
        <div
          className={`rounded-2xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between ${
            isDark ? 'bg-[#0f0f13] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  سجل حركة المخزون
                </h3>
              </div>
              <button
                onClick={onNavigateToMovements}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition"
              >
                السجل الكامل ←
              </button>
            </div>

            {movements.length === 0 ? (
              <div className={`text-xs py-10 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                لا توجد حركات مسجلة حتى الآن.
              </div>
            ) : (
              <div className="space-y-3">
                {movements.slice(0, 5).map((m) => {
                  const isPositive = m.quantity > 0;
                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isDark ? 'bg-[#141418] border-white/5' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs tracking-wider">
                          {m.partNumber}
                        </span>
                        <span
                          className={`font-mono px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity} قطعة
                        </span>
                      </div>

                      <div className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                        {m.partName}
                      </div>

                      <div
                        className={`flex items-center justify-between text-[10px] pt-1.5 border-t ${
                          isDark ? 'border-white/5 text-zinc-500' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {getMovementTypeArabic(m.movementType)}
                        </span>
                        <span className="font-mono font-medium">
                          {m.destinationLocation ? `الرف ${m.destinationLocation}` : m.sourceLocation ? `الرف ${m.sourceLocation}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <button
              onClick={() => onOpenMovementModal()}
              className={`w-full py-2.5 rounded-full text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-zinc-900 hover:bg-white hover:text-black border-white/10 text-zinc-200'
                  : 'bg-slate-100 hover:bg-slate-900 hover:text-white border-slate-300 text-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>تسجيل حركة مخزنية جديدة</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
