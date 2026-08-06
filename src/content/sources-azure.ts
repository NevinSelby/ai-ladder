import type { Citation } from '@shared/content';

/**
 * Azure citation keys, kept in a separate module from `sources.ts` so the Azure
 * bank can be edited without contending with the GCP and AWS banks. Same shape,
 * same discipline: a doc URL lives in exactly one place.
 */
export const AZ_SRC = {
  azWaf: {
    title: 'Azure Well-Architected Framework',
    url: 'https://learn.microsoft.com/en-us/azure/well-architected/',
  },
  azEntra: {
    title: 'What is Microsoft Entra?',
    url: 'https://learn.microsoft.com/en-us/entra/fundamentals/what-is-entra',
  },
  azPrivateLink: {
    title: 'What is Azure Private Link?',
    url: 'https://learn.microsoft.com/en-us/azure/private-link/private-link-overview',
  },
  azFoundry: {
    title: 'What is Microsoft Foundry?',
    url: 'https://learn.microsoft.com/en-us/azure/foundry/what-is-foundry',
  },
  azOpenai: {
    title: 'Azure OpenAI in Microsoft Foundry Models quotas and limits',
    url: 'https://learn.microsoft.com/en-us/azure/foundry/openai/quotas-limits',
  },
  azMonitor: {
    title: 'Azure Monitor overview',
    url: 'https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/overview',
  },
  azPolicy: {
    title: 'Overview of Azure Policy',
    url: 'https://learn.microsoft.com/en-us/azure/governance/policy/overview',
  },
} satisfies Record<string, Citation>;

export type AzSourceKey = keyof typeof AZ_SRC;

export const citeAz = (...keys: AzSourceKey[]): Citation[] => keys.map((key) => AZ_SRC[key]);
