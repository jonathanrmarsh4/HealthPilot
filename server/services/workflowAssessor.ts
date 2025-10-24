// workflow_assessor.ts
// Drop-in MVP: import { assessWorkflow } from "./workflowAssessor";

export type Vital = { value: number | boolean; asOf: string };
export type Biomarker = { name: string; value?: number | string; flag?: "high"|"low"|"normal"; asOf: string };

export type Input = {
  text: string;                 // free-text symptoms
  severity?: number;            // 0..10 (optional)
  context?: string[];           // optional: ["after_meal","after_workout","poor_sleep",...]
  profile?: { age?: number; sex?: "male"|"female"|"other" };
  vitals?: {
    // Provide only what you have; engine will pick what's relevant & fresh
    spo2?: Vital;               // %
    heartRate?: Vital;          // bpm (recent/rest)
    ecgIrregular?: Vital;       // boolean (Apple Watch AFib/irregular)
    tempC?: Vital;              // °C
    bp?: { sys: number; dia: number; asOf: string };
    hrvZ?: Vital;               // z vs personal baseline
    rhrDelta?: Vital;           // Δ vs baseline
    sleep?: { remZ?: number; totalH?: number; asOf: string };
    glucose?: Vital;            // mg/dL or mmol/L; interpret externally if needed
  };
  biomarkers?: Biomarker[];     // only those ≤60d used
};

export type Output = {
  timestamp: string;
  triage: { level: "urgent_now"|"gp_24_72h"|"self_care"; reason: string };
  differential: Array<{
    label: string;              // possible cause (non-diagnostic wording)
    confidence: number;         // 0..1 (heuristic-calibrated)
    key_evidence: string[];     // what drove it
    recommendations: string[];  // 1–3 next steps
  }>;
  explanation: {
    why: string;                // short human text
    used: string[];             // signals used (with freshness weights)
    ignored_stale: string[];    // excluded by freshness
  };
};

// ---------------- Config ----------------
const HRS = (h:number)=>h*3600*1000;
const DAYS = (d:number)=>d*24*3600*1000;

const FRESHNESS_H = {
  vitals: 72,        // HRV, BP, Temp, SpO2, HR, Sleep
  ecg: 14*24,        // hours (14 days)
  biomarkersD: 60,   // days
};

const THRESH = {
  spo2Urgent: 92,    // %
  hrVeryHigh: 120,   // bpm
  tempVeryHigh: 40.0,// °C
  bpVeryHigh: { sys: 160, dia: 100 },
  bpGP: { sys: 140, dia: 90 },
};

const RECS = {
  urgent: ["Call emergency services or go to ED now", "Do not drive yourself if unwell"],
  gp: ["Book GP review within 24–72h", "Bring recent HealthKit/biomarker readings"],
  self: ["Hydration + electrolytes", "Easy day, early wind-down"],
  cardiac: ["Seek urgent care; bring ECG if available"],
  UTI: ["Hydration; avoid bladder irritants (caffeine/alcohol)"],
  headache: ["Quiet/dim room; reduce screen glare"],
  recovery: ["Active recovery (walk/mobility), avoid intense training today"],
  gi: ["Smaller, simpler meals; remain upright 2–3h post-meal"],
};

// ------------- Helpers -------------
const isoNow = () => new Date().toISOString();
const ageMs = (iso?: string) => (!iso ? Infinity : (Date.now() - new Date(iso).getTime()));
const clamp = (n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,n));

function freshVital<T extends {asOf:string}>(v?: T, maxH = FRESHNESS_H.vitals): T | undefined {
  if (!v) return undefined;
  return ageMs(v.asOf) <= HRS(maxH) ? v : undefined;
}
function freshECG<T extends {asOf:string}>(v?: T): T | undefined {
  if (!v) return undefined;
  return ageMs(v.asOf) <= HRS(FRESHNESS_H.ecg) ? v : undefined;
}
function freshBiomarker(b: Biomarker): Biomarker | undefined {
  return ageMs(b.asOf) <= DAYS(FRESHNESS_H.biomarkersD) ? b : undefined;
}

