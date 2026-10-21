
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ApplicationType = "intramuscular" | "subcutaneous";

export const SUBSTANCE_PRESETS: Record<
  string,
  { brand: string; concentration: number }
> = {
  "Enantato de testosterona": {
    brand: "ZPCH",
    concentration: 250,
  },
};

export function getSubstancePreset(substance: string) {
  return (
    SUBSTANCE_PRESETS[substance] || {
      brand: "",
      concentration: 0,
    }
  );
}

export const DEFAULT_SUBSTANCES = [
  "Enantato de testosterona",
  "Cipionato de testosterona",
  "Propionato de testosterona",
  "Masteron Propionato",
  "Retatrutida",
  "Semaglutida",
  "Tirzepatida",
];

export const DEFAULT_LOCATIONS = [
  "Abdômen esquerdo",
  "Abdômen direito",
  "Vasto Lateral esquerdo",
  "Vasto Lateral direito",
  "Deltoide esquerdo",
  "Deltoide direito",
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
  endDate: string;
  frequencyType: "every_n_days" | "weekdays";
  intervalDays: number;
  weekdays: number[];
  locationIds: string[];
  active: boolean;
};

export type SubstanceDetails = { brand: string; concentration: number; volume: number; applicationType: ApplicationType };

export type BackupData = {
  injections: Injection[];
  substances: string[];
  locations: string[];
  plans: ApplicationPlan[];
  substanceDetails?: Record<string, SubstanceDetails>;
};

type InjectionStore = BackupData & {
  substanceDetails: Record<string, SubstanceDetails>;
  updateSubstanceDetails: (name: string, details: SubstanceDetails) => void;
  addInjection: (injection: Omit<Injection, "id">) => void;
  updateInjection: (
    id: string,
    injection: Omit<Injection, "id">
  ) => void;
  removeInjection: (id: string) => void;
  addSubstance: (name: string) => void;
  renameSubstance: (oldName: string, newName: string) => void;
  removeSubstance: (name: string) => void;
  addLocation: (name: string) => void;
  renameLocation: (oldName: string, newName: string) => void;
  removeLocation: (name: string) => void;
  addPlan: (plan: Omit<ApplicationPlan, "id">) => void;
  updatePlan: (
    id: string,
    plan: Omit<ApplicationPlan, "id">
  ) => void;
  removePlan: (id: string) => void;

  // Substitui os dados atuais pelos dados de um backup.
  replaceAllData: (data: BackupData) => void;
};

