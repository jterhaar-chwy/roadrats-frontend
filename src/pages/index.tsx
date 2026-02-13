import Head from 'next/head';
import { AppLayout } from '@/components/global/appLayout';
import { Dashboard } from '@/components/landingPage/landingPage';

export default function Index() {
  return (
    <>
      <Head>
        <title>Dashboard - Monitoring & Analytics</title>
        <meta name="description" content="Modern dashboard for database monitoring and analytics" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </>
  );
}