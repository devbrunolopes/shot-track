"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Activity, UserRound, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Clock3, Droplet, Filter, MapPin, CircleDot,
  Pencil, Plus, Repeat2, Syringe, Tag, Trash2, X, History, Download, Upload, ShieldCheck, MoreHorizontal, FlaskConical, MapPinned, LogOut, Mail, LockKeyhole, Sun, Moon,
} from "lucide-react";
import { getSubstancePreset, useInjectionStore, type ApplicationPlan, type ApplicationType, type Injection } from "@/store/injections";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

type SyringeComponent = { planId: string; substance: string; brand: string; concentration: string; volume: string; applicationType: ApplicationType };
type FormState = { date: string; substance: string; brand: string; concentration: string; volume: string; applicationType: ApplicationType; location: string; notes: string; components: SyringeComponent[] };
type PlanForm = { name: string; substance: string; brand: string; concentration: string; volume: string; applicationType: ApplicationType; startDate: string; endDate: string; frequencyType: "every_n_days" | "weekdays"; intervalDays: string; weekdays: number[]; locationIds: string[] };

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const weekdayValues = [1, 2, 3, 4, 5, 6, 0];

function todayKey() { return localDateKey(new Date()); }
function localDateKey(date: Date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function getWeekDays(date: Date) {
  const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (selected.getDay() + 6) % 7;
  selected.setDate(selected.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(selected); d.setDate(selected.getDate() + i); return d; });
}
function formatDate(date: string) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T12:00:00`)); }
function formatNumber(value: number | null | undefined, digits = 2) { const safeValue = Number(value); return (Number.isFinite(safeValue) ? safeValue : 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits }); }
function monthTitle(date: Date) { return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date).replace(/^./, c => c.toUpperCase()); }
function getCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function dateDiffDays(a: string, b: string) { return Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86400000); }
function isPlannedOnDate(plan: ApplicationPlan, date: string) {
  if (!plan.active || date < plan.startDate || (plan.endDate && date > plan.endDate)) return false;
  if (plan.frequencyType === "every_n_days") return dateDiffDays(date, plan.startDate) % Math.max(1, plan.intervalDays) === 0;
  const day = new Date(`${date}T12:00:00`).getDay();
  return plan.weekdays.includes(day);
}
function emptyForm(substance = "", location = "") : FormState {
  const preset = getSubstancePreset(substance);
  return { date: todayKey(), substance, brand: "", concentration: preset.concentration ? String(preset.concentration) : "", volume: "", applicationType: "intramuscular", location, notes: "", components: [] };
}
function emptyPlan(substance = "", locationIds: string[] = []): PlanForm {
  const preset = getSubstancePreset(substance);
  return { name: "", substance, brand: "", concentration: preset.concentration ? String(preset.concentration) : "", volume: "", applicationType: "intramuscular", startDate: todayKey(), endDate: "", frequencyType: "every_n_days", intervalDays: "2", weekdays: [], locationIds };
}

export default function Home() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeLoaded, setThemeLoaded] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("diario-fitness-theme");
    const initial = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    setThemeLoaded(true);
  }, []);
  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("diario-fitness-theme", theme);
  }, [theme, themeLoaded]);
  useEffect(() => onAuthStateChanged(firebaseAuth, user => { setAuthUser(user); setAuthLoading(false); }), []);

  function authErrorMessage(error: unknown) {
    const code = typeof error === "object" && error && "code" in error ? String((error as {code?: unknown}).code) : "";
    const messages: Record<string, string> = {
      "auth/invalid-email": "Informe um e-mail válido.",
      "auth/missing-password": "Informe sua senha.",
      "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
      "auth/email-already-in-use": "Já existe uma conta cadastrada com este e-mail. Entre ou recupere sua senha.",
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/user-not-found": "Não encontramos uma conta com esse e-mail.",
      "auth/wrong-password": "E-mail ou senha incorretos.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
      "auth/network-request-failed": "Falha de conexão. Verifique sua internet e tente novamente.",
      "auth/operation-not-allowed": "O login por e-mail e senha não está habilitado no Firebase.",
      "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase Authentication.",
    };
    return messages[code] || "Não foi possível concluir a operação. Confira os dados e tente novamente.";
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAuthMessage(""); setAuthBusy(true);
    try {
      if (authMode === "signup") {
        const name = authName.trim();
        if (!name) { setAuthMessage("Informe seu nome para criar a conta."); return; }
        const credential = await createUserWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword);
        await updateProfile(credential.user, { displayName: name });
        setAuthUser(firebaseAuth.currentUser);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword);
      }
    } catch (error) { setAuthMessage(authErrorMessage(error)); }
    finally { setAuthBusy(false); }
  }

  async function resetPassword() {
    setAuthMessage("");
    if (!authEmail.trim()) { setAuthMessage("Informe seu e-mail acima para receber o link de recuperação."); return; }
    setAuthBusy(true);
    try { await sendPasswordResetEmail(firebaseAuth, authEmail.trim()); setAuthMessage("Se o endereço estiver cadastrado, você receberá um e-mail com as instruções para redefinir a senha."); }
    catch (error) { setAuthMessage(authErrorMessage(error)); }
    finally { setAuthBusy(false); }
  }

  const { injections, substances, locations, plans, substanceDetails, updateSubstanceDetails, addInjection, updateInjection, removeInjection, addSubstance, renameSubstance, removeSubstance, addLocation, renameLocation, removeLocation, addPlan, updatePlan, removePlan, replaceAllData } = useInjectionStore();
  const [modalOpen, setModalOpen] = useState(false); const [editing, setEditing] = useState<Injection | null>(null); const [registrationPlan, setRegistrationPlan] = useState<ApplicationPlan | null>(null); const [deleteTarget, setDeleteTarget] = useState<Injection | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm()); const [addingSubstance, setAddingSubstance] = useState(false); const [newSubstance, setNewSubstance] = useState(""); const [addingLocation, setAddingLocation] = useState(false); const [newLocation, setNewLocation] = useState("");
  const [planModalOpen, setPlanModalOpen] = useState(false); const [addingPlanLocation, setAddingPlanLocation] = useState(false); const [newPlanLocation, setNewPlanLocation] = useState(""); const [editingPlan, setEditingPlan] = useState<ApplicationPlan | null>(null); const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan()); const [deletePlanTarget, setDeletePlanTarget] = useState<ApplicationPlan | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }); const [selectedDate, setSelectedDate] = useState<string | null>(() => todayKey()); const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "plans" | "history" | "more">("calendar");
  const [moreSubstanceInput, setMoreSubstanceInput] = useState(""); const [moreLocationInput, setMoreLocationInput] = useState(""); const [moreMessage, setMoreMessage] = useState("");
  const [substancesExpanded, setSubstancesExpanded] = useState(true);
  const [locationsExpanded, setLocationsExpanded] = useState(true);
  const [editingSubstanceName, setEditingSubstanceName] = useState<string | null>(null); const [creatingSubstance, setCreatingSubstance] = useState(false); const [locationModalOpen, setLocationModalOpen] = useState(false); const [editingLocationName, setEditingLocationName] = useState<string | null>(null); const [locationEditor, setLocationEditor] = useState("");
  const [substanceEditor, setSubstanceEditor] = useState({ name: "", concentration: "", volume: "" });
  const presetFor = (name: string) => ({ ...getSubstancePreset(name), ...(substanceDetails[name] || {}) });
  const backupInputRef = useRef<HTMLInputElement>(null); const [backupMessage, setBackupMessage] = useState(""); const [backupBusy, setBackupBusy] = useState(false);
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30"); const [substanceFilter, setSubstanceFilter] = useState("all"); const [locationFilter, setLocationFilter] = useState("all"); const [showFilters, setShowFilters] = useState(false);

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const displayCalendarDays = useMemo(() => calendarExpanded ? calendarDays : getWeekDays(new Date(`${selectedDate || todayKey()}T12:00:00`)), [calendarExpanded, calendarDays, selectedDate]);
  const injectionsByDate = useMemo(() => { const map = new Map<string, Injection[]>(); injections.forEach(i => map.set(i.date, [...(map.get(i.date) || []), i])); return map; }, [injections]);
  const plansByDate = useMemo(() => {
    const map = new Map<string, ApplicationPlan[]>();
    [...calendarDays, ...displayCalendarDays].forEach(d => { const key = localDateKey(d); const active = plans.filter(p => isPlannedOnDate(p, key)); if (active.length) map.set(key, active); });
    return map;
  }, [calendarDays, displayCalendarDays, plans]);
  const selectedInjections = useMemo(() => selectedDate ? [...(injectionsByDate.get(selectedDate) || [])].sort((a,b) => b.date.localeCompare(a.date)) : [], [selectedDate, injectionsByDate]);
  const selectedPlans = useMemo(() => selectedDate ? plansByDate.get(selectedDate) || plans.filter(p => isPlannedOnDate(p, selectedDate)) : [], [selectedDate, plansByDate, plans]);
  const plannedForSelected = selectedPlans.filter(p => !selectedInjections.some(i => i.substance === p.substance));

  function exportBackup() {
    try {
      const data = useInjectionStore.getState();
      const backup = {
        app: "Diário Fitness",
        backupFormatVersion: 1,
        exportedAt: new Date().toISOString(),
        data: {
          injections: data.injections,
          substances: data.substances,
          locations: data.locations,
          plans: data.plans,
          substanceDetails: data.substanceDetails
        }
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `shot-track-backup-${todayKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage("Backup exportado. Transfira esse arquivo para o celular e importe-o no Shot Track.");
    } catch {
      setBackupMessage("Não foi possível exportar o backup. Tente novamente.");
    }
  }

  async function importBackup(file?: File) {
    if (!file) return;
    setBackupBusy(true);
    setBackupMessage("");
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("Arquivo inválido.");
      const root = parsed as Record<string, unknown>;
      if (root.app !== "Shot Track" || !root.data || typeof root.data !== "object") throw new Error("Este arquivo não parece ser um backup válido do Shot Track.");
      const data = root.data as Record<string, unknown>;
      if (!Array.isArray(data.injections) || !Array.isArray(data.substances) || !Array.isArray(data.locations) || !Array.isArray(data.plans)) {
        throw new Error("O backup está incompleto ou em um formato não reconhecido.");
      }
      if (![...data.injections, ...data.plans].every(item => item !== null && typeof item === "object" && !Array.isArray(item)) ||
          !data.substances.every(item => typeof item === "string") || !data.locations.every(item => typeof item === "string")) {
        throw new Error("O arquivo contém dados inválidos. Nenhum dado atual foi alterado.");
      }
      const summary = `${data.injections.length} aplicação(ões), ${data.plans.length} plano(s), ${data.substances.length} substância(s) e ${data.locations.length} local(is)`;
      const accepted = window.confirm(`Importar este backup?

Conteúdo: ${summary}.

A importação substituirá os dados atuais deste dispositivo. Recomendamos exportar um backup atual antes de continuar.`);
      if (!accepted) return;
      replaceAllData({
        injections: data.injections as Injection[],
        substances: data.substances as string[],
        locations: data.locations as string[],
        plans: data.plans as ApplicationPlan[],
        substanceDetails: (data.substanceDetails && typeof data.substanceDetails === "object" ? data.substanceDetails : {}) as Record<string, {brand:string;concentration:number;volume:number;applicationType:ApplicationType}>
      });
      setBackupMessage(`Backup importado com sucesso: ${summary}.`);
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : "Não foi possível importar esse arquivo.");
    } finally {
      setBackupBusy(false);
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  function getSuggestedLocation(plan: ApplicationPlan, date: string) {
    const candidates = plan.locationIds.length ? plan.locationIds : locations;
    if (!candidates.length) return "";

    // Rodízio é global: a sugestão considera as aplicações de TODOS os planos,
    // não apenas as aplicações da substância do plano atual. Assim, um local
    // usado recentemente por testosterona também fica temporariamente menos
    // prioritário para Masteron, por exemplo.
    const candidateSet = new Set(candidates);
    const lastByLocation = new Map<string, { date: string; order: number }>();

    injections.forEach((injection, index) => {
      if (injection.date > date || !candidateSet.has(injection.location)) return;
      const current = lastByLocation.get(injection.location);
      // injections is kept newest-first. For the same date, the lower index
      // represents the more recent registration.
      if (!current || injection.date > current.date || (injection.date === current.date && index < current.order)) {
        lastByLocation.set(injection.location, { date: injection.date, order: index });
      }
    });

    return [...candidates].sort((a, b) => {
      const aLast = lastByLocation.get(a);
      const bLast = lastByLocation.get(b);

      // Never prefer a recently used location over an older/unused candidate.
      // An unused location always comes first. Among used locations, the one
      // whose last use was furthest in the past comes first.
      if (!aLast && !bLast) return candidates.indexOf(a) - candidates.indexOf(b);
      if (!aLast) return -1;
      if (!bLast) return 1;
      if (aLast.date !== bLast.date) return aLast.date.localeCompare(bLast.date);
      return bLast.order - aLast.order;
    })[0];
  }

  const calendarStats = useMemo(() => { const key = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,"0")}`; const month = injections.filter(i=>i.date.startsWith(key)); return { count: month.length, volume: month.reduce((s,i)=>s+i.volume,0), days: new Set(month.map(i=>i.date)).size, planned: calendarDays.filter(d=>d.getMonth()===calendarMonth.getMonth() && plans.some(p=>isPlannedOnDate(p,localDateKey(d)) && !injections.some(i=>i.date===localDateKey(d) && i.substance===p.substance))).length }; }, [injections, calendarMonth, calendarDays, plans]);
  const filterSubstances = useMemo(() => [...new Set([...substances, ...injections.map(i=>i.substance.trim())].filter(Boolean))].sort(), [substances,injections]);
  const periodLabel = {"7":"7 dias","30":"30 dias","90":"90 dias",all:"Todo período"}[period];
  const cutoff = useMemo(() => { if(period==="all") return null; const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-(Number(period)-1)); return localDateKey(d); }, [period]);
  const filtered = useMemo(() => [...injections].filter(i=>!cutoff||i.date>=cutoff).filter(i=>substanceFilter==="all"||i.substance===substanceFilter).filter(i=>locationFilter==="all"||i.location===locationFilter).sort((a,b)=>b.date.localeCompare(a.date)), [injections,cutoff,substanceFilter,locationFilter]);
  const stats = useMemo(() => { const latest=[...injections].sort((a,b)=>b.date.localeCompare(a.date))[0]; return { lastDate:latest?.date,count:filtered.length,volume:filtered.reduce((s,i)=>s+i.volume,0),doses:filtered.reduce((s,i)=>s+i.concentration*i.volume,0)}; }, [filtered,injections]);
  const chartInjections = useMemo(() => { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-6); return injections.filter(i=>i.date>=localDateKey(d)); }, [injections]);

  function openCreate(date=todayKey(), preset?: { substance?: string; location?: string }, plan?: ApplicationPlan) {
    setEditing(null);
    setRegistrationPlan(plan || null);
    setAddingSubstance(false);
    setAddingLocation(false);
    const suggestedLocation = plan ? getSuggestedLocation(plan, date) : "";
    const base = emptyForm(
      plan?.substance || preset?.substance || substances[0] || "",
      suggestedLocation || preset?.location || locations[0] || ""
    );
    setForm({
      ...base,
      date,
      brand: plan ? (plan.brand || presetFor(plan.substance).brand) : base.brand,
      concentration: plan ? String(plan.concentration ?? "") : base.concentration,
      volume: plan ? String(plan.volume ?? "") : "",
      applicationType: plan?.applicationType || base.applicationType
    });
    setModalOpen(true);
  }
  function openEdit(item: Injection) { setEditing(item); setRegistrationPlan(null); setAddingSubstance(false); setAddingLocation(false); setForm({date:item.date,substance:item.substance,brand:item.brand||presetFor(item.substance).brand,concentration:String(item.concentration),volume:String(item.volume),applicationType:item.applicationType||"intramuscular",location:item.location,notes:item.notes,components:[]}); setModalOpen(true); }
  function closeModal(){setModalOpen(false);setEditing(null);setRegistrationPlan(null);setAddingSubstance(false);setAddingLocation(false);}
  function addNewSubstance(){const n=newSubstance.trim();if(!n)return;addSubstance(n);const preset=presetFor(n);setForm(f=>({...f,substance:n,brand:"",concentration:preset.concentration?String(preset.concentration):f.concentration}));setNewSubstance("");setAddingSubstance(false);}
  function addNewLocation(){const n=newLocation.trim();if(!n)return;addLocation(n);setForm(f=>({...f,location:n}));setNewLocation("");setAddingLocation(false);}
  function addSyringeComponent(){
    const fallback=substances.find(s=>s!==form.substance)||substances[0]||"";
    const preset=presetFor(fallback);
    setForm(f=>({...f,components:[...f.components,{planId:"",substance:f.substance===fallback?(substances.find(s=>s!==f.substance)||""):fallback,brand:"",concentration:preset.concentration?String(preset.concentration):"",volume:"",applicationType:f.applicationType}]}));
  }
  function updateSyringeComponent(index:number, patch:Partial<SyringeComponent>){setForm(f=>({...f,components:f.components.map((c,i)=>i===index?{...c,...patch}:c)}));}
  function selectSyringePlan(index:number, planId:string){
    const plan=plans.find(p=>p.id===planId);
    if(!plan){updateSyringeComponent(index,{planId:""});return;}
    updateSyringeComponent(index,{planId:plan.id,substance:plan.substance,brand:plan.brand||presetFor(plan.substance).brand,concentration:String(plan.concentration??""),volume:String(plan.volume??""),applicationType:plan.applicationType||"intramuscular"});
  }
  function selectSyringeSubstance(index:number, substance:string){
    const preset=presetFor(substance);
    updateSyringeComponent(index,{substance,planId:"",brand:"",concentration:preset.concentration?String(preset.concentration):""});
  }
  function removeSyringeComponent(index:number){setForm(f=>({...f,components:f.components.filter((_,i)=>i!==index)}));}
  function handleSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const concentration=Number(form.concentration),volume=Number(form.volume);if(!form.date||!form.substance||concentration<=0||volume<=0)return;const extras=form.components.map(c=>({substance:c.substance.trim(),brand:c.brand.trim(),concentration:Number(c.concentration),volume:Number(c.volume),applicationType:c.applicationType}));if(extras.some(c=>!c.substance||c.concentration<=0||c.volume<=0))return; if(editing){updateInjection(editing.id,{date:form.date,substance:form.substance.trim(),brand:form.brand.trim(),concentration,volume,applicationType:form.applicationType,location:form.location.trim(),notes:form.notes.trim(),syringeGroupId:editing.syringeGroupId});} else {const groupId=form.components.length?crypto.randomUUID():undefined; addInjection({date:form.date,substance:form.substance.trim(),brand:form.brand.trim(),concentration,volume,applicationType:form.applicationType,location:form.location.trim(),notes:form.notes.trim(),syringeGroupId:groupId}); extras.forEach(c=>addInjection({date:form.date,...c,location:form.location.trim(),notes:form.notes.trim(),syringeGroupId:groupId}));} setSelectedDate(form.date);setCalendarMonth(new Date(`${form.date}T12:00:00`));closeModal();}
  function openPlanCreate(){setEditingPlan(null);setPlanForm(emptyPlan(substances[0]||"",locations.slice(0,4)));setAddingPlanLocation(false);setNewPlanLocation("");setPlanModalOpen(true);}
  function openPlanEdit(plan:ApplicationPlan){setEditingPlan(plan);setAddingPlanLocation(false);setNewPlanLocation("");setPlanForm({name:plan.name,substance:plan.substance,brand:plan.brand||presetFor(plan.substance).brand,concentration:String(plan.concentration||""),volume:String(plan.volume||""),applicationType:plan.applicationType||"intramuscular",startDate:plan.startDate,endDate:plan.endDate||"",frequencyType:plan.frequencyType,intervalDays:String(plan.intervalDays),weekdays:plan.weekdays,locationIds:plan.locationIds});setPlanModalOpen(true);}
  function addPlanLocation(){const n=newPlanLocation.trim();if(!n)return;addLocation(n);setPlanForm(f=>({...f,locationIds:Array.from(new Set([...f.locationIds,n]))}));setNewPlanLocation("");setAddingPlanLocation(false);}
  function handlePlanSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!planForm.name.trim()||!planForm.substance||!planForm.startDate||!planForm.locationIds.length||(planForm.endDate && planForm.endDate < planForm.startDate))return;const payload={name:planForm.name.trim(),substance:planForm.substance,brand:planForm.brand.trim(),concentration:Math.max(0,Number(planForm.concentration)||0),volume:Math.max(0,Number(planForm.volume)||0),applicationType:planForm.applicationType,startDate:planForm.startDate,endDate:planForm.endDate,frequencyType:planForm.frequencyType,intervalDays:Math.max(1,Number(planForm.intervalDays)||1),weekdays:planForm.weekdays,locationIds:planForm.locationIds,active:true};if(editingPlan)updatePlan(editingPlan.id,payload);else addPlan(payload);setPlanModalOpen(false);}
  function togglePlanWeekday(day:number){setPlanForm(p=>({...p,weekdays:p.weekdays.includes(day)?p.weekdays.filter(x=>x!==day):[...p.weekdays,day]}));}
  function togglePlanLocation(location:string){setPlanForm(p=>({...p,locationIds:p.locationIds.includes(location)?p.locationIds.filter(x=>x!==location):[...p.locationIds,location]}));}
  function changeMonth(delta:number){
    // Na visualização semanal, as setas avançam exatamente uma semana.
    // Na visualização mensal, continuam navegando um mês por vez.
    if (!calendarExpanded) {
      const base = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
      base.setDate(base.getDate() + delta * 7);
      const nextDate = localDateKey(base);
      setSelectedDate(nextDate);
      setCalendarMonth(new Date(base.getFullYear(), base.getMonth(), 1));
      return;
    }

    setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    setSelectedDate(current => {
      const base = current ? new Date(`${current}T12:00:00`) : new Date();
      const nextMonth = new Date(base.getFullYear(), base.getMonth() + delta, 1);
      const day = Math.min(base.getDate(), new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());
      nextMonth.setDate(day);
      return localDateKey(nextMonth);
    });
  }
  const dose=(Number(form.concentration)||0)*(Number(form.volume)||0);
  const syringeTotalVolume = form.components.reduce((sum,c)=>sum+(Number(c.volume)||0), Number(form.volume)||0);
  const syringeTotalDose = form.components.reduce((sum,c)=>sum+(Number(c.concentration)||0)*(Number(c.volume)||0), dose);
  const selectedSummary = selectedInjections.length
    ? `${selectedInjections.length} ${selectedInjections.length === 1 ? "aplicação registrada" : "aplicações registradas"}`
    : "Nenhuma aplicação registrada";
  const plannedSummary = selectedPlans.length
    ? `${selectedPlans.length} planejada${selectedPlans.length === 1 ? "" : "s"}`
    : "sem aplicação planejada";

  if (authLoading) return <main className="auth-shell"><section className="auth-card auth-loading"><img className="auth-logo" src="/icons/shot-track-192.png" alt="Logo Diário Fitness"/><div className="auth-spinner"/><p>Carregando sua conta…</p></section></main>;

  if (!authUser) return <main className="auth-shell"><section className="auth-card"><img className="auth-logo" src="/icons/shot-track-192.png" alt="Logo Diário Fitness"/><div className="auth-brand-title">DIÁRIO FITNESS</div><p className="auth-subtitle">Sua rotina. Sua evolução.</p><h1 className="auth-title">{authMode === "login" ? "Entrar na sua conta" : "Criar sua conta"}</h1><p className="auth-description">{authMode === "login" ? "Acesse para continuar usando o Diário Fitness." : "Crie sua conta com e-mail e senha."}</p><form className="auth-form" onSubmit={submitAuth}>{authMode === "signup" && <label className="auth-field"><span><UserRound size={15}/> Nome</span><input type="text" autoComplete="name" value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Como podemos chamar você?" maxLength={80} required/></label>}<label className="auth-field"><span><Mail size={15}/> E-mail</span><input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="voce@exemplo.com" required/></label><label className="auth-field"><span><LockKeyhole size={15}/> Senha</span><input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" minLength={6} required/></label>{authMessage && <div className="auth-message" role="alert">{authMessage}</div>}<button className="primary-button auth-submit" type="submit" disabled={authBusy}>{authBusy ? "Aguarde…" : authMode === "login" ? "Entrar" : "Criar conta"}</button></form>{authMode === "login" && <button className="auth-text-button" type="button" onClick={resetPassword} disabled={authBusy}>Esqueci minha senha</button>}<div className="auth-switch">{authMode === "login" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}<button className="auth-text-button" type="button" onClick={()=>{setAuthMode(authMode === "login" ? "signup" : "login");setAuthMessage("");}}>{authMode === "login" ? "Criar conta" : "Entrar"}</button></div><p className="auth-local-note"><ShieldCheck size={14}/> Seus registros continuam armazenados neste dispositivo. O login não sincroniza aplicações entre aparelhos.</p></section></main>;

  return <main className="app-shell" data-view={activeTab}><div className="container">
    <header className="header"><div className="brand"><img className="brand-mark" src="/icons/shot-track-192.png" alt="Logo Diário Fitness" /><div><h1 className="brand-title">DIÁRIO FITNESS</h1><p className="brand-subtitle">Sua rotina. Sua evolução.</p><p className="signed-in-email">Olá, {authUser.displayName?.trim() || authUser.email?.split("@")[0] || "usuário"}. Seja bem-vindo.</p></div></div></header>

    <section className="stats home-stats"><div className="card stat-card"><div className="stat-label">Última aplicação</div><div className="stat-value">{stats.lastDate?formatDate(stats.lastDate):"—"}</div></div><div className="card stat-card"><div className="stat-label">Volume · {periodLabel}</div><div className="stat-value">{formatNumber(stats.volume)} mL</div></div><div className="card stat-card"><div className="stat-label">Aplicações · {periodLabel}</div><div className="stat-value">{stats.count}</div></div><div className="card stat-card"><div className="stat-label">Dose registrada · {periodLabel}</div><div className="stat-value">{formatNumber(stats.doses)} mg</div></div></section>

    <section className="card next-application-card home-only">
      <div className="next-app-kicker"><Repeat2 size={15}/> PLANO DE APLICAÇÃO</div>
      {plans.filter(p=>p.active).length ? <><div className="next-app-title">{plans.filter(p=>p.active)[0].name}</div><div className="next-app-meta">{plans.filter(p=>p.active)[0].substance} · {formatNumber(plans.filter(p=>p.active)[0].concentration*plans.filter(p=>p.active)[0].volume)} mg previstos</div><div className="next-app-meta">{plans.filter(p=>p.active)[0].applicationType==="subcutaneous"?"Subcutânea":"Intramuscular"} · {plans.filter(p=>p.active)[0].locationIds.length} locais no rodízio</div><button className="primary-button next-app-button" onClick={()=>openCreate(todayKey(),undefined,plans.filter(p=>p.active)[0])}><Plus size={17}/> Registrar aplicação</button></> : <><div className="next-app-title">Organize suas aplicações</div><div className="next-app-meta">Crie um plano para acompanhar datas e rodízio de locais.</div><button className="primary-button next-app-button" onClick={openPlanCreate}><Plus size={17}/> Criar primeiro plano</button></>}
    </section>

    <section className="card calendar-card view-calendar"><div className="calendar-header"><div><h2 className="section-title">Calendário</h2><p className="section-subtitle">Ver aplicações registradas e planejadas</p></div><div className="calendar-nav"><button className="icon-button" onClick={()=>changeMonth(-1)} aria-label="Período anterior"><ChevronLeft size={18}/></button><strong>{calendarExpanded ? monthTitle(calendarMonth) : (()=>{const days=displayCalendarDays;return days.length ? `${formatDate(localDateKey(days[0])).slice(0,5)} – ${formatDate(localDateKey(days[6])).slice(0,5)}` : monthTitle(calendarMonth)})()}</strong><button className="icon-button" onClick={()=>changeMonth(1)} aria-label="Próximo período"><ChevronRight size={18}/></button></div></div>
      <div className="calendar-weekdays">{weekdayLabels.map(d=><span key={d}>{d}</span>)}</div><div className={`calendar-grid ${calendarExpanded ? "month-view" : "week-view"}`}>{displayCalendarDays.map(day=>{const key=localDateKey(day),isCurrent=!calendarExpanded||day.getMonth()===calendarMonth.getMonth(),isToday=key===todayKey(),isSelected=key===selectedDate,dayInjections=injectionsByDate.get(key)||[],count=dayInjections.length,planned=(plansByDate.get(key)||[]).filter(p=>!dayInjections.some(i=>i.substance===p.substance)).length;return <div key={key} className="calendar-cell"><button type="button" className={`calendar-day ${!isCurrent?"outside":""} ${isToday?"today":""} ${isSelected?"selected":""}`} onClick={()=>{setSelectedDate(key);setCalendarMonth(new Date(day.getFullYear(),day.getMonth(),1));}} aria-label={`Selecionar ${formatDate(key)}`}><span className="calendar-date-number">{day.getDate()}</span><span className="calendar-marks">{count>0&&<span className="calendar-mark done" aria-label={`${count} realizadas`} />}{planned>0&&<span className="calendar-mark planned" aria-label={`${planned} planejadas`} />}</span></button></div>})}</div>
      <div className="calendar-controls"><div className="calendar-legend"><span><i className="legend-dot done-dot"/> Realizada</span><span><i className="legend-dot planned-dot"/> Planejada</span></div><button className="secondary-button calendar-expand-button" onClick={()=>setCalendarExpanded(v=>!v)}>{calendarExpanded ? "Ver semana" : "Ver mês completo"} <CalendarDays size={15}/></button></div>{calendarExpanded&&<div className="calendar-summary"><span><strong>{calendarStats.count}</strong> aplicações</span><span><strong>{calendarStats.days}</strong> dias registrados</span><span><strong>{calendarStats.planned}</strong> dias planejados</span><span><strong>{formatNumber(calendarStats.volume)}</strong> mL</span></div>}
    </section>

    <section className="advertisement-banner" aria-label="Publicidade">
      <a href="https://kingshape.fit/" className="advertisement-banner-link" aria-label="Conheça a King Shape" target="_blank" rel="noopener noreferrer">
        <img src="/king-shape-banner.webp" alt="King Shape — Força, foco e evolução" />
      </a>
      <span className="advertisement-label">Publicidade</span>
    </section>

    {selectedDate&&<section className="selected-day card view-calendar"><div className="selected-day-header"><div><h2 className="section-title">{selectedDate===todayKey()?`Hoje · ${formatDate(selectedDate)}`:formatDate(selectedDate)}</h2><p className="section-subtitle">{selectedSummary}: {plannedSummary}</p></div><button className="primary-button" onClick={()=>openCreate(selectedDate)}><Plus size={16}/> Registrar neste dia</button></div>
      {plannedForSelected.map(plan=>{const suggestion=getSuggestedLocation(plan,selectedDate);return <div className="planned-card" key={plan.id}><div className="planned-icon"><Repeat2 size={18}/></div><div className="planned-main"><div className="planned-title"><strong>{plan.substance}</strong><span className="planned-badge">Planejada</span></div><div className="planned-meta"><span><MapPin size={13} aria-hidden="true"/> Local sugerido: <strong>{suggestion||"nenhum local"}</strong></span><span><Syringe size={13} aria-hidden="true"/> Dose planejada: <strong>{formatNumber(plan.concentration*plan.volume)} mg</strong></span><span><Tag size={13} aria-hidden="true"/> {plan.brand || "Sem marca"}</span><span>{plan.applicationType === "subcutaneous" ? <><CircleDot size={13} aria-hidden="true"/> Subcutânea</> : <><Syringe size={13} aria-hidden="true"/> Intramuscular</>}</span></div></div><button className="secondary-button compact" onClick={()=>openCreate(selectedDate,{substance:plan.substance,location:suggestion},plan)}><CheckCircle2 size={15}/> Registrar</button></div>})}
      {selectedInjections.length>0&&<div className="selected-day-list">{selectedInjections.map(item=><div className="day-record" key={item.id}><div className="day-record-main"><div className="day-record-title"><span className="history-name">{item.substance}</span>{item.syringeGroupId&&<span className="planned-badge">Mesma seringa</span>}</div><div className="day-record-meta day-record-meta-lines"><span><Droplet size={14}/> Volume: {formatNumber(item.volume)} mL</span><span><Activity size={14}/> Dose: {formatNumber(item.concentration*item.volume)} mg</span><span><MapPin size={14}/> Local: {item.location}</span><span><Tag size={14}/> Marca: {item.brand || "Sem marca"}</span><span>{item.applicationType === "subcutaneous" ? <CircleDot size={14}/> : <Syringe size={14}/>} Via: {item.applicationType === "subcutaneous" ? "Subcutânea" : "Intramuscular"}</span></div></div><div className="history-actions day-record-actions"><button className="icon-button" onClick={()=>openEdit(item)} aria-label="Editar"><Pencil size={16}/></button></div></div>)}</div>}
    </section>}

    <section className="card plans-section view-plans"><div className="plans-heading"><div className="plans-heading-copy"><h2 className="section-title">Planos de aplicações</h2><p className="section-subtitle">Organize datas previstas sem transformar o planejamento em registro realizado.</p></div><button className="primary-button create-plan-button" onClick={openPlanCreate}><Plus size={17}/> Criar plano</button></div>{plans.length===0?<div className="empty small"><Repeat2 size={25}/><p>Nenhum plano criado. Você pode configurar uma frequência e os locais que participam do rodízio.</p></div>:<div className="plans-list">{plans.map(plan=><article className="plan-item" key={plan.id}><div className="plan-icon"><Repeat2 size={18}/></div><div className="plan-main"><div className="history-top"><strong>{plan.name || plan.substance} {formatNumber(plan.concentration * plan.volume)} mg</strong></div><div className="history-meta plan-meta-lines"><span><CalendarDays size={14}/> Início: {formatDate(plan.startDate)}</span>{plan.endDate&&<span><CalendarDays size={14}/> Fim: {formatDate(plan.endDate)}</span>}<span><Repeat2 size={14}/> {plan.frequencyType==="every_n_days"?`A cada ${plan.intervalDays} dias`:`Dias: ${plan.weekdays.map(d=>weekdayLabels[weekdayValues.indexOf(d)]).join(", ")}`}</span><span>{plan.applicationType === "subcutaneous" ? <CircleDot size={14}/> : <Syringe size={14}/>} {plan.applicationType === "subcutaneous" ? "Subcutânea" : "Intramuscular"}</span><span><Tag size={14}/> {plan.brand || "Sem marca"}</span></div></div><div className="history-actions"><button className="icon-button" onClick={()=>openPlanEdit(plan)} aria-label="Editar plano"><Pencil size={16}/></button></div></article>)}</div>}</section>

    <section className="dashboard-card card view-history"><div className="dashboard-heading"><div><h2 className="section-title">Aplicações</h2><p className="section-subtitle">Últimos 7 dias</p></div><span className="period-pill">{chartInjections.length} registros</span></div><div className="chart">{Array.from({length:7},(_,index)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(6-index));const key=localDateKey(d),value=chartInjections.filter(i=>i.date===key).length;const max=Math.max(...Array.from({length:7},(_,i)=>{const x=new Date();x.setHours(12,0,0,0);x.setDate(x.getDate()-(6-i));return chartInjections.filter(it=>it.date===localDateKey(x)).length}),1);return <div className="chart-column" key={key}><div className="chart-value">{value||""}</div><div className="chart-bar-wrap"><div className={`chart-bar ${value ? "has-value" : "no-value"}`} style={{height:`${value?Math.max((value/max)*100,10):4}%`}}/></div><div className="chart-label">{new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit"}).format(d)}</div></div>})}</div></section>

    <section className="history view-history"><div className="history-heading"><div><h2 className="section-title">Histórico</h2><p className="section-subtitle">{filtered.length} {filtered.length===1?"registro":"registros"} exibidos</p></div><button className={`secondary-button filter-button ${substanceFilter!=="all"||locationFilter!=="all"||period!=="30"?"active":""}`} onClick={()=>setShowFilters(!showFilters)}><Filter size={16}/> Filtros</button></div>{showFilters&&<div className="card filters"><div className="filter-field"><label className="label">Período</label><select className="select" value={period} onChange={e=>setPeriod(e.target.value as typeof period)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo período</option></select></div><div className="filter-field"><label className="label">Substância</label><select className="select" value={substanceFilter} onChange={e=>setSubstanceFilter(e.target.value)}><option value="all">Todas</option>{filterSubstances.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div className="filter-field"><label className="label">Local</label><select className="select" value={locationFilter} onChange={e=>setLocationFilter(e.target.value)}><option value="all">Todos</option>{locations.map(l=><option key={l}>{l}</option>)}</select></div><button className="clear-filter" onClick={()=>{setPeriod("30");setSubstanceFilter("all");setLocationFilter("all")}}>Limpar filtros</button></div>}<div className="card">{filtered.length===0?<div className="empty"><Filter size={28}/><p>Nenhum registro encontrado com esses filtros.</p></div>:filtered.map(item=><article className="history-item" key={item.id}><div className="history-icon"><Syringe size={20}/></div><div className="history-main"><div className="history-top"><span className="history-name">{item.substance}</span>{item.syringeGroupId&&<span className="planned-badge">Mesma seringa</span>}</div><div className="history-meta history-meta-lines"><span><CalendarDays size={14}/> {formatDate(item.date)}</span><span><MapPin size={14}/> {item.location}</span><span><Droplet size={14}/> Volume: {formatNumber(item.volume)} mL</span><span>{item.applicationType === "subcutaneous" ? <CircleDot size={14}/> : <Syringe size={14}/>} {item.applicationType === "subcutaneous" ? "Subcutânea" : "Intramuscular"}</span><span><Tag size={14}/> {item.brand || "Sem marca"}</span><span><Activity size={14}/> Dose: {formatNumber(item.concentration*item.volume)} mg</span></div>{item.notes&&<div className="history-notes">{item.notes}</div>}</div><div className="history-actions"><button className="icon-button" onClick={()=>openEdit(item)} aria-label="Editar"><Pencil size={17}/></button></div></article>)}</div></section>


    <section className="view-more more-page">
      <div className="more-page-heading"><h2 className="section-title">Mais</h2><p className="section-subtitle">Gerencie as opções usadas nos registros e nos planos.</p></div>
      <section className="card theme-settings-card">
        <div className="theme-settings-copy"><div className="more-management-icon">{theme === "light" ? <Sun size={20}/> : <Moon size={20}/>}</div><div><h3>Aparência</h3><p className="section-subtitle">Escolha entre o modo claro e o modo escuro.</p></div></div>
        <div className="theme-choice-row"><button type="button" className={`theme-choice ${theme === "light" ? "selected" : ""}`} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={17}/> Claro</button><button type="button" className={`theme-choice ${theme === "dark" ? "selected" : ""}`} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={17}/> Escuro</button></div>
      </section>
      {moreMessage && <p className="backup-message" role="status">{moreMessage}</p>}
      <section className="card more-management-card">
        <button type="button" className="more-management-heading more-management-toggle" aria-expanded={substancesExpanded} onClick={()=>setSubstancesExpanded(v=>!v)}><div className="more-management-icon"><FlaskConical size={20}/></div><div className="more-management-title"><h3>Substâncias</h3><p className="section-subtitle">Adicione substâncias personalizadas para usar nos registros e planos.</p></div><ChevronDown className={`collapse-chevron ${substancesExpanded?"expanded":""}`} size={20}/></button>
        <div className="more-add-form"><button className="primary-button" type="button" onClick={()=>{setEditingSubstanceName(null);setCreatingSubstance(true);setSubstanceEditor({name:"",concentration:"",volume:""});setMoreMessage("");}}><Plus size={16}/> Adicionar substância</button></div>
        {substancesExpanded && <div className="more-managed-list">{[...substances].sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"})).map(item=><div className="more-managed-row" key={item}><div className="more-managed-main"><span>{item}</span>{presetFor(item).concentration>0 && <span className="substance-brand-tag">{formatNumber(presetFor(item).concentration)} mg/mL</span>}</div><div className="more-row-actions"><button className="icon-button" aria-label={`Editar ${item}`} onClick={()=>{const d=presetFor(item);setCreatingSubstance(false);setEditingSubstanceName(item);setSubstanceEditor({name:item,concentration:d.concentration?String(d.concentration):"",volume:d.volume?String(d.volume):""});}}><Pencil size={15}/></button></div></div>)}</div>}
      </section>
      <section className="card more-management-card">
        <button type="button" className="more-management-heading more-management-toggle" aria-expanded={locationsExpanded} onClick={()=>setLocationsExpanded(v=>!v)}><div className="more-management-icon"><MapPinned size={20}/></div><div className="more-management-title"><h3>Locais</h3><p className="section-subtitle">Gerencie os locais disponíveis para registros e rodízio dos planos.</p></div><ChevronDown className={`collapse-chevron ${locationsExpanded?"expanded":""}`} size={20}/></button>
        <div className="more-add-form"><button className="primary-button" type="button" onClick={()=>{setEditingLocationName(null);setLocationEditor("");setLocationModalOpen(true);setMoreMessage("");}}><Plus size={16}/> Adicionar local</button></div>
        {locationsExpanded && <div className="more-managed-list">{[...locations].sort((a,b)=>a.localeCompare(b,"pt-BR",{sensitivity:"base"})).map(item=><div className="more-managed-row" key={item}><span>{item}</span><div className="more-row-actions"><button className="icon-button" aria-label={`Editar ${item}`} onClick={()=>{setEditingLocationName(item);setLocationEditor(item);setLocationModalOpen(true);setMoreMessage("");}}><Pencil size={15}/></button></div></div>)}</div>}
      </section>
      <section className="card backup-tools more-backup-card"><div className="dashboard-heading"><div><h3>Backup e transferência</h3><p className="section-subtitle">Transfira seus dados para outro dispositivo.</p></div><ShieldCheck size={22} className="backup-shield"/></div><div className="backup-actions"><button className="secondary-button" onClick={exportBackup}><Download size={16}/> Exportar backup</button><button className="primary-button" disabled={backupBusy} onClick={()=>backupInputRef.current?.click()}><Upload size={16}/> {backupBusy?"Importando...":"Importar backup"}</button><input ref={backupInputRef} type="file" accept=".json,application/json" className="backup-file-input" onChange={e=>void importBackup(e.target.files?.[0])}/></div><p className="helper-text">O arquivo inclui aplicações, planos, substâncias e locais. A importação substitui os dados atuais após confirmação.</p>{backupMessage&&<p className="backup-message" role="status">{backupMessage}</p>}</section>
      <section className="card more-account-card"><div className="dashboard-heading"><div><h3>Conta</h3><p className="section-subtitle">Conectado como {authUser.email}. Saia apenas quando precisar acessar outra conta.</p></div></div><button className="secondary-button more-signout-button" onClick={()=>signOut(firebaseAuth)}><LogOut size={16}/> Sair da conta</button></section>
    </section>

  </div>

  <nav className="mobile-tabbar" aria-label="Navegação principal">
    <button className={activeTab==="calendar"?"active":""} onClick={()=>setActiveTab("calendar")}><CalendarDays size={20}/><span>Calendário</span></button>
    <button className={activeTab==="plans"?"active":""} onClick={()=>setActiveTab("plans")}><Repeat2 size={20}/><span>Planos</span></button>
    <button className={activeTab==="history"?"active":""} onClick={()=>setActiveTab("history")}><History size={20}/><span>Histórico</span></button>
    <button className={activeTab==="more"?"active":""} onClick={()=>setActiveTab("more")}><MoreHorizontal size={20}/><span>Mais</span></button>
  </nav>

  {modalOpen&&<div className="overlay" onMouseDown={closeModal}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">{editing?"Editar aplicação":"Nova aplicação"}</h2><p className="modal-subtitle">{registrationPlan ? "Registro iniciado a partir de um plano. O local sugerido pode ser alterado sem alterar o plano." : "Registre os dados exatamente como foram realizados."}</p></div><button className="icon-button" onClick={closeModal} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={handleSubmit}><div className="form-grid"><label className="field"><span className="label">Data</span><input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></label><div className="field"><span className="label">Substância</span>{!addingSubstance?<><select className="select" value={form.substance} onChange={e=>{const substance=e.target.value;const preset=presetFor(substance);setForm({...form,substance,brand:"",concentration:preset.concentration?String(preset.concentration):"",volume:preset.volume?String(preset.volume):"",applicationType:"intramuscular"})}} required><option value="" disabled>Selecione uma substância</option>{substances.map(s=>{const preset=presetFor(s);return <option key={s} value={s}>{s}{preset.concentration?` · ${formatNumber(preset.concentration)} mg/mL`:""}</option>})}</select><button type="button" className="add-option-button" onClick={()=>setAddingSubstance(true)}><Plus size={14}/> Adicionar nova substância</button></>:<div className="inline-add"><input className="input" autoFocus placeholder="Nome da substância" value={newSubstance} onChange={e=>setNewSubstance(e.target.value)}/><div className="inline-actions"><button type="button" className="secondary-button" onClick={()=>setAddingSubstance(false)}>Cancelar</button><button type="button" className="primary-button" onClick={addNewSubstance}>Adicionar</button></div></div>}</div><label className="field"><span className="label">Marca</span><input className="input" placeholder="Ex.: ZPCH" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label><label className="field"><span className="label">Concentração (mg/mL)</span><input className="input" type="number" min="0" step="0.01" placeholder="250" value={form.concentration} onChange={e=>setForm({...form,concentration:e.target.value})} required/></label><label className="field"><span className="label">Volume (mL)</span><input className="input" type="number" min="0" step="0.01" placeholder="0,20" value={form.volume} onChange={e=>setForm({...form,volume:e.target.value})} required/></label><label className="field"><span className="label">Tipo de aplicação</span><select className="select" value={form.applicationType} onChange={e=>setForm({...form,applicationType:e.target.value as ApplicationType})} required><option value="intramuscular">Intramuscular</option><option value="subcutaneous">Subcutânea</option></select></label><div className="field"><span className="label">Local {registrationPlan&&<span className="field-hint">(sugestão do plano, editável)</span>}</span>{!addingLocation?<><select className="select" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}>{locations.map(l=><option key={l}>{l}</option>)}</select><button type="button" className="add-option-button" onClick={()=>setAddingLocation(true)}><Plus size={14}/> Adicionar novo local</button></>:<div className="inline-add"><input className="input" autoFocus placeholder="Nome do local" value={newLocation} onChange={e=>setNewLocation(e.target.value)}/><div className="inline-actions"><button type="button" className="secondary-button" onClick={()=>setAddingLocation(false)}>Cancelar</button><button type="button" className="primary-button" onClick={addNewLocation}>Adicionar</button></div></div>}</div>{!editing&&<div className="same-syringe-section"><div className="same-syringe-heading"><div><span className="label">Mesma seringa</span><p className="helper-text">Adicione outra substância ou selecione um plano existente para registrar no mesmo local, na mesma data e na mesma seringa.</p></div><button type="button" className="add-option-button" onClick={addSyringeComponent}><Plus size={14}/> Adicionar substância / plano</button></div>{form.components.map((component,index)=><div className="syringe-component" key={index}><div className="syringe-component-title"><strong>Componente {index+2}</strong><button type="button" className="icon-button delete" onClick={()=>removeSyringeComponent(index)} aria-label="Remover substância"><Trash2 size={15}/></button></div><div className="form-grid nested">{plans.length>0&&<label className="field full"><span className="label">Plano existente <span className="field-hint">(opcional)</span></span><select className="select" value={component.planId} onChange={e=>selectSyringePlan(index,e.target.value)}><option value="">Registro manual</option>{plans.filter(p=>p.id!==registrationPlan?.id).map(p=><option key={p.id} value={p.id}>{p.name} · {p.substance}</option>)}</select><small className="helper-text">Ao selecionar um plano, a substância, concentração e volume são preenchidos automaticamente. Você ainda pode ajustar os dados antes de salvar.</small></label>}<label className="field"><span className="label">Substância</span><select className="select" value={component.substance} onChange={e=>selectSyringeSubstance(index,e.target.value)} required><option value="" disabled>Selecione</option>{substances.map(s=>{const preset=presetFor(s);return <option key={s} value={s}>{s}{preset.concentration?` · ${formatNumber(preset.concentration)} mg/mL`:""}</option>})}</select></label><label className="field"><span className="label">Marca</span><input className="input" placeholder="Ex.: ZPCH" value={component.brand} onChange={e=>updateSyringeComponent(index,{brand:e.target.value})}/></label><label className="field"><span className="label">Concentração (mg/mL)</span><input className="input" type="number" min="0" step="0.01" value={component.concentration} onChange={e=>updateSyringeComponent(index,{concentration:e.target.value})} required/></label><label className="field"><span className="label">Volume (mL)</span><input className="input" type="number" min="0" step="0.01" value={component.volume} onChange={e=>updateSyringeComponent(index,{volume:e.target.value})} required/></label><label className="field"><span className="label">Tipo de aplicação</span><select className="select" value={component.applicationType} onChange={e=>updateSyringeComponent(index,{applicationType:e.target.value as ApplicationType})} required><option value="intramuscular">Intramuscular</option><option value="subcutaneous">Subcutânea</option></select></label><div className="dose-preview"><span className="dose-label">Dose</span><span className="dose-value">{formatNumber((Number(component.concentration)||0)*(Number(component.volume)||0))} mg</span></div></div></div>)}</div>}
      <div className="dose-preview"><span className="dose-label">{form.components.length ? `Total da seringa · ${formatNumber(syringeTotalVolume)} mL` : "Dose calculada apenas para registro"}</span><span className="dose-value">{formatNumber(syringeTotalDose)} mg</span></div><label className="field full"><span className="label">Observações</span><textarea className="textarea" placeholder="Opcional" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><div className="modal-footer edit-record-footer">{editing&&<button type="button" className="danger-button" onClick={()=>setDeleteTarget(editing)}><Trash2 size={16}/> Excluir registro</button>}<div className="edit-record-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancelar</button><button type="submit" className="primary-button">{editing?"Salvar alterações":"Salvar aplicação"}</button></div></div></form></div></div>}

  {planModalOpen&&<div className="overlay" onMouseDown={()=>setPlanModalOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">{editingPlan?"Editar plano":"Novo plano de aplicações"}</h2><p className="modal-subtitle">O plano marca datas no calendário; ele não cria registros automaticamente.</p></div><button className="icon-button" onClick={()=>setPlanModalOpen(false)} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={handlePlanSubmit}><div className="form-grid"><label className="field full"><span className="label">Nome do plano</span><input className="input" placeholder="Ex.: Plano de aplicações" value={planForm.name} onChange={e=>setPlanForm({...planForm,name:e.target.value})} required/></label><label className="field"><span className="label">Substância</span><select className="select" value={planForm.substance} onChange={e=>{const substance=e.target.value;const preset=presetFor(substance);setPlanForm({...planForm,substance,brand:"",concentration:preset.concentration?String(preset.concentration):"",volume:preset.volume?String(preset.volume):"",applicationType:"intramuscular"})}} required>{substances.map(s=>{const preset=presetFor(s);return <option key={s} value={s}>{s}{preset.concentration?` · ${formatNumber(preset.concentration)} mg/mL`:""}</option>})}</select></label><label className="field"><span className="label">Marca</span><input className="input" placeholder="Ex.: ZPCH" value={planForm.brand} onChange={e=>setPlanForm({...planForm,brand:e.target.value})}/></label><label className="field"><span className="label">Concentração (mg/mL)</span><input className="input" type="number" min="0" step="0.01" placeholder="Ex.: 250" value={planForm.concentration} onChange={e=>setPlanForm({...planForm,concentration:e.target.value})} required/></label><label className="field"><span className="label">Volume (mL)</span><input className="input" type="number" min="0" step="0.01" placeholder="Ex.: 0,20" value={planForm.volume} onChange={e=>setPlanForm({...planForm,volume:e.target.value})} required/><div className="dose-preview"><span className="dose-label">Dose planejada</span><span className="dose-value">{formatNumber((Number(planForm.concentration)||0)*(Number(planForm.volume)||0))} mg</span></div></label><label className="field"><span className="label">Tipo de aplicação</span><select className="select" value={planForm.applicationType} onChange={e=>setPlanForm({...planForm,applicationType:e.target.value as ApplicationType})} required><option value="intramuscular">Intramuscular</option><option value="subcutaneous">Subcutânea</option></select></label><label className="field"><span className="label">Data de início</span><input className="input" type="date" value={planForm.startDate} onChange={e=>setPlanForm({...planForm,startDate:e.target.value,...(planForm.endDate && planForm.endDate < e.target.value ? {endDate:""} : {})})} required/></label><label className="field"><span className="label">Data final <span className="field-hint">(opcional)</span></span><input className="input" type="date" min={planForm.startDate} value={planForm.endDate} onChange={e=>setPlanForm({...planForm,endDate:e.target.value})}/><small className="helper-text">O plano deixa de aparecer no calendário após essa data.</small></label><div className="field full"><span className="label">Frequência</span><div className="segmented"><button type="button" className={planForm.frequencyType==="every_n_days"?"active":""} onClick={()=>setPlanForm({...planForm,frequencyType:"every_n_days"})}>A cada X dias</button><button type="button" className={planForm.frequencyType==="weekdays"?"active":""} onClick={()=>setPlanForm({...planForm,frequencyType:"weekdays"})}>Dias da semana</button></div></div>{planForm.frequencyType==="every_n_days"?<label className="field"><span className="label">Intervalo em dias</span><input className="input" type="number" min="1" step="1" value={planForm.intervalDays} onChange={e=>setPlanForm({...planForm,intervalDays:e.target.value})}/></label>:<div className="field full"><span className="label">Dias</span><div className="weekday-picker">{weekdayLabels.map((label,i)=>{const value=weekdayValues[i];return <button type="button" key={label} className={planForm.weekdays.includes(value)?"selected":""} onClick={()=>togglePlanWeekday(value)}>{label}</button>})}</div></div>}<div className="field full"><span className="label">Locais participantes do rodízio</span>{!addingPlanLocation?<><div className="location-picker">{locations.map(location=><button type="button" key={location} className={planForm.locationIds.includes(location)?"selected":""} onClick={()=>togglePlanLocation(location)}><MapPin size={14}/>{location}</button>)}</div><button type="button" className="add-option-button" onClick={()=>setAddingPlanLocation(true)}><Plus size={14}/> Adicionar novo local</button></>:<div className="inline-add"><input className="input" autoFocus placeholder="Nome do local" value={newPlanLocation} onChange={e=>setNewPlanLocation(e.target.value)}/><div className="inline-actions"><button type="button" className="secondary-button" onClick={()=>{setAddingPlanLocation(false);setNewPlanLocation("")}}>Cancelar</button><button type="button" className="primary-button" onClick={addPlanLocation}>Adicionar</button></div></div>}<small className="helper-text">Você pode selecionar vários locais e cadastrar um novo local sem sair do plano. A dose é calculada por concentração × volume, como no registro manual. A sugestão considera os registros anteriores de todos os planos e prioriza o local usado há mais tempo.</small></div></div><div className="modal-footer plan-modal-footer">{editingPlan&&<button type="button" className="danger-button plan-delete-button" onClick={()=>setDeletePlanTarget(editingPlan)}><Trash2 size={16}/> Excluir plano</button>}<div className="plan-modal-actions"><button type="button" className="secondary-button" onClick={()=>setPlanModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">{editingPlan?"Salvar plano":"Criar plano"}</button></div></div></form></div></div>}

  {(editingSubstanceName || creatingSubstance) && <div className="overlay" onMouseDown={()=>{setEditingSubstanceName(null);setCreatingSubstance(false);}}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">{creatingSubstance?"Adicionar substância":"Editar substância"}</h2><p className="modal-subtitle">Configure os valores sugeridos ao criar novos registros e planos.</p></div><button className="icon-button" onClick={()=>{setEditingSubstanceName(null);setCreatingSubstance(false);}} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={e=>{e.preventDefault();const name=substanceEditor.name.trim();if(!name)return;if(substances.some(s=>s.toLocaleLowerCase("pt-BR")===name.toLocaleLowerCase("pt-BR")&&s!==editingSubstanceName)){setMoreMessage("Já existe uma substância com esse nome.");return;}if(creatingSubstance){addSubstance(name);}else if(editingSubstanceName&&name!==editingSubstanceName){renameSubstance(editingSubstanceName,name);}const previousDetails=presetFor(name);updateSubstanceDetails(name,{brand:previousDetails.brand||"",concentration:Number(substanceEditor.concentration)||0,volume:Number(substanceEditor.volume)||0,applicationType:previousDetails.applicationType||"intramuscular"});setMoreMessage(creatingSubstance?`Substância “${name}” adicionada.`:"Cadastro da substância atualizado.");setEditingSubstanceName(null);setCreatingSubstance(false);}}><div className="form-grid"><label className="field full"><span className="label">Nome da substância</span><input className="input" value={substanceEditor.name} onChange={e=>setSubstanceEditor({...substanceEditor,name:e.target.value})} required autoFocus/></label><label className="field"><span className="label">Concentração padrão (mg/mL)</span><input className="input" type="number" min="0" step="0.01" value={substanceEditor.concentration} onChange={e=>setSubstanceEditor({...substanceEditor,concentration:e.target.value})} placeholder="Opcional"/></label><label className="field"><span className="label">Volume padrão (mL)</span><input className="input" type="number" min="0" step="0.01" value={substanceEditor.volume} onChange={e=>setSubstanceEditor({...substanceEditor,volume:e.target.value})} placeholder="Opcional"/></label></div><div className="modal-footer">{!creatingSubstance && editingSubstanceName && <button type="button" className="danger-button" onClick={()=>{const target=editingSubstanceName;if(window.confirm(`Excluir a substância ${target} da lista e dos planos associados? Os registros históricos serão preservados.`)){removeSubstance(target);setMoreMessage("Substância removida da lista. O histórico foi preservado.");setEditingSubstanceName(null);}}}><Trash2 size={15}/> Excluir</button>}<button type="button" className="secondary-button" onClick={()=>{setEditingSubstanceName(null);setCreatingSubstance(false);}}>Cancelar</button><button type="submit" className="primary-button">{creatingSubstance?"Adicionar substância":"Salvar cadastro"}</button></div></form></div></div>}

  {locationModalOpen && <div className="overlay" onMouseDown={()=>setLocationModalOpen(false)}><div className="modal themed-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><h2 className="modal-title">{editingLocationName ? "Editar local" : "Adicionar local"}</h2><p className="modal-subtitle">Defina o nome do local usado nos registros e no rodízio dos planos.</p></div><button className="icon-button" type="button" onClick={()=>setLocationModalOpen(false)} aria-label="Fechar"><X size={20}/></button></div><form onSubmit={e=>{e.preventDefault();const value=locationEditor.trim();if(!value)return;if(locations.some(item=>item.toLocaleLowerCase("pt-BR")===value.toLocaleLowerCase("pt-BR")&&item!==editingLocationName)){setMoreMessage("Já existe um local com esse nome.");return;}if(editingLocationName){if(value!==editingLocationName)renameLocation(editingLocationName,value);setMoreMessage(value===editingLocationName?"Nenhuma alteração realizada.":"Local renomeado.");}else{addLocation(value);setMoreMessage(`Local “${value}” adicionado.`);}setLocationModalOpen(false);}}><div className="form-grid"><label className="field full"><span className="label">Nome do local</span><input className="input" value={locationEditor} onChange={e=>setLocationEditor(e.target.value)} placeholder="Ex.: Deltoide esquerdo" required autoFocus/></label></div><div className="modal-footer">{editingLocationName && <button type="button" className="danger-button" onClick={()=>{const target=editingLocationName;if(window.confirm(`Excluir o local ${target} da lista e dos planos? Os registros históricos serão preservados.`)){removeLocation(target);setMoreMessage("Local removido da lista. O histórico foi preservado.");setLocationModalOpen(false);}}}><Trash2 size={15}/> Excluir</button>}<button type="button" className="secondary-button" onClick={()=>setLocationModalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">{editingLocationName?"Salvar alterações":"Adicionar local"}</button></div></form></div></div>}

  {deleteTarget&&<div className="overlay" onMouseDown={()=>setDeleteTarget(null)}><div className="card confirm-box" onMouseDown={e=>e.stopPropagation()}><h2 className="confirm-title">Excluir aplicação?</h2><p className="confirm-text">O registro de <strong>{deleteTarget.substance}</strong> em <strong>{formatDate(deleteTarget.date)}</strong> será removido permanentemente deste dispositivo.</p><div className="confirm-footer"><button className="secondary-button" onClick={()=>setDeleteTarget(null)}>Cancelar</button><button className="danger-button" onClick={()=>{removeInjection(deleteTarget.id);setDeleteTarget(null);setModalOpen(false);setEditing(null)}}><Trash2 size={16}/> Excluir</button></div></div></div>}
  {deletePlanTarget&&<div className="overlay" onMouseDown={()=>setDeletePlanTarget(null)}><div className="card confirm-box" onMouseDown={e=>e.stopPropagation()}><h2 className="confirm-title">Excluir plano?</h2><p className="confirm-text">O plano <strong>{deletePlanTarget.name}</strong> será removido. Os registros reais já salvos no histórico não serão alterados.</p><div className="confirm-footer"><button className="secondary-button" onClick={()=>setDeletePlanTarget(null)}>Cancelar</button><button className="danger-button" onClick={()=>{removePlan(deletePlanTarget.id);setDeletePlanTarget(null);setPlanModalOpen(false)}}><Trash2 size={16}/> Excluir plano</button></div></div></div>}
  </main>;
}
