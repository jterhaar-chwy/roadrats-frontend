import Head from 'next/head';
import { ReleaseManagerDashboard } from '@/components/releaseManager/ReleaseManagerDashboard';

export default function ReleaseManagerPage() {
  return (
    <>
      <Head>
        <title>Release Manager - Deployment Plan</title>
        <meta name="description" content="Jira CHG deployment plan viewer" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ReleaseManagerDashboard />
    </>
  );
}
