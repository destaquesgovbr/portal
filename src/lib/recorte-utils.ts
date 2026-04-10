import { getAgencyField } from '@/data/agencies-utils'
import { getThemeNameByCode } from '@/data/themes-utils'
import type { Recorte } from '@/types/clipping'

export type ResolvedRecorte = Recorte & {
  themeLabels: string[]
  agencyLabels: string[]
}

export async function resolveRecorteLabels(
  recortes: Recorte[],
): Promise<ResolvedRecorte[]> {
  return Promise.all(
    recortes.map(async (r) => ({
      ...r,
      themeLabels: await Promise.all(
        r.themes.map((code) => getThemeNameByCode(code).then((l) => l ?? code)),
      ),
      agencyLabels: await Promise.all(
        r.agencies.map((key) =>
          getAgencyField(key, 'name').then((l) => l ?? key),
        ),
      ),
    })),
  )
}
