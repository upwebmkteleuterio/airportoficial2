/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery } from '@tanstack/react-query';
import { companyService } from '../services/companyService';

export function useActiveEmployeeCounts() {
  const query = useQuery({
    queryKey: ['company-active-employee-counts'],
    queryFn: companyService.getActiveEmployeeCounts,
  });

  return {
    activeEmployeeCounts: query.data || {},
    isLoadingActiveEmployeeCounts: query.isLoading,
  };
}
