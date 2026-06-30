import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { getErrorMessage } from '@/lib/format'
import type { CompanyProfile } from '../types'

export function useCompanyProfile() {
  return useQuery({
    queryKey: ['company-profile'],
    queryFn: () => apiFetch<CompanyProfile>('/api/v1/company'),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CompanyProfile>) =>
      apiFetch<CompanyProfile>('/api/v1/company', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success('Company profile saved.')
      void queryClient.invalidateQueries({ queryKey: ['company-profile'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to save profile.')),
  })
}