// Normalize text → canonical tokens
function tokensFrom(text: string, context?: string[]): string[] {
  const t = (text || "").toLowerCase();
  const out = new Set<string>();
  const add=(x:string)=>out.add(x);

  // Core
  if (/short(ness)? of breath|breathless|trouble breathing|can't breathe/.test(t)) add("dyspnea");
  if (/chest (pain|tight|pressure)|tight chest|pressure in chest/.test(t)) add("chest_sx");
  if (/headache|migraine|head pressure/.test(t)) add("headache");
  if (/fever|high temp|temperature.*(high|raised)/.test(t)) add("fever");
  if (/chills|rigors/.test(t)) add("chills");
  if (/cough|sore throat|congestion|runny nose/.test(t)) add("resp_sx");

  // Urinary
  if (/pain (when|with) urin|burn(ing)? (when|with) urin|dysuria/.test(t)) add("dysuria");
  if (/frequent urinat|peeing (a lot|often)|polyuria/.test(t)) add("frequency");
  if (/urgency|sudden need to urin|can't hold/.test(t)) add("urgency");
  if (/flank pain|costovertebral/.test(t)) add("flank_pain");

  // GI
  if (/bloating|reflux|indigestion|diarrhea|constipation|abdominal pain|stomach ache/.test(t)) add("gi");

  // Neuro/syncope
  if (/faint(ed|ing)|passed out|black(ed)? out/.test(t)) add("syncope");
  if (/one-?sided weakness|face droop|slurred speech|confusion/.test(t)) add("neuro_flag");

  // MSK/recovery
  if (/muscle soreness|doms|back pain|joint pain/.test(t)) add("msk");
  if (/after workout|post[- ]workout|heavy training/.test(t)) add("after_workout");

  (context || []).forEach(add);
  return [...out];
}

// Relevance map: symptoms → which signals matter
const RELEVANCE: Record<string, Array<keyof NonNullable<Input["vitals"]>>> = {
  dyspnea: ["spo2","heartRate","ecgIrregular","bp"],
  chest_sx: ["ecgIrregular","heartRate","spo2","bp"],
  headache: ["bp","hrvZ","rhrDelta","sleep","tempC"],
  fever: ["tempC","spo2","heartRate"],
  dysuria: ["tempC","bp"],
  frequency: ["tempC","bp"],
  urgency: ["tempC","bp"],
  gi: ["tempC"],
  syncope: ["heartRate","bp","ecgIrregular","spo2"],
  neuro_flag: ["bp","spo2"],
  msk: ["hrvZ","rhrDelta","sleep"],
  after_workout: ["hrvZ","rhrDelta","sleep"],
  resp_sx: ["spo2","heartRate","tempC"],
};

// ------------- URGENT guard -------------
function urgentGuard(tokens: string[], v: ReturnType<typeof collectFreshVitals>): string[] {
  const reasons: string[] = [];
  if (tokens.includes("dyspnea") && tokens.includes("chest_sx")) reasons.push("Chest symptoms + shortness of breath");
  if (tokens.includes("syncope")) reasons.push("Syncope (fainting)");
  if (tokens.includes("neuro_flag")) reasons.push("Neurological red flag");
  if (v.spo2 != null && v.spo2 < THRESH.spo2Urgent) reasons.push(`SpO₂ ${v.spo2}% (<${THRESH.spo2Urgent}%)`);
  if (v.hr != null && v.hr >= THRESH.hrVeryHigh) reasons.push(`Heart rate ${v.hr} bpm (very high)`);
  if (v.temp != null && v.temp >= THRESH.tempVeryHigh) reasons.push(`Temperature ${v.temp}°C (very high)`);
  if (v.ecgIrreg === true && (tokens.includes("dyspnea") || tokens.includes("chest_sx"))) reasons.push("ECG irregular + chest/breath symptoms");
  if (v.bp && (v.bp.sys >= THRESH.bpVeryHigh.sys || v.bp.dia >= THRESH.bpVeryHigh.dia)) reasons.push(`Very high BP (${v.bp.sys}/${v.bp.dia})`);
  return reasons;
}

// Collect & weight only the relevant vitals (freshness-aware)
function collectFreshVitals(input: Input, tokens: string[]) {
  const wanted = new Set<keyof NonNullable<Input["vitals"]>>();
  tokens.forEach(t => (RELEVANCE[t] || []).forEach(sig => wanted.add(sig)));

  const v = input.vitals || {};
  const out: {
    spo2?: number; hr?: number; temp?: number;
    bp?: {sys:number;dia:number};
    hrvZ?: number; rhrDelta?: number;
    ecgIrreg?: boolean;
    sleep?: { remZ?: number; totalH?: number };
    used: string[]; ignored: string[];
  } = { used: [], ignored: [] };

  const use = <K extends keyof NonNullable<Input["vitals"]>>(key: K) => {
    if (!wanted.has(key)) return;
    const val = ((): any => {
      if (key === "bp" && v.bp && ageMs(v.bp.asOf) <= HRS(FRESHNESS_H.vitals)) return v.bp;
      if (key === "ecgIrregular") return freshECG(v.ecgIrregular);
      return freshVital((v as any)[key]);
    })();
    if (val == null) { out.ignored.push(`stale_or_missing:${String(key)}`); return; }
    switch (key) {
      case "spo2": out.spo2 = Number(val.value); out.used.push(`spo2:${out.spo2}`); break;
      case "heartRate": out.hr = Number(val.value); out.used.push(`hr:${out.hr}`); break;
      case "tempC": out.temp = Number(val.value); out.used.push(`temp:${out.temp}`); break;
      case "bp": out.bp = { sys: val.sys, dia: val.dia }; out.used.push(`bp:${val.sys}/${val.dia}`); break;
      case "hrvZ": out.hrvZ = Number(val.value); out.used.push(`hrvZ:${out.hrvZ}`); break;
      case "rhrDelta": out.rhrDelta = Number(val.value); out.used.push(`rhrΔ:${out.rhrDelta}`); break;
      case "ecgIrregular": out.ecgIrreg = Boolean(val.value); out.used.push(`ecgIrregular:${out.ecgIrreg}`); break;
      case "sleep": out.sleep = { remZ: val.remZ, totalH: val.totalH }; out.used.push(`sleep:${val.totalH ?? "?"}h,REMz:${val.remZ ?? "?"}`); break;
      case "glucose": out.used.push(`glucose:${val.value}`); break; // example passthrough
    }
  };

  wanted.forEach(use);
  return out;
}

function collectFreshBiomarkers(biomarkers?: Biomarker[]) {
  const used: string[] = [], ignored: string[] = [], flags: string[] = [];
  for (const b of biomarkers || []) {
    const fresh = freshBiomarker(b);
    const tag = `bio:${b.name}`;
    if (!fresh) { ignored.push(`${tag} (${b.asOf})`); continue; }
    used.push(tag);
    if (b.flag && b.flag !== "normal") flags.push(`${b.name}_${b.flag}`);
    if (/crp/i.test(b.name) && b.flag === "high") flags.push("inflammation");
    if (/wbc/i.test(b.name) && b.flag === "high") flags.push("leukocytosis");
  }
  return { used, ignored, flags };
}

// ---------- Pattern scoring (simple, additive) ----------
type Cand = { label: string; score: number; ev: string[]; recs: string[] };

function scorePatterns(tokens: string[], v: ReturnType<typeof collectFreshVitals>, flags: string[]) {
  const c: Cand[] = [];

  // Cardiac / emergent pattern
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("chest_sx")) { s+=2; ev.push("chest symptoms"); }
    if (tokens.includes("dyspnea")) { s+=1.5; ev.push("shortness of breath"); }
    if (v.ecgIrreg) { s+=2; ev.push("ECG irregular"); }
    if (v.spo2!=null && v.spo2<95) { s+=1; ev.push(`SpO₂ ${v.spo2}%`); }
    if (v.hr!=null && v.hr>=THRESH.hrVeryHigh) { s+=1; ev.push(`HR ${v.hr}`); }
    if (v.bp && (v.bp.sys>=THRESH.bpGP.sys || v.bp.dia>=THRESH.bpGP.dia)) { s+=0.5; ev.push(`BP ${v.bp.sys}/${v.bp.dia}`); }
    if (s>0) c.push({ label:"Cardiac/respiratory concern", score:s, ev, recs:[...RECS.urgent] });
  }

  // Infection/systemic
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("fever")) { s+=2; ev.push("fever"); }
    if (tokens.includes("chills")) { s+=1; ev.push("chills"); }
    if (flags.includes("inflammation") || flags.includes("leukocytosis")) { s+=1.5; ev.push("inflammation markers"); }
    if (tokens.includes("resp_sx")) { s+=0.8; ev.push("respiratory symptoms"); }
    if (s>0) c.push({ label:"Possible infection/inflammatory response", score:s, ev, recs:[...RECS.gp] });
  }

  // Urinary tract involvement
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("dysuria")) { s+=2; ev.push("dysuria"); }
    if (tokens.includes("frequency")) { s+=1.5; ev.push("frequency"); }
    if (tokens.includes("urgency")) { s+=1; ev.push("urgency"); }
    if (tokens.includes("fever")) { s+=0.8; ev.push("fever"); }
    if (tokens.includes("flank_pain")) { s+=1.2; ev.push("flank pain"); }
    if (s>0) c.push({ label:"Urinary tract involvement (check UTI/prostatic involvement)", score:s, ev, recs:[...RECS.UTI, ...RECS.gp] });
  }

  // Headache with recovery/load
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("headache")) { s+=1.5; ev.push("headache"); }
    if (v.hrvZ!=null && v.hrvZ<-1) { s+=0.8; ev.push("HRV low"); }
    if (v.rhrDelta!=null && v.rhrDelta>=7) { s+=0.8; ev.push("RHR elevated"); }
    if (v.bp && (v.bp.sys>=THRESH.bpGP.sys || v.bp.dia>=THRESH.bpGP.dia)) { s+=0.4; ev.push("BP elevated"); }
    if (s>0) c.push({ label:"Headache with poor recovery/physiologic load", score:s, ev, recs:[...RECS.headache, ...RECS.self] });
  }

  // Overreaching / DOMS
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("msk")) { s+=1; ev.push("musculoskeletal symptoms"); }
    if (tokens.includes("after_workout")) { s+=1.5; ev.push("after workout"); }
    if (v.hrvZ!=null && v.hrvZ<-1) { s+=0.5; ev.push("HRV low"); }
    if (v.rhrDelta!=null && v.rhrDelta>=7) { s+=0.5; ev.push("RHR elevated"); }
    if (s>0) c.push({ label:"Post-exertional strain / recovery needed", score:s, ev, recs:[...RECS.recovery, ...RECS.self] });
  }

  // GI pattern
  {
    let s=0; const ev:string[]=[];
    if (tokens.includes("gi")) { s+=1.5; ev.push("GI symptoms"); }
    if (tokens.includes("fever")) { s+=0.5; ev.push("fever"); }
    if (s>0) c.push({ label:"Gastrointestinal irritation/intolerance", score:s, ev, recs:[...RECS.gi, ...RECS.self] });
  }

  return c.sort((a,b)=>b.score-a.score);
}

