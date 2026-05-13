import { useQuery } from '@tanstack/react-query'
import { getCluster } from './cluster'

export const clusterKeys = {
  all: ['cluster'] as const,
  current: () => [...clusterKeys.all, 'current'] as const,
}

export function useClusterQuery() {
  return useQuery({
    queryKey: clusterKeys.current(),
    queryFn: getCluster,
  })
}
