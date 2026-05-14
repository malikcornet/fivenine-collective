import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../../../lib/useApi'
import type { Widget } from '../model/widget'
import { createWidget, getStudio, saveMyWidgets, type Studio } from '../api/client'

export const studioKeys = {
  all: ['studio'] as const,
  current: () => [...studioKeys.all, 'current'] as const,
}

export function useStudioQuery() {
  const http = useApi()
  return useQuery({
    queryKey: studioKeys.current(),
    queryFn: () => getStudio(http),
  })
}

export function useCreateWidget() {
  const http = useApi()
  return useMutation({
    mutationFn: (widget: Widget) => createWidget(http, widget),
  })
}

export function useSaveMyWidgets() {
  const http = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (widgets: Widget[]) => saveMyWidgets(http, widgets),
    onSuccess: (studio: Studio) => {
      qc.setQueryData(studioKeys.current(), studio)
    },
  })
}
