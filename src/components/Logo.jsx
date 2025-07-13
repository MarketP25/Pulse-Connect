import React from 'react';
import logo from '../assets/Pulse-Connect-logo.png';
import styles from './Logo.module.css'; // Assuming Logo.module.css is in the same folder

const Logo = () => {
  return (
    <img
      src={logo}
      alt="Pulse Connect Logo"
      className={styles.logo}
    />
  );
};

export default Logo;