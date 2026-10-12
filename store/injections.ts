import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ApplicationType = "intramuscular" | "subcutaneous";

export const SUBSTANCE_PRESETS: Record<string, { brand: string; concentration: number }> = {
  "Enantato de testosterona": { brand: "ZPCH", concentration: 250 }
};

export function getSubstancePreset(substance: string) {
  return SUBSTANCE_PRESETS[substance] || { brand: "", concentration: 0 };
}

export const DEFAULT_SUBSTANCES = [
  "Enantato de testosterona",
  "Cipionato de testosterona",
  "Propionato de testosterona",
  "Masteron Propionato",
  "Retatrutida",
  "Semaglutida",
  "Tirzepatida"
];

export const DEFAULT_LOCATIONS = [
  "Abdômen esquerdo",
  "Abdômen direito",
  "Vasto Lateral esquerdo",
  "Vasto Lateral direito",
  "Deltoide esquerdo",
  "Deltoide direito"
];

export type Injection = {
  id: string;
  date: string;
  substance: string;
  concentration: number;
  volume: number;
  location: string;
  notes: string;
  brand: string;
  applicationType: ApplicationType;
  syringeGroupId?: string;
};

export type ApplicationPlan = {
  id: string;
  name: string;
  substance: string;
  brand: string;
  concentration: number;
  volume: number;
  applicationType: ApplicationType;
  startDate: string;
  frequencyType: "every_n_days" | "weekdays";
  intervalDays: number;
  weekdays: number[];
  locationIds: string[];
  active: boolean;
};

type InjectionStore = {
  injections: Injection[];
  substances: string[];
  locations: string[];
  plans: ApplicationPlan[];
  addInjection: (injection: Omit<Injection, "id">) => void;
  updateInjection: (id: string, injection: Omit<Injection, "id">) => void;
  removeInjection: (id: string) => void;
  addSubstance: (name: string) => void;
  addLocation: (name: string) => void;
  addPlan: (plan: Omit<ApplicationPlan, "id">) => void;
  updatePlan: (id: string, plan: Omit<ApplicationPlan, "id">) => void;
  removePlan: (id: string) => void;
  replaceAllData: (data: { injections: Injection[]; substances: string[]; locations: string[]; plans: ApplicationPlan[] }) => void;
};

function normalizeList(items: string[], defaults: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...defaults, ...items]) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

// Lists that belonged to older built-in presets. They are excluded during the
// v5 -> v6 migration so removing/changing a built-in in the source code really
// takes effect, instead of being resurrected by localStorage. Items that were
// genuinely added by the user remain preserved.
const LEGACY_DEFAULT_SUBSTANCES = [
  "Enantato de testosterona",
  "Cipionato de testosterona",
  "Propionato de testosterona",
  "Retatrutida",
  "Semaglutida",
  "Tirzepatida",
  "Outro"
];

const LEGACY_DEFAULT_LOCATIONS = [
  "Abdômen esquerdo",
  "Abdômen direito",
  "Coxa esquerda",
  "Coxa direita",
  "Braço esquerdo",
  "Braço direito",
  "Outro"
];

function migrateList(items: string[] | undefined, defaults: string[], legacyDefaults: string[]) {
  const legacy = new Set(legacyDefaults.map(value => value.toLocaleLowerCase("pt-BR")));
  const customItems = (items ?? []).filter(value => {
    const normalized = String(value ?? "").trim();
    return normalized && !legacy.has(normalized.toLocaleLowerCase("pt-BR"));
  });
  return normalizeList(customItems, defaults);
}

function normalizeInjections(items: Injection[]) {
  return items
    .filter(Boolean)
    .map((item) => ({
      ...item,
      id: String(item.id || crypto.randomUUID()),
      date: String(item.date || "").slice(0, 10),
      substance: String(item.substance || "Outro").trim() || "Outro",
      concentration: Math.max(0, Number(item.concentration) || 0),
      volume: Math.max(0, Number(item.volume) || 0),
      location: String(item.location || "Outro").trim() || "Outro",
      notes: String(item.notes || ""),
      brand: String(item.brand || getSubstancePreset(String(item.substance || "")).brand || "").trim(),
      applicationType: item.applicationType === "subcutaneous" ? "subcutaneous" : "intramuscular",
      syringeGroupId: item.syringeGroupId ? String(item.syringeGroupId) : undefined
    }))
    .filter((item) => item.date);
}

