import React from 'react';
import styles from './Footer.module.css'; // optional—see step 1b

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} Pulse Connect. All rights reserved.</p>
    </footer>
  );
};

export default Footer;