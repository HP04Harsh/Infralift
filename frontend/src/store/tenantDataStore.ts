import { create } from "zustand";
import { apiService } from "@/services/api";
import { useNotificationStore } from "@/store/notificationStore";

interface CostData {
  month_to_date: number;
  forecast: number;
  cost_by_resource_group: Record<string, number>;
  cost_by_service: Record<string, number>;
  currency: string;
}

interface SecurityData {
  secure_score: number;
  secure_score_percentage: number;
  total_alerts: number;
  by_severity: { high: number; medium: number; low: number };
  alerts: any[];
}

interface MetricsData {
  virtual_machines: any[];
  storage_accounts: any[];
  sql_databases: any[];
}

interface AdvisorData {
  recommendations: any[];
  count: number;
}

interface ComplianceData {
  policy_states?: any[];
  regulatory_standards?: any[];
  summary?: Record<string, number>;
}

interface ResourceSummary {
  resource_groups: number;
  virtual_machines: number;
  network_resources: number;
  storage_accounts: number;
  sql_databases: number;
  key_vaults: number;
  web_apps: number;
  container_instances: number;
}

interface ResourceStats {
  total_resources: number;
  by_type: Record<string, number>;
  by_location: Record<string, number>;
  by_status: Record<string, number>;
  costs: CostData;
  security: SecurityData;
  resource_summary: ResourceSummary;
  synced_at: string;
}

interface TenantDataState {
  loading: boolean;
  syncing: boolean;
  error: string | null;
  lastSync: string | null;

  stats: ResourceStats | null;
  costs: CostData | null;
  security: SecurityData | null;
  metrics: MetricsData | null;
  advisor: AdvisorData | null;
  compliance: ComplianceData | null;
  resources: any[];

  fetchAll: () => Promise<void>;
  resync: () => Promise<void>;
}

export const useTenantDataStore = create<TenantDataState>()((set, get) => ({
  loading: true,
  syncing: false,
  error: null,
  lastSync: null,

  stats: null,
  costs: null,
  security: null,
  metrics: null,
  advisor: null,
  compliance: null,
  resources: [],

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [statsRes, costsRes, securityRes, metricsRes, advisorRes, complianceRes, resourcesRes] =
        await Promise.allSettled([
          apiService.getResourceStats(),
          apiService.getResourceCosts(),
          apiService.getSecurityFindings(),
          apiService.getResourceMetrics(),
          apiService.getAdvisorRecommendations(),
          apiService.getComplianceData(),
          apiService.listResources({ limit: 500 }),
        ]);

      const stats = statsRes.status === "fulfilled" ? (statsRes.value as any) : null;
      const costs = costsRes.status === "fulfilled" ? (costsRes.value as any)?.costs ?? null : null;
      const security = securityRes.status === "fulfilled" ? (securityRes.value as any)?.security ?? null : null;
      const metrics = metricsRes.status === "fulfilled" ? (metricsRes.value as any)?.metrics ?? null : null;
      const advisor = advisorRes.status === "fulfilled" ? (advisorRes.value as any) ?? null : null;
      const compliance = complianceRes.status === "fulfilled" ? (complianceRes.value as any)?.compliance ?? null : null;
      const resources = resourcesRes.status === "fulfilled" ? (resourcesRes.value as any) ?? [] : [];

      set({
        stats,
        costs,
        security,
        metrics,
        advisor,
        compliance,
        resources,
        loading: false,
        lastSync: new Date().toISOString(),
        error: null,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "Failed to fetch tenant data" });
    }
  },

  resync: async () => {
    set({ syncing: true, error: null });
    try {
      await apiService.startSync("default");
      let attempts = 0;
      while (attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await apiService.getSyncStatus("default");
        if ((status as any)?.status === "completed" || (status as any)?.sync?.status === "completed") {
          break;
        }
        attempts++;
      }
      await get().fetchAll();
      set({ syncing: false, lastSync: new Date().toISOString() });
      useNotificationStore.getState().addNotification({
        title: "Resync completed",
        message: "Tenant data resynchronized successfully",
        status: "success",
        category: "tenant_sync",
      });
    } catch (e: any) {
      set({ syncing: false, error: e?.message ?? "Resync failed" });
    }
  },
}));
