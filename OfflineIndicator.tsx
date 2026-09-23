import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside aria-label="Status de conexão" className="fixed bottom-3 left-3 z-40 flex items-center gap-2 bg-[#202124] text-white border border-white px-2.5 py-1 text-[9px] font-pixel shadow-lg animate-pulse">
      <WifiOff className="w-3 h-3 text-yellow-400" />
      <span>OFFLINE (JOGANDO VIA CACHE)</span>
    </aside>
  );
};
