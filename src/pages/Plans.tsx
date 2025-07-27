// pages/plans.tsx
import fs from 'fs';
import path from 'path';
import { useTranslations } from 'next-intl';
import type { GetStaticProps } from 'next';
import { PlanList } from '@/components/PlanList';

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const filePath = path.join(
    process.cwd(),
    'messages',
    locale!,
    'plans.json'
  );
  const messages = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  return { props: { messages } };
};

const PlansPage: React.FC = () => {
  const t = useTranslations('plans');

  return (
    <main>
      <h1>{t('title')}</h1>
      <PlanList />
    </main>
  );
};

export default PlansPage;