import Head from 'next/head';
import { ClsManagementDashboard } from '@/components/clsManagement/ClsManagementDashboard';

export default function ClsManagementPage() {
  return (
    <>
      <Head>
        <title>CLS Route Management - Dashboard</title>
        <meta name="description" content="Manage WMS CLS queue information and database data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ClsManagementDashboard />
    </>
  );
}
