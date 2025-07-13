import React from 'react';
import Logo from './Logo';
import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <Logo />
      <nav className={styles.nav}>
        <a href="/" className={styles.navLink}>Home</a>
        <a href="/about" className={styles.navLink}>About</a>
        <a href="/signup" className={styles.navLink}>Sign Up</a>
      </nav>
    </header>
  );
};

export default Header;