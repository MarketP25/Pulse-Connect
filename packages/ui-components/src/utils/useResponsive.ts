// utils/useResponsive.ts
import { useEffect, useState } from 'react';

export function useResponsive() {
  const [screenSize, setScreenSize] = useState<string>('');
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWidth(w);

      if (w < 280) setScreenSize('xxs (< 280px)');
      else if (w < 360) setScreenSize('tiny (280-360px)');
      else if (w < 480) setScreenSize('small (360-480px)');
      else if (w < 640) setScreenSize('mobile (480-640px)');
      else if (w < 768) setScreenSize('sm (640-768px)');
      else if (w < 1024) setScreenSize('md (768-1024px)');
      else if (w < 1280) setScreenSize('lg (1024-1280px)');
      else if (w < 1536) setScreenSize('xl (1280-1536px)');
      else if (w < 1920) setScreenSize('2xl (1536-1920px)');
      else if (w < 2560) setScreenSize('3xl (1920-2560px)');
      else if (w < 3840) setScreenSize('4xl (2560-3840px)');
      else setScreenSize('5xl+ (3840+px)');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { screenSize, width };
}

// Usage
export function BreakpointDebugger() {
  const { screenSize, width } = useResponsive();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00d9ff',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
      }}
    >
      <div>{width}px</div>
      <div>{screenSize}</div>
    </div>
  );
}