import Head from 'next/head';
import { TestToolsDashboard } from '@/components/testTools/TestToolsDashboard';

export default function TestToolsPage() {
  return (
    <>
      <Head>
        <title>Test Tools - Order Management</title>
        <meta name="description" content="Non-prod order management, lookup, and shipping tools" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <TestToolsDashboard />
    </>
  );
}
