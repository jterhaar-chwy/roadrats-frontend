import Head from 'next/head';
import { AppLayout } from '@/components/global/appLayout';
import { SrmDownloadManager } from '@/components/srmDownload/SrmDownloadManager';

export default function SrmDownloadPage() {
  return (
    <>
      <Head>
        <title>SRM File Download - Roadrats</title>
        <meta name="description" content="Download and manage SRM files from WMSSQL-IS" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <AppLayout>
        <SrmDownloadManager />
      </AppLayout>
    </>
  );
}
