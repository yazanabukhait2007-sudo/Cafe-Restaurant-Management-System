import React from 'react';
import { usePosStore } from '@/store/pos';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/utils';

export default function SocketStatus() {
  const socketStatus = usePosStore((state) => state.socketStatus);

  const config = {
    connected: {
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      dotColor: 'bg-emerald-500 shadow-emerald-500/50',
      pulse: 'animate-pulse',
      label: 'Live',
      icon: Wifi
    },
    reconnecting: {
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      dotColor: 'bg-amber-500 shadow-amber-500/50',
      pulse: 'animate-spin duration-1000',
      label: 'Syncing',
      icon: RefreshCw
    },
    offline: {
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      dotColor: 'bg-rose-500 shadow-rose-500/50',
      pulse: '',
      label: 'Offline',
      icon: WifiOff
    }
  }[socketStatus || 'offline'];

  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center rounded-xl p-1.5 border text-[10px] font-bold tracking-wider uppercase transition-all duration-300",
        config.color
      )}
      title={`Realtime System Status: ${socketStatus}`}
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        {socketStatus === 'connected' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        )}
        <Icon className={cn("w-4 h-4 z-10", socketStatus === 'reconnecting' && config.pulse)} />
      </div>
      <span className="mt-1 text-[9px] leading-none text-center font-mono opacity-80">{config.label}</span>
    </div>
  );
}
