import styles from './Breadcrumb.module.css';

interface BreadcrumbProps {
  parts: string[];
}

export function Breadcrumb({ parts }: BreadcrumbProps) {
  return <div className={styles.crumb}>{parts.join(' / ')}</div>;
}
