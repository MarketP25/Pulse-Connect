import { useState, useEffect } from 'react';
import Image from 'next/image';
import logo from '../assets/Pulse-Connect-logo.png';
import styles from './SplashScreen.module.css';

interface SplashScreenProps {
  duration?: number;            // ms to show splash
  onFinish?: () => void;        // callback after fade-out completes
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  duration = 2000,
  onFinish,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // fade starts 500ms before hiding
    const fadeTimer = setTimeout(() => setIsFading(true), duration - 500);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.splash} ${isFading ? styles.fadeOut : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.logoWrapper}>
        <Image
          src={logo}
          alt="Pulse Connect Logo"
          fill
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
      <p className={styles.splashText}>
        Connecting your marketing pulse…
      </p>
    </div>
  );
};

export default SplashScreen;