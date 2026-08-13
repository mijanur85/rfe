import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Camera, Bell, MessageSquare, ShieldCheck } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-black/95 text-white text-[11px] font-mono px-4 py-1 flex items-center justify-between border-b border-white/5 select-none z-30">
      {/* Left: Time & Active Notification Badges */}
      <div className="flex items-center gap-2">
        <span className="font-bold tracking-tight text-cyan-400">{timeStr}</span>
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Camera className="w-3 h-3 text-cyan-400" />
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <MessageSquare className="w-3 h-3 text-purple-400" />
        </div>
      </div>

      {/* Right: Android Status Icons */}
      <div className="flex items-center gap-2.5 text-zinc-300">
        <span className="text-[9px] font-bold tracking-wider text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/50">
          5G
        </span>
        <Signal className="w-3 h-3 text-zinc-200" />
        <Wifi className="w-3.5 h-3.5 text-zinc-200" />
        <div className="flex items-center gap-1 text-[10px] font-bold">
          <span>88%</span>
          <div className="w-4 h-2.5 border border-white/80 rounded-sm p-0.5 relative flex items-center">
            <div className="h-full bg-cyan-400 w-[88%]" />
            <div className="absolute -right-1 top-0.5 w-0.5 h-1 bg-white/80 rounded-r-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