function normalizeList(
  items: string[],
  defaults: string[]
): string[] {
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

const LEGACY_DEFAULT_SUBSTANCES = [
  "Enantato de testosterona",
  "Cipionato de testosterona",
  "Propionato de testosterona",
  "Retatrutida",
  "Semaglutida",
  "Tirzepatida",
  "Outro",
];

const LEGACY_DEFAULT_LOCATIONS = [
  "Abdômen esquerdo",
  "Abdômen direito",
  "Coxa esquerda",
  "Coxa direita",
  "Braço esquerdo",
  "Braço direito",
  "Outro",
];

function migrateList(
  items: string[] | undefined,
  defaults: string[],
  legacyDefaults: string[]
): string[] {
  const legacy = new Set(
    legacyDefaults.map((value) =>
      value.toLocaleLowerCase("pt-BR")
    )
  );

  const customItems = (items ?? []).filter((value) => {
    const normalized = String(value ?? "").trim();

    return (
      normalized !== "" &&
      !legacy.has(normalized.toLocaleLowerCase("pt-BR"))
    );
  });

  return normalizeList(customItems, defaults);
}

function normalizeInjections(
  items: Injection[]
): Injection[] {
  return items
    .filter(Boolean)
    .map(
      (item): Injection => ({
        ...item,
        id: String(item.id || crypto.randomUUID()),
        date: String(item.date || "").slice(0, 10),
        substance:
          String(item.substance || "Outro").trim() || "Outro",
        concentration: Math.max(
          0,
          Number(item.concentration) || 0
        ),
        volume: Math.max(0, Number(item.volume) || 0),
        location:
          String(item.location || "Outro").trim() || "Outro",
        notes: String(item.notes || ""),
        brand: String(
          item.brand ||
          getSubstancePreset(
            String(item.substance || "")
          ).brand ||
          ""
        ).trim(),
        applicationType:
          item.applicationType === "subcutaneous"
            ? "subcutaneous"
            : "intramuscular",
        syringeGroupId: item.syringeGroupId
          ? String(item.syringeGroupId)
          : undefined,
      })
    )
    .filter((item) => item.date);
}

function normalizePlans(
  items: ApplicationPlan[]
): ApplicationPlan[] {
  return items
    .filter(Boolean)
    .map(
      (plan): ApplicationPlan => ({
        ...plan,
        id: String(plan.id || crypto.randomUUID()),
        name: String(plan.name || "Plano").trim(),
        substance: String(plan.substance || "").trim(),
        brand: String(
          plan.brand ||
          getSubstancePreset(
            String(plan.substance || "")
          ).brand ||
          ""
        ).trim(),
        concentration: Math.max(
          0,
          Number(plan.concentration) || 0
        ),
        volume: Math.max(0, Number(plan.volume) || 0),
        applicationType:
          plan.applicationType === "subcutaneous"
            ? "subcutaneous"
            : "intramuscular",
        startDate: String(plan.startDate || "").slice(0, 10),
        endDate: String(plan.endDate || "").slice(0, 10),
        frequencyType:
          plan.frequencyType === "weekdays"
            ? "weekdays"
            : "every_n_days",
        intervalDays: Math.max(
          1,
          Number(plan.intervalDays) || 1
        ),
        weekdays: Array.from(
          new Set(
            (plan.weekdays || [])
              .map(Number)
              .filter((day) => day >= 0 && day <= 6)
          )
        ),
        locationIds: Array.from(
          new Set(
            (plan.locationIds || [])
              .map(String)
              .filter(Boolean)
          )
        ),
        active: plan.active !== false,
      })
    );
}

export const useInjectionStore =
  create<InjectionStore>()(
    persist(
      (set) => ({
        injections: [],
        substances: DEFAULT_SUBSTANCES,
        locations: DEFAULT_LOCATIONS,
        plans: [],
        substanceDetails: {},
        updateSubstanceDetails: (name, details) => set((state) => ({
          substanceDetails: { ...state.substanceDetails, [name]: details },
        })),

        addInjection: (injection) =>
          set((state) => ({
            injections: [
              {
                ...injection,
                id: crypto.randomUUID(),
              },
              ...state.injections,
            ].sort((a, b) => b.date.localeCompare(a.date)),
          })),

        updateInjection: (id, injection) =>
          set((state) => ({
            injections: state.injections
              .map((item) =>
                item.id === id ? { ...injection, id } : item
              )
              .sort((a, b) => b.date.localeCompare(a.date)),
          })),

        removeInjection: (id) =>
          set((state) => ({
            injections: state.injections.filter(
              (item) => item.id !== id
            ),
          })),

        addSubstance: (name) =>
          set((state) => ({
            substances: normalizeList(
              [...state.substances, name],
              DEFAULT_SUBSTANCES
            ),
          })),

        renameSubstance: (oldName, newName) =>
          set((state) => {
            const name = newName.trim();
            const substanceDetails = { ...state.substanceDetails };
            if (substanceDetails[oldName]) {
              substanceDetails[name] = substanceDetails[oldName];
              delete substanceDetails[oldName];
            }
            return {
              substances: normalizeList(
                state.substances.map((item) => item === oldName ? name : item),
                DEFAULT_SUBSTANCES
              ),
              substanceDetails,
              plans: state.plans.map((plan) => plan.substance === oldName ? { ...plan, substance: name } : plan),
            };
          }),

        removeSubstance: (name) =>
          set((state) => ({
            substances: state.substances.filter((item) => item !== name),
            plans: state.plans.filter((plan) => plan.substance !== name),
          })),

        addLocation: (name) =>
          set((state) => ({
            locations: normalizeList(
              [...state.locations, name],
              DEFAULT_LOCATIONS
            ),
          })),

        renameLocation: (oldName, newName) =>
          set((state) => ({
            locations: normalizeList(
              state.locations.map((name) => name === oldName ? newName.trim() : name),
              DEFAULT_LOCATIONS
            ),
            plans: state.plans.map((plan) => ({
              ...plan,
              locationIds: plan.locationIds.map((location) => location === oldName ? newName.trim() : location),
            })),
          })),

        removeLocation: (name) =>
          set((state) => ({
            locations: state.locations.filter((item) => item !== name),
            plans: state.plans.map((plan) => ({
              ...plan,
              locationIds: plan.locationIds.filter((location) => location !== name),
            })),
          })),

        addPlan: (plan) =>
          set((state) => ({
            plans: [
              {
                ...plan,
                id: crypto.randomUUID(),
              },
              ...state.plans,
            ],
          })),

        updatePlan: (id, plan) =>
          set((state) => ({
            plans: state.plans.map((item) =>
              item.id === id ? { ...plan, id } : item
            ),
          })),

        removePlan: (id) =>
          set((state) => ({
            plans: state.plans.filter(
              (item) => item.id !== id
            ),
          })),

        // Restauração dos dados do backup.
        // A persistência do Zustand grava o novo estado
        // automaticamente no localStorage.
        replaceAllData: (data) =>
          set(() => ({
            injections: normalizeInjections(data.injections),
            substances: normalizeList(
              data.substances,
              DEFAULT_SUBSTANCES
            ),
            locations: normalizeList(
              data.locations,
              DEFAULT_LOCATIONS
            ),
            plans: normalizePlans(data.plans),
            substanceDetails: data.substanceDetails ?? {},
          })),
      }),
      {
        name: "shot-track-injections",
        version: 7,

        migrate: (persistedState) => {
          const state =
            persistedState as Partial<InjectionStore>;

          return {
            injections: normalizeInjections(
              state.injections ?? []
            ),
            substances: migrateList(
              state.substances,
              DEFAULT_SUBSTANCES,
              LEGACY_DEFAULT_SUBSTANCES
            ),
            locations: migrateList(
              state.locations,
              DEFAULT_LOCATIONS,
              LEGACY_DEFAULT_LOCATIONS
            ),
            plans: normalizePlans(state.plans ?? []),
            substanceDetails: state.substanceDetails ?? {},
          };
        },

        merge: (
          persistedState,
          currentState
        ): InjectionStore => {
          const state =
            persistedState as Partial<InjectionStore>;

          const injections: Injection[] =
            normalizeInjections(state.injections ?? []);

          const substances: string[] = normalizeList(
            state.substances ?? DEFAULT_SUBSTANCES,
            []
          );

          const locations: string[] = normalizeList(
            state.locations ?? DEFAULT_LOCATIONS,
            []
          );

          const plans: ApplicationPlan[] =
            normalizePlans(state.plans ?? []);

          return {
            ...currentState,
            ...state,
            injections,
            substances,
            locations,
            plans,
            substanceDetails: state.substanceDetails ?? currentState.substanceDetails ?? {},
          };
        },
      }
    )
  );