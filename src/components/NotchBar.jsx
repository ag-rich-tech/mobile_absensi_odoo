import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';

export default function NotchBar() {
  const [time, setTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="device-notch-bar">
      <span>{time}</span>
      <div className="device-pill"></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Wifi size={13} strokeWidth={2.5} />
        <Battery size={15} strokeWidth={2.5} />
      </div>
    </header>
  );
}
