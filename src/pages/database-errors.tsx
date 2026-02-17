import Head from 'next/head';
import { AppLayout } from '@/components/global/appLayout';
import { DatabaseErrorsDashboard } from '@/components/databaseErrors/DatabaseErrorsDashboard';

export default function DatabaseErrorsPage() {
  return (
    <>
      <Head>
        <title>Database Errors - Dashboard</title>
        <meta name="description" content="Monitor database errors across SQL Server instances" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppLayout>
        <DatabaseErrorsDashboard />
      </AppLayout>
    </>
  );
}

