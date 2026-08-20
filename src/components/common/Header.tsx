import React from 'react';
import { 
  Search, 
  QrCode, 
  PlusCircle, 
  Sun, 
  Moon, 
  Menu, 
  Building2, 
  UserCheck, 
  ChevronDown,
  Globe,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';
import { useLanguage } from '../../lib/languageContext';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  onOpenGlobalSearch: () => void;
  onOpenScanner: () => void;
  onOpenAddPart: () => void;
  onToggleMobileMenu: () => void;
  activeView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGlobalSearch,
  onOpenScanner,
  onOpenAddPart,
  onToggleMobileMenu,
  activeView
}) => {
  const { currentUser, activeBranch, allDemoUsers, switchUser, canEditParts, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const getRoleArabic = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'المدير العام';
      case 'ADMIN': return 'مدير النظام';
      case 'WAREHOUSE':
      case 'WAREHOUSE_MANAGER': return 'مدير المخازن والأرفف';
      case 'SALES':
      case 'SALES_SPECIALIST': return 'أخصائي مبيعات EPC';
      case 'PURCHASING':
      case 'PURCHASER': return 'مسؤول المشتريات والتوريد';
      case 'ACCOUNTING': return 'المحاسب المالي';
      default: return role;
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-200 border-b backdrop-blur-md shadow-sm ${
        isDark
          ? 'bg-[#050505]/95 border-white/10 text-[#D4D4D8]'
          : 'bg-white/95 border-slate-200 text-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={onToggleMobileMenu}
              aria-label="فتح القائمة الرئيسية"
              className={`md:hidden p-2 rounded-xl border transition-colors shrink-0 ${
                isDark
                  ? 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Official Brand Logo */}
            <BrandLogo size="sm" isDark={isDark} showSubtitle={false} className="sm:hidden" />
            <BrandLogo size="md" isDark={isDark} showSubtitle={true} className="hidden sm:flex" />
          </div>

          {/* Center: Search Bar Trigger (Responsive on all screens) */}
          <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg mx-1 sm:mx-3">
            <button
              onClick={onOpenGlobalSearch}
              className={`w-full flex items-center justify-between px-3 sm:px-4 py-2 rounded-full text-xs transition-all shadow-inner group border ${
                isDark
                  ? 'bg-[#111114] hover:bg-zinc-900 border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200'
                  : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="truncate tracking-wide text-[11px] sm:text-xs">
                  {t('بحث بالقطعة (A2233302303)، الشاسيه (W223)، الرف...', 'Search part (A2233302303), chassis (W223), bin...')}
                </span>
              </div>
              <kbd
                className={`hidden md:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                  isDark
                    ? 'bg-black/60 text-zinc-400 border-white/10'
                    : 'bg-white text-slate-600 border-slate-200 shadow-xs'
                }`}
              >
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right Action Controls: Language, Theme, Scanner, Add Part, User Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title={language === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
              className={`flex items-center justify-center h-9 px-2.5 sm:px-3 rounded-full border text-xs font-semibold transition-all ${
                isDark
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline mr-1 text-[11px] font-bold">
                {language === 'ar' ? 'EN' : 'عربي'}
              </span>
            </button>

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'التبديل إلى الوضع الفاتح ☀️' : 'التبديل إلى الوضع الداكن 🌙'}
              className={`flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-full border text-xs font-medium transition-all ${
                isDark
                  ? 'bg-zinc-900/90 border-white/10 text-amber-300 hover:bg-zinc-800 hover:border-white/20'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline mr-1.5 text-zinc-200 text-[11px]">فاتح</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline mr-1.5 text-slate-800 text-[11px]">داكن</span>
                </>
              )}
            </button>

            {/* Barcode / QR Scanner Button */}
            <button
              onClick={onOpenScanner}
              title="فتح ماسح الباركود و QR"
              className={`flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-full border text-xs font-medium transition-all ${
                isDark
                  ? 'bg-zinc-900 border-white/10 text-zinc-300 hover:bg-white hover:text-black hover:border-white'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline mr-1.5 text-[11px]">مسح باركود</span>
            </button>

            {/* Quick Add Part Button */}
            {canEditParts && (
              <button
                onClick={onOpenAddPart}
                title="إضافة قطعة غيار جديدة"
                className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  isDark
                    ? 'bg-white hover:bg-zinc-200 text-black shadow-[0_4px_16px_rgba(255,255,255,0.12)]'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="text-[11px]">إضافة قطعة</span>
              </button>
            )}

            {/* Single Branch Badge - فرع الحرفيين */}
            <div
              className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
                isDark
                  ? 'bg-zinc-900/80 border-white/10 text-zinc-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px]">فرع الحرفيين</span>
            </div>

            {/* User Profile & Role Switcher */}
            {currentUser && (
              <div className="relative group">
                <button
                  aria-label="خيارات المستخدم والصلاحيات"
                  className={`flex items-center gap-2 p-1 sm:p-1.5 rounded-full border transition-colors ${
                    isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shadow-xs ${
                      isDark
                        ? 'bg-zinc-800 text-white border border-white/20'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <div className="hidden md:block text-right pl-1">
                    <div
                      className={`text-xs font-medium leading-tight truncate max-w-[100px] ${
                        isDark ? 'text-zinc-200' : 'text-slate-800'
                      }`}
                    >
                      {currentUser.displayName.split(' ')[0]}
                    </div>
                    <div
                      className={`text-[10px] leading-tight font-light ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      {getRoleArabic(currentUser.role)}
                    </div>
                  </div>
                  <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                <div
                  className={`absolute left-0 mt-2 w-72 rounded-2xl border shadow-2xl py-2 z-50 hidden group-hover:block group-focus-within:block animate-fadeIn backdrop-blur-xl ${
                    isDark
                      ? 'bg-[#0e0e12] border-white/10 text-zinc-200 shadow-black/80'
                      : 'bg-white border-slate-200 text-slate-800 shadow-slate-400/30'
                  }`}
                >
                  <div
                    className={`px-4 py-3 border-b ${
                      isDark ? 'border-white/10' : 'border-slate-100'
                    }`}
                  >
                    <p className="text-xs font-bold">{currentUser.displayName}</p>
                    <p
                      className={`text-[11px] font-mono mt-0.5 ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}
                    >
                      {currentUser.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                        {getRoleArabic(currentUser.role)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        فرع الحرفيين
                      </span>
                    </div>
                  </div>

                  <div
                    className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}
                  >
                    تبديل حساب المستخدم (تجريبي)
                  </div>

                  {allDemoUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => switchUser(u.id)}
                      className={`w-full text-right px-4 py-2.5 text-xs flex items-center justify-between transition-colors ${
                        u.id === currentUser.id
                          ? isDark
                            ? 'bg-white/10 text-white font-semibold'
                            : 'bg-slate-100 text-slate-900 font-semibold'
                          : isDark
                          ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{u.displayName}</div>
                        <div
                          className={`text-[10px] ${
                            isDark ? 'text-zinc-400' : 'text-slate-500'
                          }`}
                        >
                          {getRoleArabic(u.role)}
                        </div>
                      </div>
                      {u.id === currentUser.id && (
                        <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </button>
                  ))}

                  {/* Logout Button */}
                  <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                    <button
                      onClick={logout}
                      className="w-full text-right px-4 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center justify-between transition-colors"
                    >
                      <span>{t('تسجيل الخروج (قفل النظام)', 'Lock & Logout')}</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
