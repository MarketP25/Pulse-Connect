import React from 'react';
import BrandLogo from './BrandLogo';
import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <BrandLogo width={80} height={80} />
      <nav className={styles.nav}>
        <a href="/" className={styles.navLink}>Home</a>
        <a href="/about" className={styles.navLink}>About</a>
        <a href="/signup" className={styles.navLink}>Sign Up</a>
      </nav>
    </header>
  );
};

export default Header;