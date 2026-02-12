import { Icon } from '../../components/Icon'
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLiffAuthStore } from '../store/authStore';
import { getBusinessTypeColors, getBusinessTypeLabel, getRecordLabel, getBusinessTypeIcon } from '../../utils/businessTypeColors';
import logoImage from '../../assets/logo.png';
import type { RecordType } from '../../types/record';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const owner = useLiffAuthStore((s) => s.owner);
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType);
  const setSelectedBusinessType = useLiffAuthStore((s) => s.setSelectedBusinessType);
  const availableBusinessTypes: RecordType[] = owner?.availableBusinessTypes?.length
    ? owner.availableBusinessTypes
    : owner?.primaryBusinessType
      ? [owner.primaryBusinessType]
      : ['daycare'];
  const effectiveBusinessType = availableBusinessTypes.includes(selectedBusinessType)
    ? selectedBusinessType
    : availableBusinessTypes[0];
  const recordLabel = getRecordLabel(effectiveBusinessType);
  const activeColors = getBusinessTypeColors(effectiveBusinessType);
  const activeBusinessLabel = getBusinessTypeLabel(effectiveBusinessType);
  const activeBusinessIcon = getBusinessTypeIcon(effectiveBusinessType);

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div
      className="flex flex-col h-screen text-foreground font-sans"
      style={{
        background: `linear-gradient(180deg, ${activeColors.pale} 0%, #FAFAF9 210px)`,
      }}
    >
      {/* ヘッダー */}
      <header
        className="px-5 pt-4 pb-4 sticky top-0 z-20 flex items-center justify-between border-b safe-area-pt backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(250, 250, 249, 0.92)',
          borderBottomColor: `${activeColors.primary}26`,
        }}
      >
        <button 
          onClick={() => navigate('/home')}
          className="flex items-center gap-3 active:opacity-70 transition-opacity"
          aria-label="ホームに戻る"
        >
          <img src={logoImage} alt="Blink" className="h-10" />
          <div className="text-left">
            <p className="text-[10px] font-bold tracking-wider leading-none mb-0.5" style={{ color: activeColors.primary }}>
              {owner?.storeName || 'BLINK'}
            </p>
            <p className="text-sm font-bold font-heading text-foreground leading-none">
              {owner?.name || '飼い主'} 様
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Icon icon={activeBusinessIcon} width="12" height="12" style={{ color: activeColors.primary }} />
              {activeBusinessLabel}
            </p>
          </div>
        </button>
        <button
          onClick={() => navigate('/home/mypage')}
          className="size-12 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden 
                     active:scale-95 transition-transform hover:border-primary/40"
          aria-label="マイページ"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Icon icon="solar:user-bold" width="20" height="20" className="text-primary" />
          </div>
        </button>
      </header>

      {availableBusinessTypes.length > 1 && (
        <div
          className="sticky top-[76px] z-10 border-b px-5 py-2 backdrop-blur-md"
          style={{
            borderBottomColor: `${activeColors.primary}20`,
            backgroundColor: 'rgba(250, 250, 249, 0.95)',
          }}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            {availableBusinessTypes.map((businessType) => {
              const checked = businessType === effectiveBusinessType;
              const colors = getBusinessTypeColors(businessType);
              return (
                <button
                  key={businessType}
                  type="button"
                  onClick={() => setSelectedBusinessType(businessType)}
                  className="min-h-[40px] whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-colors"
                  style={{
                    background: checked ? colors.pale : '#FFFFFF',
                    border: checked ? `1.5px solid ${colors.primary}` : '1px solid #E2E8F0',
                    color: checked ? colors.primary : '#64748B',
                  }}
                >
                  {getBusinessTypeLabel(businessType)}
                </button>
              );
            })}
            <span
              className="ml-auto size-8 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeColors.primary}12` }}
              aria-hidden="true"
            >
              <Icon icon={activeBusinessIcon} width="16" height="16" style={{ color: activeColors.primary }} />
            </span>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* ボトムナビゲーション */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t px-2 py-1 z-30 safe-area-pb"
        style={{ borderTopColor: `${activeColors.primary}20` }}
        role="navigation"
        aria-label="メインナビゲーション"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <NavButton
            onClick={() => navigate('/home')}
            icon="solar:home-bold"
            label="ホーム"
            isActive={isActive('/home')}
            activeColor={activeColors.primary}
          />
          <NavButton
            onClick={() => navigate('/home/reservations')}
            icon="solar:calendar-bold"
            label="予約"
            isActive={isActive('/home/reservations')}
            activeColor={activeColors.primary}
          />
          <NavButton
            onClick={() => navigate('/home/records')}
            icon="solar:clipboard-text-bold"
            label={recordLabel}
            isActive={isActive('/home/records')}
            activeColor={activeColors.primary}
          />
          <NavButton
            onClick={() => navigate('/home/mypage')}
            icon="solar:user-bold"
            label="マイページ"
            isActive={isActive('/home/mypage')}
            activeColor={activeColors.primary}
          />
        </div>
      </nav>
    </div>
  );
}

// ナビゲーションボタンコンポーネント
function NavButton({
  onClick,
  icon,
  label,
  isActive,
  activeColor,
}: {
  onClick: () => void;
  icon: string;
  label: string;
  isActive: boolean;
  activeColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3 gap-1 transition-all rounded-lg active:scale-95 ${
        isActive ? '' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={isActive ? { color: activeColor } : undefined}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span
          className="absolute inset-x-2 top-1 h-8 rounded-lg"
          style={{ backgroundColor: `${activeColor}1A` }}
          aria-hidden="true"
        ></span>
      )}
      <Icon icon={icon} width="24" height="24" aria-hidden="true" className="relative z-10" />
      <span className={`text-xs relative z-10 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}
