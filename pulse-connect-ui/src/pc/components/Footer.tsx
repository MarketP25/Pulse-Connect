// [CLEANED] Removed redundant React import
import styles from "./Footer.module.css"; // optional—see step 1b

const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} Pulsco. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
