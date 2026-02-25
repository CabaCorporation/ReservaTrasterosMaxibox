import planoPruebaUrl from '../assets/plans/plano-prueba-planta-1.svg?url'

const LOCAL_PLAN_BY_TENANT: Record<string, string> = {
  prueba: planoPruebaUrl,
}

export function getLocalPlanSvgUrl(tenantSlug: string): string | null {
  const key = tenantSlug.trim().toLowerCase()
  return LOCAL_PLAN_BY_TENANT[key] ?? null
}
