import { getAgenciesList } from '@/data/agencies-utils'
import { getThemeCodeByLabel } from '@/data/themes-utils'
import ThemePageClient from './ThemePageClient'

type ThemePageProps = {
  params: Promise<{
    themeLabel: string
  }>
}

export default async function ThemePage({ params }: ThemePageProps) {
  const { themeLabel } = await params
  const decodedThemeLabel = decodeURIComponent(themeLabel)
  const [agencies, themeCode] = await Promise.all([
    getAgenciesList(),
    getThemeCodeByLabel(decodedThemeLabel),
  ])

  return (
    <ThemePageClient
      themeLabel={decodedThemeLabel}
      themeCode={themeCode}
      agencies={agencies}
    />
  )
}
