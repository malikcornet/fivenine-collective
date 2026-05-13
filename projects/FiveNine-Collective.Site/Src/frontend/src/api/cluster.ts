import type { Widget } from '../components/cluster/types'

export interface Cluster {
  id: string
  version: number
  widgets: Widget[]
  updatedAt: string
}

const STUB_CLUSTER: Cluster = {
  id: 'stub-cluster',
  version: 0,
  updatedAt: new Date().toISOString(),
  widgets: [
    {
      id: 'w0',
      type: 'profile',
      col: 0,
      row: -4,
      w: 5,
      h: 3,
      data: {
        name: 'Malik Cornet',
        role: 'Builder · Montréal',
        bio: 'Designer/dev making weird things on purpose.',
      },
    },
    {
      id: 'w1',
      type: 'about',
      col: 0,
      row: 0,
      w: 5,
      h: 3,
      data: { title: 'About', body: 'Designer, builder, dreamer. Based in Montréal.' },
    },
    { id: 'w2', type: 'gallery', col: 6, row: 0, w: 6, h: 4, data: { count: 3 } },
    {
      id: 'w3',
      type: 'links',
      col: 0,
      row: 4,
      w: 4,
      h: 3,
      data: { items: ['Portfolio', 'Blog', 'Shop'] },
    },
    {
      id: 'w4',
      type: 'socials',
      col: 5,
      row: 5,
      w: 4,
      h: 2,
      data: { items: ['IG', 'YT', 'SC', 'X'] },
    },
    {
      id: 'w5',
      type: 'text',
      col: 10,
      row: 5,
      w: 4,
      h: 2,
      data: { body: '"Make weird things on purpose."' },
    },
  ],
}

export async function getCluster(): Promise<Cluster> {
  return Promise.resolve(STUB_CLUSTER)
}

export async function saveCluster(cluster: Cluster): Promise<Cluster> {
  return Promise.resolve({
    ...cluster,
    version: cluster.version + 1,
    updatedAt: new Date().toISOString(),
  })
}
