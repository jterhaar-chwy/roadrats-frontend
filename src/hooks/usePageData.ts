import { useCallback } from 'react';

export type PageType = 'srm-download' | 'database-errors' | 'cls-management' | 'release-manager';

export interface UsePageDataReturn {
  getPageData: () => any;
}

/**
 * Hook to extract page-specific data for chatbot context
 * This hook should be used within each page component to extract relevant data
 */
export const usePageData = (
  pageType: PageType,
  pageDataExtractor: () => any
): UsePageDataReturn => {
  const getPageData = useCallback(() => {
    try {
      const data = pageDataExtractor();
      return {
        pageType,
        ...data,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error extracting page data:', error);
      return {
        pageType,
        error: 'Failed to extract page data',
        extractedAt: new Date().toISOString(),
      };
    }
  }, [pageType, pageDataExtractor]);

  return { getPageData };
};