function normalizePlans(items: ApplicationPlan[]) {
  return items
    .filter(Boolean)
    .map((plan) => ({
      ...plan,
      name: String(plan.name || "Plano").trim(),
      substance: String(plan.substance || "").trim(),
      brand: String(plan.brand || getSubstancePreset(String(plan.substance || "")).brand || "").trim(),
      concentration: Math.max(0, Number(plan.concentration) || 0),
      volume: Math.max(0, Number(plan.volume) || 0),
      applicationType: plan.applicationType === "subcutaneous" ? "subcutaneous" : "intramuscular",
      startDate: String(plan.startDate || "").slice(0, 10),
      frequencyType: plan.frequencyType === "weekdays" ? "weekdays" : "every_n_days",
      intervalDays: Math.max(1, Number(plan.intervalDays) || 1),
      weekdays: Array.from(new Set((plan.weekdays || []).map(Number).filter((day) => day >= 0 && day <= 6))),
      locationIds: Array.from(new Set((plan.locationIds || []).map(String).filter(Boolean))),
      active: plan.active !== false
    }));
}

export const useInjectionStore = create<InjectionStore>()(
  persist(
    (set) => ({
      injections: [],
      substances: DEFAULT_SUBSTANCES,
      locations: DEFAULT_LOCATIONS,
      plans: [],

      addInjection: (injection) =>
        set((state) => ({
          injections: [{ ...injection, id: crypto.randomUUID() }, ...state.injections].sort((a, b) => b.date.localeCompare(a.date))
        })),

      updateInjection: (id, injection) =>
        set((state) => ({
          injections: state.injections.map((item) => (item.id === id ? { ...injection, id } : item)).sort((a, b) => b.date.localeCompare(a.date))
        })),

      removeInjection: (id) => set((state) => ({ injections: state.injections.filter((item) => item.id !== id) })),

      addSubstance: (name) =>
        set((state) => ({ substances: normalizeList([...state.substances, name], DEFAULT_SUBSTANCES) })),

      addLocation: (name) =>
        set((state) => ({ locations: normalizeList([...state.locations, name], DEFAULT_LOCATIONS) })),

      addPlan: (plan) => set((state) => ({ plans: [{ ...plan, id: crypto.randomUUID() }, ...state.plans] })),

      updatePlan: (id, plan) =>
        set((state) => ({ plans: state.plans.map((item) => (item.id === id ? { ...plan, id } : item)) })),

      removePlan: (id) => set((state) => ({ plans: state.plans.filter((item) => item.id !== id) })),

      replaceAllData: (data) => set(() => ({
        injections: normalizeInjections(data.injections),
        substances: normalizeList(data.substances, DEFAULT_SUBSTANCES),
        locations: normalizeList(data.locations, DEFAULT_LOCATIONS),
        plans: normalizePlans(data.plans)
      }))
    }),
    {
      name: "shot-track-injections",
      version: 7,
      migrate: (persistedState) => {
        const state = persistedState as Partial<InjectionStore>;
        return {
          injections: normalizeInjections(state.injections ?? []),
          substances: migrateList(state.substances, DEFAULT_SUBSTANCES, LEGACY_DEFAULT_SUBSTANCES),
          locations: migrateList(state.locations, DEFAULT_LOCATIONS, LEGACY_DEFAULT_LOCATIONS),
          plans: normalizePlans(state.plans ?? [])
        };
      },
      // Never merge the current defaults back into persisted arrays. Defaults are
      // the source-code baseline; persisted arrays are the user's actual lists.
      // This is what allows a removed/replaced built-in to stay removed.
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<InjectionStore>;
        return {
          ...currentState,
          ...state,
          injections: normalizeInjections(state.injections ?? []),
          substances: normalizeList(state.substances ?? DEFAULT_SUBSTANCES, []),
          locations: normalizeList(state.locations ?? DEFAULT_LOCATIONS, []),
          plans: normalizePlans(state.plans ?? [])
        };
      }
    }
  )
);
