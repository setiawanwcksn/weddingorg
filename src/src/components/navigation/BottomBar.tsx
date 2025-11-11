import React from 'react';
import { Home, Package, Gift, Ticket, QrCode } from 'lucide-react';
import QRimg from '../../assets/qr-code.png';
import home from '../../assets/Home.png';
import homeAct from '../../assets/HomeAct.png';
import SouvenirAct from '../../assets/SouvenirAct.png';
import Souvenir from '../../assets/Souvenir.png';
import GiftImg from '../../assets/Gift.png';
import GiftAct from '../../assets/GiftAct.png';
import DoorprizeAct from '../../assets/DoorprizeAct.png';
import Doorprize from '../../assets/Doorprize.png';

export type BottomKey = 'home' | 'souvenir' | 'checkin' | 'gift' | 'doorprize';

export interface BottomBarProps {
  active?: BottomKey;
  onSelect?: (key: BottomKey) => void;
  variant?: 'floating' | 'inline';
}

function Item({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 leading-none focus:outline-none active:scale-95 min-w-0"
    >
      <div className={`${active ? 'text-primary' : 'text-gray-400'} flex items-center justify-center`}>
        {icon}
      </div>
      <span
        className={`text-[11px] sm:text-[13px] font-medium ${active ? 'text-primary' : 'text-gray-500'} truncate max-w-[88px]`}
      >
        {label}
      </span>
    </button>
  );
}

export function BottomBar({
  active = 'checkin',
  onSelect,
  variant = 'inline',
}: BottomBarProps): JSX.Element {
  const isFloating = variant === 'floating';

  // ukuran ikon responsif (lebih kecil di mobile supaya muat 2 sisi)
  const navItems = [
    { key: 'home', label: 'Home', icon: <img src={active === 'checkin' ? homeAct : home} className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" /> },
    { key: 'souvenir', label: 'Souvenir', icon: <img src={active === 'souvenir' ? SouvenirAct : Souvenir} className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" /> },
    { key: 'gift', label: 'Gift', icon: <img src={active === 'gift' ? GiftAct : GiftImg} className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" /> },
    { key: 'doorprize', label: 'Doorprize', icon: <img src={active === 'doorprize' ? DoorprizeAct : Doorprize} className="shrink-0 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" /> },
  ] as const;

  const leftItems = navItems.slice(0, 2);
  const rightItems = navItems.slice(2);

  return (
    <div
      className={
        isFloating
          ? 'left-1/2 -translate-x-1/2 z-40'
          : 'left-0 right-0 w-full z-40 bg-transparent'
      }
    >
      <div className="mx-auto w-[94%] sm:w-[92%] md:w-[90%] lg:w-[88%] xl:w-[86%] 2xl:w-[80%] max-w-[980px]">
        <div
          className="
            relative w-full bg-white border border-gray-200 rounded-[22px] shadow-md
            px-3 sm:px-5 md:px-6
            pt-6 md:pt-6
            pb-3 sm:pb-4 md:pb-5
            backdrop-blur-md
            flex items-center justify-between
          "
        >
          {/* grup kiri: selalu 1/2 lebar, tombol disebar rata */}
          <div className="flex w-1/2 items-center justify-evenly gap-3 sm:gap-2 md:gap-2 pr-1">
            {leftItems.map((item) => (
              <Item
                key={item.key}
                label={item.label}
                icon={item.icon}
                active={active === item.key}
                onClick={() => onSelect?.(item.key)}
              />
            ))}
          </div>

          {/* grup kanan: selalu 1/2 lebar, tombol disebar rata */}
          <div className="flex w-1/2 items-center justify-evenly gap-3 sm:gap-2 md:gap-2 pl-1">
            {rightItems.map((item) => (
              <Item
                key={item.key}
                label={item.label}
                icon={item.icon}
                active={active === item.key}
                onClick={() => onSelect?.(item.key)}
              />
            ))}
          </div>

          {/* tombol check-in mengambang di tengah dengan ukuran responsif */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 sm:-top-7 md:-top-8 flex flex-col items-center">
            <button
              type="button"
              aria-label="Check-in"
              onClick={() => onSelect?.('checkin')}
              className={`
                rounded-full flex items-center justify-center shadow-md ring-4 ring-white
                bg-primary text-white
                w-12 h-12 sm:w-14 sm:h-14 md:w-[72px] md:h-[72px]
              `}
            >
              <img src={QRimg} className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" style={{ filter: 'brightness(0) saturate(100%) invert(1)' }} />
            </button>
            <span className="text-[11px] sm:text-[13px] font-medium text-gray-500 truncate max-w-[88px] pt-2">Check-in</span>
          </div>
        </div>
      </div>
    </div>
  );
}