// Map score → confidence (simple monotonic mapping + rank damping)
function toTop3(cands: Cand[], urgent: boolean) {
  const out = cands.slice(0,3).map((c, i) => {
    const conf = clamp(0.25 + 0.18*c.score - 0.06*i, 0.2, urgent ? 0.99 : 0.9);
    const recs = urgent ? RECS.urgent : c.recs.slice(0,3);
    return { label: c.label, confidence: Number(conf.toFixed(2)), key_evidence: c.ev, recommendations: recs };
  });
  if (!out.length) {
    out.push({ label: "Non-specific pattern (insufficient evidence)", confidence: 0.25, key_evidence: [], recommendations: urgent ? RECS.urgent : [...RECS.self, ...RECS.gp] });
  }
  return out;
}

// ------------- PUBLIC: run the workflow -------------
export function assessWorkflow(input: Input): Output {
  const tokens = tokensFrom(input.text, input.context);

  // 1) Decide relevant data (by tokens), 2) collect fresh values (recency-aware)
  const v = collectFreshVitals(input, tokens);
  const bio = collectFreshBiomarkers(input.biomarkers);

  // 3) Urgent short-circuit (safety)
  const urgentReasons = urgentGuard(tokens, v);
  const urgent = urgentReasons.length > 0;

  // 4) Pattern scoring
  const cands = scorePatterns(tokens, v, bio.flags);
  const differential = toTop3(cands, urgent);

  // 5) Triage (if not already urgent)
  let triage: Output["triage"] = urgent
    ? { level: "urgent_now", reason: urgentReasons.join("; ") }
    : { level: "self_care", reason: "No urgent flags detected" };

  // upgrade to GP if moderate concern patterns or elevated BP/fever reported
  if (!urgent) {
    const hasUTI = differential.some(d => /Urinary tract/.test(d.label));
    const hasInfection = differential.some(d => /infection/.test(d.label));
    const bpGP = v.bp && (v.bp.sys>=THRESH.bpGP.sys || v.bp.dia>=THRESH.bpGP.dia);
    if (hasUTI || hasInfection || bpGP || tokens.includes("fever")) {
      triage = { level: "gp_24_72h", reason: [
        hasUTI ? "Urinary symptoms" : "",
        hasInfection ? "Possible infection" : "",
        bpGP ? `Elevated BP (${v.bp?.sys}/${v.bp?.dia})` : "",
        tokens.includes("fever") ? "Fever" : ""
      ].filter(Boolean).join("; ") || "Clinical review recommended" };
    }
  }

  // 6) Explanation
  const used = [...v.used, ...bio.flags.map(f=>`bioflag:${f}`)];
  const ignored_stale = [...v.ignored, ...bio.ignored];
  const whyBits = [
    tokens.length ? `Symptoms: ${tokens.join(", ")}` : "",
    v.bp ? `BP ${v.bp.sys}/${v.bp.dia}` : "",
    v.spo2!=null ? `SpO₂ ${v.spo2}%` : "",
    v.temp!=null ? `Temp ${v.temp}°C` : "",
    v.hrvZ!=null ? `HRV z=${v.hrvZ}` : "",
    v.rhrDelta!=null ? `RHR Δ=${v.rhrDelta}` : "",
    bio.flags.length ? `Biomarkers: ${bio.flags.join(", ")}` : "",
  ].filter(Boolean).join(" • ");

  return {
    timestamp: isoNow(),
    triage,
    differential,
    explanation: {
      why: (whyBits || "Based on entered symptoms and recent HealthKit/biomarker data.") + " This is not a diagnosis.",
      used,
      ignored_stale,
    }
  };
}
