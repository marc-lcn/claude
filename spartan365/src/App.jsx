import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Bell, ChevronRight, ChevronLeft, X, Flame, Dumbbell, PersonStanding, Shield,
  Moon, HeartPulse, Weight, CheckCircle2, Circle, ShieldCheck,
  CalendarDays, BookOpen, TrendingUp, User, Rocket, Trophy, Target,
  Battery, Gauge, Play, Flag, Timer, Search, SlidersHorizontal, Star,
  ArrowLeft, MoreHorizontal, Video, MessageSquare, BarChart3, Sparkles,
  Backpack, Footprints, Droplet, Watch, PlusCircle, Send,
  Mountain, Sunrise, Zap, Wind, Lock, Volume2, Vibrate, CloudOff, Download, Upload, Trash2
} from 'lucide-react';
import { START_DATE, DAYS, MUSCULATION, COURSE_TYPES, RACES, PHYSICAL_GOALS } from './data/spartanData.js';

// ---------- Design tokens ----------
const BG = '#050607';
const CARD = '#12161C';
const CARD_BORDER = '#1D232B';
const ACCENT = '#C7FF38';
const TEXT = '#FFFFFF';
const TEXT_SOFT = '#9AA0AA';
const TEXT_FAINT = '#5C636D';
const RED = '#FF6B5C';
const ORANGE = '#FFB648';

const FONT = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

// ---------- Helpers ----------
const COURSE_LABEL_MAP = {
  '🔴 Fractionné court': '🔴 Fractionné court',
  '🟠 Fractionné long': '🟠 Fractionné long',
  '🟠 Seuil': '🟠 Fractionné long',
  '🟢 Endurance fondamentale': '🟢 Endurance fondamentale',
  '🟢 Endurance marathon': '🟢 Endurance fondamentale',
  '🔵 Sortie longue 1h30': '🔵 Sortie longue',
  '🔵 Sortie longue 1h45': '🔵 Sortie longue',
  '🔵 Sortie longue 2h': '🔵 Sortie longue',
  '⛰️ Côtes': '⛰️ Côtes',
  '💚 Footing récup': '💚 Footing récupération',
  '⚔️ Trail Spartan': '⚔️ Spécifique Spartan',
};
const RACE_DAY_LABELS = new Set(['⚔️ SPARTAN ULTRA MORZINE', '🏃 MARATHON DE PARIS', '🏃 SEMI SAINT-JEAN-DE-LUZ']);

// rough duration (min) + kcal/min by course category, used only for the "temps total / calories" summary
const COURSE_ESTIMATE = {
  '🔴 Fractionné court': { min: 50, kcalMin: 12 },
  '🟠 Fractionné long': { min: 65, kcalMin: 11 },
  '🟢 Endurance fondamentale': { min: 65, kcalMin: 9 },
  '🔵 Sortie longue': { min: 110, kcalMin: 8.5 },
  '⛰️ Côtes': { min: 55, kcalMin: 11.5 },
  '💚 Footing récupération': { min: 30, kcalMin: 7 },
  '⚔️ Spécifique Spartan': { min: 80, kcalMin: 11 },
};
const MUSCU_ESTIMATE = { min: 45, kcalMin: 7 };
const ROUTINE_KCAL_PER_MIN = 6;

function dateFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function daysBetween(isoA, isoB) {
  return Math.round((dateFromISO(isoB) - dateFromISO(isoA)) / 86400000);
}
function formatDateHeader(iso) {
  const s = dateFromISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function getDayIndex() {
  return daysBetween(START_DATE, todayISO());
}
function matchCourseType(label) {
  if (!label) return null;
  if (RACE_DAY_LABELS.has(label)) return { isRace: true, label };
  const key = COURSE_LABEL_MAP[label];
  if (key && COURSE_TYPES[key]) return { isRace: false, key, data: COURSE_TYPES[key], label };
  return { isRace: false, key: null, data: null, label };
}

// XP / level system derived from cumulative validated points (no new data needed)
const LEVEL_NAMES = ['Recrue', 'Soldat', 'Guerrier', 'Vétéran', 'Spartan', 'Spartan', 'Spartan Élite', 'Champion', 'Légende', 'Immortel'];
function computeLevel(totalPoints) {
  const xpPerLevel = 500;
  const level = Math.min(10, Math.floor(totalPoints / xpPerLevel) + 1);
  const xpIntoLevel = totalPoints % xpPerLevel;
  const name = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
  return { level, name, xpIntoLevel, xpPerLevel };
}

// Static personal records — pas encore de données réelles, à renseigner manuellement ou via Garmin plus tard
const RECORDS = [
  { label: 'Dead Hang', value: '—', status: 'À renseigner' },
  { label: 'Tractions', value: '—', status: 'À renseigner' },
  { label: '5 km', value: '—', status: 'À renseigner' },
  { label: '10 km', value: '—', status: 'À renseigner' },
  { label: 'Semi-marathon', value: '—', status: 'À renseigner' },
];

function weeklySessions(day, completions) {
  const weekDays = DAYS.filter(d => d.semaine === day.semaine);
  const done = weekDays.filter(d => completions[d.date] && completions[d.date].fait).length;
  return { done, total: weekDays.length };
}

function raceProgress(race) {
  const totalSpan = daysBetween(START_DATE, race.date);
  const elapsed = daysBetween(START_DATE, todayISO());
  if (totalSpan <= 0) return 100;
  const pct = Math.round((elapsed / totalSpan) * 100);
  return Math.max(0, Math.min(100, pct));
}

// ---------- Planning helpers ----------
const PHASE_NAME = {
  '🏗️': 'Développement général',
  '🏃': 'Préparation Course',
  '⚔️': 'Spécifique Spartan',
};
function phaseEmoji(phaseStr) {
  const m = phaseStr.match(/([\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]+)/);
  return m ? m[0] : '🏗️';
}
function phaseInfo(day) {
  const emoji = phaseEmoji(day.phase);
  const name = PHASE_NAME[emoji] || 'Programme';
  const weeksInPhase = DAYS.filter(d => d.phase === day.phase).map(d => d.semaine);
  const minW = Math.min(...weeksInPhase), maxW = Math.max(...weeksInPhase);
  const weekInPhase = day.semaine - minW + 1;
  const totalWeeks = maxW - minW + 1;
  const pct = Math.round((weekInPhase / totalWeeks) * 100);
  return { name, weekInPhase, totalWeeks, pct };
}
function getWeekDays(weekNumber) {
  return DAYS.filter(d => d.semaine === weekNumber);
}
function dayStatus(day) {
  const isRace = RACE_DAY_LABELS.has(day.course);
  const hasCourse = !!day.course;
  const hasMuscu = day.seanceMuscu && day.seanceMuscu !== '—';
  const isRest = !hasCourse && !hasMuscu;
  const isHeavy = (day.charge || 0) >= 15;
  const sessionCount = (hasCourse ? 1 : 0) + (hasMuscu ? 1 : 0) + 1; // routine always present
  return { isRace, isRest, isHeavy, sessionCount, hasCourse, hasMuscu };
}

// Classifies a day into exactly one of the 5 pictogram categories for the calendar.
function dayPrimaryCategory(day) {
  if (RACE_DAY_LABELS.has(day.course)) return { key: 'race', icon: Trophy, color: '#E8D94C' };
  if (day.course === '💚 Footing récup') return { key: 'recuperation', icon: HeartPulse, color: CAT_RECUP };
  if (day.course) return { key: 'course', icon: PersonStanding, color: CAT_COURSE };
  if (day.seanceMuscu && day.seanceMuscu !== '—') return { key: 'muscu', icon: Dumbbell, color: CAT_MUSCU };
  if ((day.mobilite || 0) >= 15) return { key: 'mobilite', icon: Sparkles, color: CAT_MOBILITE };
  return { key: 'spartan', icon: Shield, color: CAT_SPARTAN };
}

function weekLoadData(weekDays) {
  return weekDays.map(d => ({ date: d.date, charge: d.charge || 0 }));
}

function weekCategoryBreakdown(weekDays) {
  let course = 0, muscu = 0, routine = 0;
  weekDays.forEach(d => {
    const est = estimateSession(d);
    est.items.forEach(it => {
      if (it.type === 'course') course += it.min;
      else if (it.type === 'muscu') muscu += it.min;
      else routine += it.min;
    });
  });
  const total = Math.max(1, course + muscu + routine);
  return [
    { label: 'Course', minutes: course, pct: Math.round((course / total) * 100), color: CAT_COURSE },
    { label: 'Musculation', minutes: muscu, pct: Math.round((muscu / total) * 100), color: CAT_MUSCU },
    { label: 'Spartan', minutes: routine, pct: Math.round((routine / total) * 100), color: CAT_SPARTAN },
  ];
}

// ---------- Category system (Séances) ----------
const CAT_COURSE = '#8FE24D';
const CAT_MUSCU = '#4FA8FF';
const CAT_SPARTAN = '#FF5B5B';
const CAT_MOBILITE = '#B98CFF';
const CAT_RECUP = '#4FD6C7';

const INSIGHT_CATEGORIES = {
  citation: { label: 'Citation motivante', icon: Sparkles, color: CAT_MOBILITE },
  coach: { label: 'Conseil du Coach', icon: Shield, color: ACCENT },
  science: { label: 'Astuce scientifique', icon: BarChart3, color: CAT_MUSCU },
  course: { label: 'Technique de course', icon: PersonStanding, color: CAT_COURSE },
  muscu: { label: 'Astuce musculation', icon: Dumbbell, color: CAT_MUSCU },
  recup: { label: 'Conseil récupération', icon: HeartPulse, color: CAT_RECUP },
  mental: { label: 'Mental Spartan', icon: Flame, color: CAT_SPARTAN },
  histoire: { label: 'Anecdote spartiate', icon: Trophy, color: '#E8D94C' },
  nutrition: { label: 'Nutrition', icon: Droplet, color: '#5FB8E8' },
};

const DAILY_INSIGHTS = [
  { cat: 'citation', text: 'La discipline construit ce que la motivation abandonne.' },
  { cat: 'citation', text: 'Le corps atteint ce que l\u2019esprit croit possible.' },
  { cat: 'citation', text: 'La régularité bat l\u2019intensité sur la durée.' },
  { cat: 'citation', text: 'Un jour de plus, une version de toi un peu plus forte.' },
  { cat: 'coach', text: 'Ne compare jamais ta séance d\u2019aujourd\u2019hui à ta meilleure séance. Compare-la à celle d\u2019hier.' },
  { cat: 'coach', text: 'Un jour léger bien exécuté vaut mieux qu\u2019un jour dur bâclé par fatigue.' },
  { cat: 'coach', text: 'Le meilleur indicateur de progression n\u2019est pas une séance, c\u2019est ta régularité sur 3 semaines.' },
  { cat: 'science', text: 'Après l\u2019effort, une fenêtre de 30 à 45 minutes optimise l\u2019absorption des protéines pour la récupération musculaire.' },
  { cat: 'science', text: 'Le seuil lactique s\u2019améliore surtout par le volume d\u2019endurance fondamentale, pas seulement par le fractionné.' },
  { cat: 'science', text: 'Le sommeil profond est la phase où se répare la majorité des microlésions musculaires.' },
  { cat: 'course', text: 'Une cadence de 170 à 180 pas/minute réduit l\u2019impact au sol et le risque de blessure.' },
  { cat: 'course', text: 'Sur une côte, raccourcis ta foulée et penche légèrement le buste vers l\u2019avant plutôt que d\u2019allonger le pas.' },
  { cat: 'course', text: 'Respire sur un rythme régulier (ex. 3 temps inspiration, 2 temps expiration) pour stabiliser ton effort.' },
  { cat: 'muscu', text: 'Garder 1 à 2 répétitions en réserve sur chaque série protège tes articulations sans sacrifier les gains.' },
  { cat: 'muscu', text: 'Le tempo excentrique (la phase de descente) est souvent plus déterminant pour la force que la phase concentrique.' },
  { cat: 'muscu', text: 'Un échauffement spécifique à la charge de travail réduit nettement le risque de blessure sur les gros mouvements.' },
  { cat: 'recup', text: 'Un footing très lent le lendemain d\u2019une séance dure accélère la récupération mieux qu\u2019un repos total.' },
  { cat: 'recup', text: 'L\u2019hydratation influence directement la qualité de ta récupération musculaire — bois régulièrement, pas seulement pendant l\u2019effort.' },
  { cat: 'recup', text: 'Les étirements légers avant le coucher favorisent un sommeil plus profond après une grosse séance.' },
  { cat: 'mental', text: 'Les Spartiates ne cherchaient pas le chemin facile — seulement le chemin juste.' },
  { cat: 'mental', text: 'La fatigue est temporaire. Abandonner est définitif.' },
  { cat: 'mental', text: 'Ce n\u2019est pas la motivation qui te lève le matin. C\u2019est l\u2019habitude que tu as construite.' },
  { cat: 'histoire', text: 'À Sparte, l\u2019agôgé — l\u2019entraînement des jeunes citoyens — durait 13 ans et forgeait autant le caractère que le corps.' },
  { cat: 'histoire', text: 'Le mot "laconique" vient de Laconie, la région de Sparte : les Spartiates étaient réputés pour la sobriété de leurs paroles.' },
  { cat: 'histoire', text: 'Aux Thermopyles, ce n\u2019est pas la force brute mais la discipline collective qui a permis à 300 hommes de tenir un défilé.' },
  { cat: 'nutrition', text: 'Les glucides complexes la veille d\u2019une séance longue maximisent tes réserves de glycogène.' },
  { cat: 'nutrition', text: 'Un ratio simple après l\u2019effort : environ 3g de glucides pour 1g de protéines favorise la récupération.' },
  { cat: 'nutrition', text: 'Ne teste jamais une nouvelle alimentation le jour d\u2019une compétition — seulement à l\u2019entraînement.' },
];

function dailyInsight(dateISO) {
  const idx = hashSeed(dateISO + '-insight') % DAILY_INSIGHTS.length;
  return DAILY_INSIGHTS[idx];
}

const WEEKDAY_LETTERS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
function weekdayLabel(iso) {
  return WEEKDAY_LETTERS[dateFromISO(iso).getDay()];
}
function formatDateMedium(iso) {
  const s = dateFromISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function sessionSummaryForDay(day) {
  const list = [];
  if (day.course) list.push({ key: 'course', icon: PersonStanding, iconBg: CAT_COURSE + '1F', iconColor: CAT_COURSE, kicker: 'Course', title: day.course.replace(/^[^\s]+\s/, ''), tag: '' });
  if (day.seanceMuscu && day.seanceMuscu !== '—') list.push({ key: 'muscu', icon: Dumbbell, iconBg: CAT_MUSCU + '1F', iconColor: CAT_MUSCU, kicker: 'Musculation', title: day.seanceMuscu.replace(/^[^\s]+\s/, ''), tag: '' });
  const routineCount = ['pompes','squats','fentes','abdos','tractions','gainage','chaise','grip','mollets','tibial','mobilite'].filter(k => day[k] && day[k] > 0).length;
  list.push({ key: 'routine', icon: Shield, iconBg: CAT_SPARTAN + '1F', iconColor: CAT_SPARTAN, kicker: 'Routine Spartan', title: `${routineCount} exercices`, tag: '' });
  return list;
}


function useCompletions() {
  const [completions, setCompletions] = useState({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('completions', false);
        if (res && res.value) setCompletions(JSON.parse(res.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  const toggleDay = useCallback(async (date) => {
    setCompletions((prev) => {
      const next = { ...prev };
      if (next[date] && next[date].fait) delete next[date];
      else next[date] = { fait: true, ts: Date.now() };
      window.storage.set('completions', JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, []);
  return { completions, toggleDay, loaded };
}

function totalPointsEarned(completions) {
  let sum = 0;
  DAYS.forEach(d => { if (completions[d.date] && completions[d.date].fait) sum += (d.points || 0); });
  return sum;
}

function estimateSession(day) {
  const items = [];
  const routineCount = ['pompes','squats','fentes','abdos','tractions','gainage','chaise','grip','mollets','tibial','mobilite']
    .filter(k => day[k] && day[k] > 0).length;
  const routineMin = 15;
  items.push({ type: 'routine', min: routineMin, kcal: Math.round(routineMin * ROUTINE_KCAL_PER_MIN), count: routineCount });

  if (day.seanceMuscu && day.seanceMuscu !== '—') {
    items.push({ type: 'muscu', min: MUSCU_ESTIMATE.min, kcal: Math.round(MUSCU_ESTIMATE.min * MUSCU_ESTIMATE.kcalMin), label: day.seanceMuscu });
  }
  if (day.course) {
    const match = matchCourseType(day.course);
    const est = (match && !match.isRace && match.key && COURSE_ESTIMATE[match.key]) ? COURSE_ESTIMATE[match.key] : { min: 50, kcalMin: 10 };
    items.push({ type: 'course', min: est.min, kcal: Math.round(est.min * est.kcalMin), label: day.course });
  }
  const totalMin = items.reduce((s, i) => s + i.min, 0);
  const totalKcal = items.reduce((s, i) => s + i.kcal, 0);
  return { items, totalMin, totalKcal, routineCount };
}

const FATIGUE_INFO = {
  '🟢 Faible': { score: 82, label: 'Fatigue faible', desc: 'Tu es prêt à performer aujourd\u2019hui.', color: ACCENT },
  '🟠 Modérée': { score: 62, label: 'Fatigue modérée', desc: 'Reste attentif à tes sensations pendant la séance.', color: ORANGE },
  '🔴 Élevée': { score: 40, label: 'Fatigue élevée', desc: 'Envisage d\u2019alléger l\u2019intensité aujourd\u2019hui.', color: RED },
};
const CHARGE_LABEL = {
  '🟢 Faible': 'Charge optimale',
  '🟠 Modérée': 'Charge modérée',
  '🔴 Élevée': 'Charge élevée',
};
const RACE_SHORT = {
  'Semi-Marathon Saint-Jean-de-Luz': 'Semi-Marathon',
  'Marathon de Paris': 'Marathon',
  'Spartan Ultra Morzine': 'Spartan Ultra',
};

const CATEGORY_META = {
  course: { id: 'course', label: 'Course', color: CAT_COURSE, icon: PersonStanding, benefitLabels: ['Endurance', 'Vitesse (VMA)', 'Explosivité', 'Résistance mentale'] },
  muscu: { id: 'muscu', label: 'Musculation', color: CAT_MUSCU, icon: Dumbbell, benefitLabels: ['Force', 'Hypertrophie', 'Endurance musculaire', 'Gainage'] },
  spartan: { id: 'spartan', label: 'Spartan', color: CAT_SPARTAN, icon: Shield, benefitLabels: ['Grip', 'Gainage', 'Explosivité', 'Résistance mentale'] },
  mobilite: { id: 'mobilite', label: 'Mobilité', color: CAT_MOBILITE, icon: Sparkles, benefitLabels: ['Souplesse', 'Amplitude', 'Prévention blessures', 'Récupération'] },
  recuperation: { id: 'recuperation', label: 'Récupération', color: CAT_RECUP, icon: HeartPulse, benefitLabels: ['Récupération active', 'Circulation sanguine', 'Réduction du stress', 'Qualité du sommeil'] },
};

const DIFFICULTY_META = {
  debutant: { label: 'Débutant', color: '#7FE24D', emoji: '🟢' },
  intermediaire: { label: 'Intermédiaire', color: '#E8D94C', emoji: '🟡' },
  confirme: { label: 'Confirmé', color: '#F0A94C', emoji: '🟠' },
  elite: { label: 'Elite', color: '#FF5B5B', emoji: '🔴' },
};

function parseDeroule(list) {
  const warmup = [], main = [], cooldown = [];
  (list || []).forEach(line => {
    if (/^(Échauffement|Éducatifs)/.test(line)) warmup.push(line);
    else if (/^(Séance principale|Ravitaillement)/.test(line)) main.push(line);
    else if (/^(Récupération|Retour au calme)/.test(line)) cooldown.push(line);
  });
  return { warmup, main, cooldown };
}

const COURSE_DIFFICULTY = {
  '🟢 Endurance fondamentale': 'debutant',
  '💚 Footing récupération': 'debutant',
  '🔵 Sortie longue': 'intermediaire',
  '🟠 Fractionné long': 'confirme',
  '⛰️ Côtes': 'confirme',
  '🔴 Fractionné court': 'elite',
  '⚔️ Spécifique Spartan': 'elite',
};
const COURSE_BENEFITS = {
  '🟢 Endurance fondamentale': [5, 2, 1, 3],
  '🔴 Fractionné court': [3, 5, 3, 4],
  '🟠 Fractionné long': [4, 4, 2, 4],
  '🔵 Sortie longue': [5, 1, 1, 5],
  '⛰️ Côtes': [3, 3, 5, 4],
  '💚 Footing récupération': [2, 1, 1, 1],
  '⚔️ Spécifique Spartan': [4, 2, 4, 5],
};
const COURSE_FEATURED_INTERVAL = {
  '🔴 Fractionné court': { variantKey: '400m', reps: 8, unitLabel: '400 m', allure: '4:20 /km', recup: '1min15 trot' },
  '🟠 Fractionné long': { variantKey: '1000m', reps: 8, unitLabel: '1000 m', allure: 'Allure seuil', recup: '1min30 trot' },
};

function buildCourseSessions() {
  return Object.entries(COURSE_TYPES).map(([key, d]) => {
    const category = key === '⚔️ Spécifique Spartan' ? 'spartan' : (key === '💚 Footing récupération' ? 'recuperation' : 'course');
    const est = COURSE_ESTIMATE[key] || { min: 50, kcalMin: 10 };
    const { warmup, main, cooldown } = parseDeroule(d.deroule);
    const interval = COURSE_FEATURED_INTERVAL[key] || null;
    return {
      id: 'course-' + key,
      category,
      name: key.replace(/^[^\s]+\s/, ''),
      emoji: key.split(' ')[0],
      objectif: d.objectif,
      duration: est.min,
      durationText: d.duree,
      difficulty: COURSE_DIFFICULTY[key] || 'intermediaire',
      benefits: COURSE_BENEFITS[key] || [3, 3, 3, 3],
      equipment: ['👟 Chaussures de course', '⌚ Montre GPS', '💧 Eau'],
      warmup: warmup.length ? warmup : ['Échauffement progressif 10 min'],
      main: main.length ? main : [d.objectif],
      cooldown: cooldown.length ? cooldown : ['Retour au calme 5 min'],
      interval,
      zone: d.zone,
      allure: d.allure,
      conseils: d.conseils || [],
      coachTip: (d.conseils && d.conseils[0]) || 'Reste à l\u2019écoute de tes sensations.',
    };
  });
}

const MUSCU_META = {
  '🏋️ Haut A': { subtitle: 'Push dominant', benefits: [5, 4, 3, 2] },
  '🏋️ Haut B': { subtitle: 'Pull dominant', benefits: [5, 4, 3, 2] },
  '🏋️ Haut C': { subtitle: 'Force & explosivité', benefits: [5, 3, 3, 2] },
  '🦵 Bas A': { subtitle: 'Squat dominant', benefits: [5, 4, 4, 2] },
  '🦵 Bas B': { subtitle: 'Hip hinge dominant', benefits: [5, 3, 4, 2] },
  '🦵 Bas C': { subtitle: 'Unilatéral & fonctionnel', benefits: [4, 3, 4, 3] },
  '⚡ Full A': { subtitle: 'Équilibre & mobilité', benefits: [2, 2, 4, 4] },
  '⚡ Full B': { subtitle: 'Renforcement léger', benefits: [2, 2, 4, 3] },
};

function buildMuscuSessions() {
  return Object.entries(MUSCULATION).filter(([k]) => k !== '😴 Repos actif').map(([key, exs]) => {
    const avgRpe = exs.reduce((s, e) => s + (e.rpe || 6), 0) / Math.max(1, exs.length);
    const difficulty = avgRpe < 5.5 ? 'debutant' : avgRpe < 6.5 ? 'intermediaire' : avgRpe < 7.5 ? 'confirme' : 'elite';
    const equipmentSet = Array.from(new Set(exs.map(e => e.equipement).filter(Boolean)));
    const meta = MUSCU_META[key] || { subtitle: '', benefits: [4, 3, 3, 2] };
    const isFullBody = key.startsWith('⚡');
    const duration = isFullBody ? 45 : 45;
    return {
      id: 'muscu-' + key,
      category: 'muscu',
      name: key.replace(/^[^\s]+\s/, ''),
      emoji: key.split(' ')[0],
      objectif: meta.subtitle,
      duration,
      durationText: `${duration} min`,
      difficulty,
      benefits: meta.benefits,
      equipment: equipmentSet.length ? equipmentSet.map(e => '🏋️ ' + e) : ['🏋️ Poids du corps'],
      warmup: ['Échauffement articulaire complet (5-10 min)', 'Activation musculaire légère'],
      main: exs,
      cooldown: ['Étirements des groupes musculaires travaillés (5 min)'],
      interval: null,
      coachTip: 'Garde 2 à 3 répétitions en réserve sur chaque série.',
    };
  });
}

function buildSpartanSessions() {
  return [
    {
      id: 'spartan-grip-core',
      category: 'spartan',
      name: 'Grip & Core',
      emoji: '⚔️',
      objectif: 'Renforcer la préhension et la sangle abdominale',
      duration: 15,
      durationText: '15 min',
      difficulty: 'confirme',
      benefits: [5, 5, 2, 3],
      equipment: ['🧗 Barre de traction', '🪨 Poids ou sac lesté'],
      warmup: ['Mobilité poignets et épaules (3 min)'],
      main: [
        { nom: 'Dead Hang', cible: 'Avant-bras / grip', series: 3, reps: '30-45s', repos: '45s', tempo: 'Isométrique' },
        { nom: 'Farmer Carry', cible: 'Grip / gainage', series: 3, reps: '30m', repos: '60s', tempo: 'Marche contrôlée' },
        { nom: 'Planche', cible: 'Core', series: 3, reps: '45-60s', repos: '45s', tempo: 'Isométrique' },
        { nom: 'Pinch Grip', cible: 'Avant-bras', series: 3, reps: '20-30s', repos: '30s', tempo: 'Isométrique' },
      ],
      cooldown: ['Étirements avant-bras et épaules (3 min)'],
      interval: null,
      coachTip: 'Respiration calme et régulière pendant chaque tenue isométrique.',
    },
    {
      id: 'spartan-force',
      category: 'spartan',
      name: 'Force Spartan',
      emoji: '⚔️',
      objectif: 'Développer la force fonctionnelle et le portage de charge',
      duration: 45,
      durationText: '45 min',
      difficulty: 'elite',
      benefits: [4, 2, 5, 4],
      equipment: ['🎒 Sac lesté', '🧗 Barre de traction', '💧 Eau'],
      warmup: ['Footing léger 10 min + mobilité articulaire'],
      main: [
        { nom: 'Tractions lestées', cible: 'Dos', series: 4, reps: '5-8', repos: '150s', tempo: '2-0-2-0' },
        { nom: 'Farmer Carry lourd', cible: 'Full body', series: 4, reps: '40m', repos: '90s', tempo: 'Marche contrôlée' },
        { nom: 'Burpees', cible: 'Cardio / explosivité', series: 4, reps: '10-15', repos: '60s', tempo: 'Explosif' },
        { nom: 'Squats lestés', cible: 'Jambes', series: 4, reps: '12-15', repos: '90s', tempo: '2-0-1-0' },
      ],
      cooldown: ['Étirements complets + automassage (10 min)'],
      interval: null,
      coachTip: 'S\u2019entraîner avec le matériel réel de course pour habituer le corps.',
    },
  ];
}

function buildMobiliteSessions() {
  return [
    {
      id: 'mobilite-hanches',
      category: 'mobilite',
      name: 'Mobilité hanches',
      emoji: '🧘',
      objectif: 'Gagner en amplitude au niveau des hanches',
      duration: 20,
      durationText: '20 min',
      difficulty: 'debutant',
      benefits: [5, 5, 4, 3],
      equipment: ['🧘 Tapis'],
      warmup: ['Respiration diaphragmatique (2 min)'],
      main: [
        { nom: 'Cercles de hanches', cible: 'Mobilité', series: 2, reps: '10/sens', repos: '—', tempo: 'Fluide' },
        { nom: 'Fente + rotation thoracique', cible: 'Hanches / dos', series: 2, reps: '8/côté', repos: '—', tempo: 'Contrôlé' },
        { nom: 'Étirement piriforme', cible: 'Fessiers', series: 2, reps: '45s/côté', repos: '—', tempo: 'Statique' },
        { nom: 'Étirement fléchisseurs de hanche', cible: 'Psoas', series: 2, reps: '45s/côté', repos: '—', tempo: 'Statique' },
      ],
      cooldown: ['Respiration calme allongé (2 min)'],
      interval: null,
      coachTip: 'Aucune douleur ne doit apparaître : reste dans une amplitude confortable.',
    },
    {
      id: 'mobilite-haut-corps',
      category: 'mobilite',
      name: 'Mobilité épaules & colonne',
      emoji: '🧘',
      objectif: 'Libérer les épaules et la colonne vertébrale',
      duration: 20,
      durationText: '20 min',
      difficulty: 'debutant',
      benefits: [5, 4, 3, 3],
      equipment: ['🧘 Tapis'],
      warmup: ['Mobilisation légère des bras (2 min)'],
      main: [
        { nom: 'Rotation thoracique', cible: 'Colonne', series: 2, reps: '10/côté', repos: '—', tempo: 'Fluide' },
        { nom: 'Chat-vache', cible: 'Colonne', series: 2, reps: '10', repos: '—', tempo: 'Fluide' },
        { nom: 'Rotation externe épaule (élastique)', cible: 'Coiffe des rotateurs', series: 2, reps: '12', repos: '—', tempo: 'Contrôlé' },
      ],
      cooldown: ['Étirement pectoraux et dos (3 min)'],
      interval: null,
      coachTip: 'Idéal les jours de repos actif ou après une séance de musculation.',
    },
    {
      id: 'mobilite-complet',
      category: 'mobilite',
      name: 'Étirements complets',
      emoji: '🧘',
      objectif: 'Routine complète de souplesse corps entier',
      duration: 30,
      durationText: '30 min',
      difficulty: 'debutant',
      benefits: [5, 5, 4, 4],
      equipment: ['🧘 Tapis'],
      warmup: ['Marche sur place légère (2 min)'],
      main: [
        { nom: 'Étirement ischios', cible: 'Arrière cuisse', series: 2, reps: '45s/côté', repos: '—', tempo: 'Statique' },
        { nom: 'Étirement quadriceps', cible: 'Avant cuisse', series: 2, reps: '45s/côté', repos: '—', tempo: 'Statique' },
        { nom: 'Étirement mollets', cible: 'Mollets', series: 2, reps: '45s/côté', repos: '—', tempo: 'Statique' },
      ],
      cooldown: ['Respiration profonde (3 min)'],
      interval: null,
      coachTip: 'Idéal le dimanche pour préparer la semaine suivante.',
    },
  ];
}

function buildRecuperationSessions() {
  const footing = COURSE_TYPES['💚 Footing récupération'];
  const { warmup, main, cooldown } = parseDeroule(footing.deroule);
  return [
    {
      id: 'recup-footing',
      category: 'recuperation',
      name: 'Footing récupération',
      emoji: '💚',
      objectif: footing.objectif,
      duration: 30,
      durationText: footing.duree,
      difficulty: 'debutant',
      benefits: [5, 4, 3, 2],
      equipment: ['👟 Chaussures de course', '💧 Eau'],
      warmup: warmup.length ? warmup : ['Départ direct en footing très lent'],
      main: main.length ? main : [footing.objectif],
      cooldown: cooldown.length ? cooldown : ['Retour progressif à la marche'],
      interval: null,
      zone: footing.zone,
      coachTip: 'Plus lent que ce que tu penses — c\u2019est le but.',
    },
    {
      id: 'recup-repos-actif',
      category: 'recuperation',
      name: 'Repos actif',
      emoji: '😴',
      objectif: 'Réveil musculaire léger sans générer de fatigue',
      duration: 15,
      durationText: '15 min',
      difficulty: 'debutant',
      benefits: [4, 3, 3, 2],
      equipment: ['🧘 Tapis'],
      warmup: ['Aucun échauffement nécessaire'],
      main: (MUSCULATION['😴 Repos actif'] || []),
      cooldown: ['Étirements doux (3 min)'],
      interval: null,
      coachTip: 'Optionnel en cas de courbatures — écoute ton corps.',
    },
    {
      id: 'recup-respiration',
      category: 'recuperation',
      name: 'Étirements & respiration',
      emoji: '💧',
      objectif: 'Favoriser la récupération nerveuse et musculaire',
      duration: 20,
      durationText: '20 min',
      difficulty: 'debutant',
      benefits: [5, 3, 5, 4],
      equipment: ['🧘 Tapis'],
      warmup: ['Installation au calme (1 min)'],
      main: [
        { nom: 'Respiration diaphragmatique', cible: 'Système nerveux', series: 1, reps: '5 min', repos: '—', tempo: 'Lent' },
        { nom: 'Étirements doux corps entier', cible: 'Global', series: 1, reps: '10 min', repos: '—', tempo: 'Statique' },
      ],
      cooldown: ['Relaxation finale (3 min)'],
      interval: null,
      coachTip: 'Un bon moment pour couper les écrans et respirer calmement.',
    },
  ];
}

const SESSION_LIBRARY = [
  ...buildCourseSessions(),
  ...buildMuscuSessions(),
  ...buildSpartanSessions(),
  ...buildMobiliteSessions(),
  ...buildRecuperationSessions(),
];

function ProgramCard({ icon: Icon, iconBg, iconColor, kicker, title, minutes, tag, onClick }) {
  return (
    <button onClick={onClick} className="spartan-tap" style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
      background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 20,
      padding: '16px 16px', cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={24} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: TEXT_SOFT, marginBottom: 2 }}>{kicker}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: TEXT_SOFT }}>
          <span>⏱ {minutes} min</span>
          <span>{tag}</span>
        </div>
      </div>
      <ChevronRight size={20} color={TEXT_FAINT} />
    </button>
  );
}

function DetailModal({ onClose, title, kicker, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(2,3,4,0.72)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'flex-end', zIndex: 50,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '82vh', overflowY: 'auto', background: CARD,
        borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '10px 20px 28px 20px',
        border: `1px solid ${CARD_BORDER}`, borderBottom: 'none',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#2A313B', margin: '6px auto 18px auto' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12.5, color: TEXT_SOFT, marginBottom: 2 }}>{kicker}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: TEXT }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: '#1B2129', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
            <X size={16} color={TEXT_SOFT} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}


function RoutineDetail({ day }) {
  const items = [
    { label: `Pompes — ${day.vPompes || ''}`, value: day.pompes, unit: '' },
    { label: `Squats — ${day.vSquats || ''}`, value: day.squats, unit: '' },
    { label: 'Fentes', value: day.fentes, unit: '' },
    { label: `Abdos — ${day.vAbdos || ''}`, value: day.abdos, unit: '' },
    { label: 'Tractions', value: day.tractions, unit: '' },
    { label: `Gainage — ${day.vGainage || ''}`, value: day.gainage, unit: 's' },
    { label: 'Chaise', value: day.chaise, unit: 's' },
    { label: `Grip — ${day.vGrip || ''}`, value: day.grip, unit: 's' },
    { label: 'Mollets', value: day.mollets, unit: '' },
    { label: 'Tibial antérieur', value: day.tibial, unit: '' },
    { label: 'Mobilité', value: day.mobilite, unit: 'min' },
  ].filter(it => it.value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#0D1015', borderRadius: 12, padding: '11px 14px',
        }}>
          <span style={{ fontSize: 14, color: TEXT }}>{it.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{it.value}{it.unit}</span>
        </div>
      ))}
    </div>
  );
}

function MuscuDetail({ exercises }) {
  if (!exercises) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {exercises.map((ex, i) => (
        <div key={i} style={{ background: '#0D1015', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 14, color: TEXT, fontWeight: 700 }}>{ex.nom}</span>
            <span style={{ fontSize: 13.5, color: ACCENT, fontWeight: 700 }}>{ex.series}×{ex.reps}</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT_SOFT, marginTop: 3 }}>{ex.cible} · repos {ex.repos} · tempo {ex.tempo}{ex.rpe ? ` · RPE ${ex.rpe}` : ''}</div>
          {ex.consignes && <div style={{ fontSize: 12, color: '#7C828C', marginTop: 4, fontStyle: 'italic' }}>{ex.consignes}</div>}
        </div>
      ))}
    </div>
  );
}

function CourseDetail({ match }) {
  if (!match) return null;
  if (match.isRace) {
    return <div style={{ fontSize: 14, color: TEXT_SOFT }}>Jour de course — repos, matériel prêt, échauffement léger. Bonne course, Spartan ⚔️</div>;
  }
  if (!match.data) return <div style={{ fontSize: 13, color: TEXT_SOFT }}>Aucun détail disponible.</div>;
  const d = match.data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#0D1015', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10.5, color: TEXT_SOFT, textTransform: 'uppercase' }}>Durée</div>
          <div style={{ fontSize: 13.5, color: TEXT, marginTop: 2 }}>{d.duree}</div>
        </div>
        <div style={{ background: '#0D1015', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10.5, color: TEXT_SOFT, textTransform: 'uppercase' }}>Zone</div>
          <div style={{ fontSize: 13.5, color: TEXT, marginTop: 2 }}>{d.zone}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', marginBottom: 7, letterSpacing: '0.04em' }}>Déroulé</div>
        {d.deroule.map((s, i) => (
          <div key={i} style={{ fontSize: 13.5, color: '#D6D9DD', padding: '5px 0 5px 12px', borderLeft: `2px solid ${ACCENT}55`, marginBottom: 2 }}>{s}</div>
        ))}
      </div>
      {d.variantes && (
        <div>
          <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', marginBottom: 7, letterSpacing: '0.04em' }}>Variantes</div>
          {Object.entries(d.variantes).map(([k, v]) => (
            <div key={k} style={{ fontSize: 13.5, marginBottom: 5 }}>
              <span style={{ color: ACCENT, fontWeight: 700 }}>{k}</span>
              <span style={{ color: TEXT_SOFT }}> — {v}</span>
            </div>
          ))}
        </div>
      )}
      <div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', marginBottom: 7, letterSpacing: '0.04em' }}>Conseils</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#D6D9DD', fontSize: 13.5 }}>
          {d.conseils.map((c, i) => <li key={i} style={{ marginBottom: 4 }}>{c}</li>)}
        </ul>
      </div>
    </div>
  );
}


// ---------- Séances: personal storage hooks ----------
function useKeyValueStore(storageKey, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(storageKey, false);
        if (res && res.value) setValue(JSON.parse(res.value));
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  const update = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      window.storage.set(storageKey, JSON.stringify(next), false).catch(() => {});
      return next;
    });
  }, []);
  return [value, update, loaded];
}

// ---------- Profil tab: real-data helpers ----------
function bestWeek(completions) {
  const byWeek = {};
  DAYS.forEach(d => {
    if (completions[d.date] && completions[d.date].fait) {
      byWeek[d.semaine] = (byWeek[d.semaine] || { charge: 0, sessions: 0, first: d.date });
      byWeek[d.semaine].charge += (d.charge || 0);
      byWeek[d.semaine].sessions += 1;
    }
  });
  let best = null;
  Object.entries(byWeek).forEach(([w, v]) => {
    if (!best || v.sessions > best.sessions) best = { week: Number(w), ...v };
  });
  return best;
}

function bestMonth(completions) {
  const byMonth = {};
  DAYS.forEach(d => {
    if (completions[d.date] && completions[d.date].fait) {
      const ym = d.date.slice(0, 7);
      byMonth[ym] = (byMonth[ym] || 0) + 1;
    }
  });
  let best = null;
  Object.entries(byMonth).forEach(([ym, count]) => {
    if (!best || count > best.count) best = { month: ym, count };
  });
  return best;
}

function longestSession(completions) {
  let best = null;
  DAYS.forEach(d => {
    if (completions[d.date] && completions[d.date].fait) {
      const est = estimateSession(d);
      if (!best || est.totalMin > best.totalMin) best = { date: d.date, totalMin: est.totalMin };
    }
  });
  return best;
}

function formatMonthLabel(ym) {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function memberSinceLabel() {
  return dateFromISO(START_DATE).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// Local export/import/reset — the actual, working "backup" mechanism (no cloud backend exists).
// ---------- Data architecture: versioning & migrations ----------
// APP_VERSION is the human-facing release number shown in "À propos".
// DATA_SCHEMA_VERSION describes the *shape* of stored user data, independent of the UI/design.
// Bumping the UI (colors, layouts, new screens) never requires a schema bump.
// Only bump DATA_SCHEMA_VERSION when a stored key's structure actually changes, and add a
// migration function to MIGRATIONS so existing users upgrade in place without losing data.
const APP_VERSION = '1.0.0';
const DATA_SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'app-schema-version';

const APP_STORAGE_KEYS = [
  'completions', 'session-favorites', 'session-records', 'session-notes', 'session-logs',
  'weekly-recap-dismissed', 'profile-info', 'profile-prefs', 'profile-weekly-plan',
  'profile-notifications', 'profile-appearance', 'profile-equipment',
];

// Ordered list of migrations. Each entry upgrades data FROM its key version TO key+1.
// Empty today (V1 is the first schema) — this is the scaffold future versions will extend.
// Example for later: MIGRATIONS[2] = (dump) => { /* transform dump in place, return it */ return dump; };
const MIGRATIONS = {
  // 1: (dump) => dump,  // template for the next migration once schema v2 exists
};

function migrateDump(dump, fromVersion) {
  let version = fromVersion;
  let data = dump;
  while (version < DATA_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (step) data = step(data);
    version += 1;
  }
  return data;
}

async function readSchemaVersion() {
  try {
    const res = await window.storage.get(SCHEMA_VERSION_KEY, false);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) { /* not set yet: fresh install or pre-versioning data */ }
  return null;
}

// Runs once per app load. Ensures old local data (or a restored backup) is upgraded to the
// current schema before any screen reads it, and stamps the current version once done.
async function ensureDataMigrated() {
  const stored = await readSchemaVersion();
  const fromVersion = stored == null ? DATA_SCHEMA_VERSION : stored; // no stamp yet = treat as current (first install)
  if (fromVersion < DATA_SCHEMA_VERSION) {
    const dump = {};
    for (const key of APP_STORAGE_KEYS) {
      try {
        const res = await window.storage.get(key, false);
        if (res && res.value) dump[key] = JSON.parse(res.value);
      } catch (e) { /* key absent */ }
    }
    const migrated = migrateDump(dump, fromVersion);
    for (const key of Object.keys(migrated)) {
      await window.storage.set(key, JSON.stringify(migrated[key]), false);
    }
  }
  await window.storage.set(SCHEMA_VERSION_KEY, JSON.stringify(DATA_SCHEMA_VERSION), false);
}

// Backup envelope carries its own version numbers so an import from an older (or newer)
// install can be migrated on the way in, instead of silently corrupting current data.
async function exportAllData() {
  const dump = {};
  for (const key of APP_STORAGE_KEYS) {
    try {
      const res = await window.storage.get(key, false);
      if (res && res.value) dump[key] = JSON.parse(res.value);
    } catch (e) { /* key absent, skip */ }
  }
  const envelope = {
    app: 'spartan365',
    appVersion: APP_VERSION,
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: dump,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `spartan365-sauvegarde-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importAllData(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Accept both the new envelope format and a raw legacy dump (pre-versioning exports).
  const isEnvelope = parsed && typeof parsed === 'object' && parsed.data && typeof parsed.schemaVersion === 'number';
  const incomingVersion = isEnvelope ? parsed.schemaVersion : 1;
  const rawData = isEnvelope ? parsed.data : parsed;
  const migrated = migrateDump(rawData, incomingVersion);
  for (const key of Object.keys(migrated)) {
    if (!APP_STORAGE_KEYS.includes(key)) continue;
    await window.storage.set(key, JSON.stringify(migrated[key]), false);
  }
  await window.storage.set(SCHEMA_VERSION_KEY, JSON.stringify(DATA_SCHEMA_VERSION), false);
}

async function resetAllData() {
  for (const key of APP_STORAGE_KEYS) {
    try { await window.storage.delete(key, false); } catch (e) { /* already absent */ }
  }
  try { await window.storage.delete(SCHEMA_VERSION_KEY, false); } catch (e) { /* already absent */ }
}


// ---------- Profil tab: reusable settings primitives ----------
function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="spartan-tap" style={{
      width: 42, height: 25, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
      background: value ? ACCENT : '#2A313B', position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2.5, left: value ? 19 : 2.5, width: 20, height: 20, borderRadius: '50%',
        background: value ? '#0A0C0E' : '#8A8F98', transition: 'left 0.2s cubic-bezier(0.16,1,0.3,1)',
      }} />
    </button>
  );
}

function SettingsGroup({ title, action, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        {action}
      </div>
      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 20px -14px rgba(0,0,0,0.5)' }}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, iconColor, label, sublabel, value, valueColor, onClick, danger, last }) {
  return (
    <button onClick={onClick} className={onClick ? 'spartan-tap' : ''} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
      background: 'transparent', border: 'none', borderBottom: last ? 'none' : `1px solid ${CARD_BORDER}`,
      cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
    }}>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 9, background: (danger ? '#FF6B5C' : (iconColor || TEXT_SOFT)) + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={danger ? '#FF6B5C' : (iconColor || TEXT_SOFT)} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: danger ? '#FF6B5C' : TEXT, fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: TEXT_SOFT, marginTop: 1 }}>{sublabel}</div>}
      </div>
      {value !== undefined && <span style={{ fontSize: 12.5, color: valueColor || TEXT_SOFT, fontWeight: 600, flexShrink: 0 }}>{value}</span>}
      {onClick && <ChevronRight size={16} color={TEXT_FAINT} style={{ flexShrink: 0 }} />}
    </button>
  );
}

function ToggleSettingsRow({ icon: Icon, iconColor, label, sublabel, value, onChange, last }) {
  return (
    <div style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
      borderBottom: last ? 'none' : `1px solid ${CARD_BORDER}`,
    }}>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 9, background: (iconColor || TEXT_SOFT) + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={iconColor || TEXT_SOFT} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: TEXT_SOFT, marginTop: 1 }}>{sublabel}</div>}
      </div>
      <ToggleSwitch value={value} onChange={onChange} />
    </div>
  );
}

function EditableValueRow({ icon: Icon, iconColor, label, value, unit, placeholder, onSave, last }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const commit = () => { onSave(draft.trim()); setEditing(false); };
  return (
    <div style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px',
      borderBottom: last ? 'none' : `1px solid ${CARD_BORDER}`,
    }}>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 9, background: (iconColor || TEXT_SOFT) + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={iconColor || TEXT_SOFT} />
        </div>
      )}
      <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, flex: 1 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus placeholder={placeholder}
            onKeyDown={e => e.key === 'Enter' && commit()}
            style={{ width: 70, background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 7, padding: '5px 8px', color: TEXT, fontSize: 12.5, fontFamily: FONT, outline: 'none', textAlign: 'right' }} />
          <button onClick={commit} style={{ background: ACCENT, border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer' }}>
            <Send size={11} color="#0A0C0E" />
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="spartan-tap" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12.5, color: value ? TEXT_SOFT : TEXT_FAINT, fontWeight: 600 }}>{value ? `${value}${unit || ''}` : (placeholder || 'Renseigner')}</span>
          <ChevronRight size={14} color={TEXT_FAINT} />
        </button>
      )}
    </div>
  );
}


function computeStats(completions) {
  const validatedDays = DAYS.filter(d => completions[d.date] && completions[d.date].fait);
  const totals = { pompes: 0, squats: 0, tractions: 0, gainage: 0, grip: 0, points: 0 };
  validatedDays.forEach(d => {
    totals.pompes += d.pompes || 0; totals.squats += d.squats || 0; totals.tractions += d.tractions || 0;
    totals.gainage += d.gainage || 0; totals.grip += d.grip || 0; totals.points += d.points || 0;
  });
  const validatedJourNums = new Set(validatedDays.map(d => d.jour));
  let longest = 0, run = 0;
  for (let j = 1; j <= 366; j++) { if (validatedJourNums.has(j)) { run++; longest = Math.max(longest, run); } else run = 0; }
  let current = 0;
  const maxValidated = validatedDays.reduce((m, d) => Math.max(m, d.jour), 0);
  if (maxValidated > 0) for (let j = maxValidated; j >= 1; j--) { if (validatedJourNums.has(j)) current++; else break; }
  return { jourValides: validatedDays.length, totals, longest, current };
}

// ---------- Progression tab: period, comparison, skills, badges ----------
const PERIODS = [
  { key: '7j', label: '7J', days: 7 },
  { key: '30j', label: '30J', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '1a', label: '1A', days: 365 },
  { key: 'tout', label: 'Tout', days: null },
];

function periodDayList(periodKey, todayIdx) {
  const period = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
  const end = todayIdx;
  const start = period.days ? Math.max(0, end - period.days + 1) : 0;
  return DAYS.slice(start, end + 1);
}
function previousPeriodDayList(periodKey, todayIdx) {
  const period = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
  if (!period.days) return [];
  const end = todayIdx;
  const curStart = Math.max(0, end - period.days + 1);
  const prevEnd = curStart - 1;
  if (prevEnd < 0) return [];
  const prevStart = Math.max(0, prevEnd - period.days + 1);
  return DAYS.slice(prevStart, prevEnd + 1);
}

function periodStats(dayList, completions) {
  const validated = dayList.filter(d => completions[d.date] && completions[d.date].fait);
  const totalCharge = validated.reduce((s, d) => s + (d.charge || 0), 0);
  const totalPoints = validated.reduce((s, d) => s + (d.points || 0), 0);
  let totalMin = 0, totalKcal = 0;
  validated.forEach(d => { const e = estimateSession(d); totalMin += e.totalMin; totalKcal += e.totalKcal; });
  return {
    planned: dayList.length, done: validated.length, totalCharge, totalPoints, totalMin, totalKcal,
    completionRate: dayList.length ? Math.round((validated.length / dayList.length) * 100) : 0,
  };
}

function pctDelta(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

// "Compétences" — real adherence-based proxies, not fabricated ability scores.
function computeSkills(dayList, completions) {
  const validated = dayList.filter(d => completions[d.date] && completions[d.date].fait);
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const totalCourseDays = dayList.filter(d => d.course).length;
  const doneCourseDays = validated.filter(d => d.course).length;
  const totalMuscuDays = dayList.filter(d => d.seanceMuscu && d.seanceMuscu !== '—').length;
  const doneMuscuDays = validated.filter(d => d.seanceMuscu && d.seanceMuscu !== '—').length;
  const totalGrip = dayList.reduce((s, d) => s + (d.grip || 0), 0);
  const doneGrip = validated.reduce((s, d) => s + (d.grip || 0), 0);
  const totalMobilite = dayList.reduce((s, d) => s + (d.mobilite || 0), 0);
  const doneMobilite = validated.reduce((s, d) => s + (d.mobilite || 0), 0);
  const overallStats = computeStats(completions);
  return [
    { label: 'Endurance', icon: PersonStanding, color: CAT_COURSE, value: pct(doneCourseDays, totalCourseDays) },
    { label: 'Force', icon: Dumbbell, color: CAT_MUSCU, value: pct(doneMuscuDays, totalMuscuDays) },
    { label: 'Grip', icon: Shield, color: CAT_SPARTAN, value: pct(doneGrip, totalGrip) },
    { label: 'Mental', icon: Flame, color: '#E8D94C', value: Math.min(100, Math.round((overallStats.current / 30) * 100)) },
    { label: 'Mobilité', icon: Sparkles, color: CAT_MOBILITE, value: pct(doneMobilite, totalMobilite) },
  ];
}

const RARITY = {
  bronze: { label: 'Bronze', color: '#CD7F32' },
  argent: { label: 'Argent', color: '#B8C4D0' },
  or: { label: 'Or', color: '#E8D94C' },
  legendaire: { label: 'Légendaire', color: '#B98CFF' },
};

function cumulativeTrainingStats(completions, stats) {
  const validated = DAYS.filter(d => completions[d.date] && completions[d.date].fait);
  let totalMin = 0, totalKcal = 0;
  validated.forEach(d => { const e = estimateSession(d); totalMin += e.totalMin; totalKcal += e.totalKcal; });
  return {
    sessions: stats.jourValides,
    hours: Math.round(totalMin / 60),
    kcal: totalKcal,
    pompes: stats.totals.pompes,
    squats: stats.totals.squats,
    tractions: stats.totals.tractions,
  };
}

function computeBadges(completions, stats, level) {
  const [semi, marathon, spartan] = RACES;
  const done = (r) => !!(completions[r.date] && completions[r.date].fait);
  const mk = (id, label, icon, rarity, current, target, unit) => ({
    id, label, icon, rarity, color: RARITY[rarity].color,
    achieved: current >= target, progress: Math.min(1, current / target),
    current: Math.min(current, target), target, unit,
  });
  return [
    mk('streak7', '7 jours d\u2019affilée', Flame, 'bronze', stats.longest, 7, 'jours'),
    mk('streak30', '30 jours d\u2019affilée', Flame, 'argent', stats.longest, 30, 'jours'),
    mk('sessions100', '100 séances validées', CheckCircle2, 'argent', stats.jourValides, 100, 'séances'),
    mk('fullprogram', 'Programme complet', Trophy, 'legendaire', stats.jourValides, 366, 'jours'),
    mk('pompes1000', '1000 pompes cumulées', Dumbbell, 'bronze', stats.totals.pompes, 1000, 'pompes'),
    mk('tractions300', '300 tractions cumulées', Shield, 'argent', stats.totals.tractions, 300, 'tractions'),
    mk('niveau5', 'Niveau 5 atteint', Star, 'bronze', level.level, 5, 'niveaux'),
    mk('niveau10', 'Niveau 10 atteint', Star, 'or', level.level, 10, 'niveaux'),
    mk('semi', 'Premier Semi-marathon', Trophy, 'or', done(semi) ? 1 : 0, 1, ''),
    mk('marathon', 'Premier Marathon', Trophy, 'legendaire', done(marathon) ? 1 : 0, 1, ''),
    mk('spartanfinisher', 'Spartan Ultra Finisher', Trophy, 'legendaire', done(spartan) ? 1 : 0, 1, ''),
  ];
}

function PeriodFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: '#0D1015', borderRadius: 14, padding: 4 }}>
      {PERIODS.map(p => (
        <button key={p.key} onClick={() => onChange(p.key)} className="spartan-tap" style={{
          flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: value === p.key ? ACCENT : 'transparent',
          color: value === p.key ? '#0A0C0E' : TEXT_SOFT, fontSize: 11.5, fontWeight: 800,
        }}>{p.label}</button>
      ))}
    </div>
  );
}

// Architecture note: pass `bgImage` once a real Spartan-level illustration exists —
// swaps in for the generated scene backdrop with no other change.
function LevelHeroCard({ level, weekSessions, bgImage }) {
  const seed = hashSeed('level-hero-' + level.level);
  const pct = Math.round((level.xpIntoLevel / level.xpPerLevel) * 100);
  const animatedXp = useCountUp(level.xpIntoLevel, 1100);
  const remaining = level.xpPerLevel - level.xpIntoLevel;
  return (
    <div style={{ position: 'relative', borderRadius: 26, overflow: 'visible' }}>
      <div style={{ position: 'relative', height: 190, borderRadius: 26, overflow: 'hidden', boxShadow: `0 18px 40px -12px ${ACCENT}33` }}>
        {bgImage ? (
          <img src={bgImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(70% 90% at 75% 5%, rgba(255,255,255,0.13), transparent 60%),
                         radial-gradient(150% 150% at 100% 110%, ${ACCENT}3A, transparent 58%),
                         linear-gradient(160deg, #1A1F14 0%, #06070A 100%)`,
          }}>
            <SceneComposition variant="obstacle" seed={seed} color={ACCENT} height={190} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 20%, rgba(5,6,7,0.35) 65%, rgba(5,6,7,0.9) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 60px 14px rgba(0,0,0,0.4)' }} />

        <div style={{ position: 'absolute', left: 20, top: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={13} color={ACCENT} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Niveau Spartan</span>
        </div>

        <div style={{ position: 'absolute', left: 20, bottom: 30, right: 100 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{level.name}</div>
          <div style={{ fontSize: 11.5, color: '#C7CAD1', marginTop: 3 }}>+{weekSessions} séance{weekSessions > 1 ? 's' : ''} cette semaine</div>
        </div>

        {/* Floating level medallion */}
        <div style={{ position: 'absolute', right: 16, bottom: -2, width: 92, height: 92 }}>
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)`, filter: 'blur(6px)' }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: `conic-gradient(${ACCENT} ${pct * 3.6}deg, #1B2129 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', background: '#0B0D11',
              border: `1px solid ${ACCENT}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 9, color: TEXT_SOFT, letterSpacing: '0.05em' }}>NIV.</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{level.level}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderTop: 'none', borderRadius: '0 0 26px 26px', padding: '18px 18px 16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{animatedXp} <span style={{ color: TEXT_SOFT, fontWeight: 600 }}>/ {level.xpPerLevel} XP</span></span>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{remaining} XP avant le niveau {level.level + 1}</span>
        </div>
        <MiniBar pct={pct} glow />
      </div>
    </div>
  );
}

function SkillRadar({ skills, size = 220 }) {
  const [reveal, setReveal] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReveal(1));
    return () => cancelAnimationFrame(id);
  }, [skills]);

  const n = skills.length;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.36;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointFor = (i, r) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const dataPoints = skills.map((s, i) => pointFor(i, R * (s.value / 100) * reveal));
  const dataPath = dataPoints.map(p => p.join(',')).join(' ');

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.45" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0.08" />
        </radialGradient>
      </defs>
      {rings.map((r, i) => (
        <polygon key={i}
          points={skills.map((_, si) => pointFor(si, R * r).join(',')).join(' ')}
          fill="none" stroke={CARD_BORDER} strokeWidth="1"
        />
      ))}
      {skills.map((s, i) => {
        const [x, y] = pointFor(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={CARD_BORDER} strokeWidth="1" />;
      })}
      <polygon points={dataPath} fill="url(#radarFill)" stroke={ACCENT} strokeWidth="2"
        style={{ transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={ACCENT} style={{ transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      ))}
      {skills.map((s, i) => {
        const [x, y] = pointFor(i, R * 1.32);
        return (
          <g key={i} style={{ transform: `translate(${x}px, ${y}px)` }}>
            <foreignObject x={-28} y={-11} width={56} height={26} style={{ overflow: 'visible' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <s.icon size={13} color={s.color} />
                <span style={{ fontSize: 8.5, fontWeight: 700, color: TEXT_SOFT, whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

function SkillBars({ skills }) {
  return (
    <div style={{ position: 'relative', background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', overflow: 'hidden', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
        <SceneComposition variant="obstacle" seed={hashSeed('skills')} color={ACCENT} height={260} />
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ton profil Spartan</div>
        <div style={{ fontSize: 10.5, color: TEXT_FAINT, marginTop: 3, marginBottom: 6 }}>Basé sur ton assiduité réelle sur la période</div>
        <SkillRadar skills={skills} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18 }}>
          {skills.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0D1015', borderRadius: 10, padding: '7px 10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: TEXT }}>
                <s.icon size={11} color={s.color} /> {s.label}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: s.color }}>{s.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChargeHistoryChart({ dayList, completions }) {
  // Aggregate into weekly buckets when the period is long, otherwise show daily bars.
  const daily = dayList.length <= 14;
  let buckets;
  if (daily) {
    buckets = dayList.map(d => ({ label: weekdayLabel(d.date).slice(0, 2), value: (completions[d.date] && completions[d.date].fait) ? (d.charge || 0) : 0 }));
  } else {
    const byWeek = {};
    dayList.forEach(d => {
      if (!byWeek[d.semaine]) byWeek[d.semaine] = 0;
      if (completions[d.date] && completions[d.date].fait) byWeek[d.semaine] += (d.charge || 0);
    });
    const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
    const shown = weeks.slice(-16);
    buckets = shown.map(w => ({ label: 'S' + w, value: byWeek[w] }));
  }
  const max = Math.max(1, ...buckets.map(b => b.value));
  const total = buckets.reduce((s, b) => s + b.value, 0);
  const peakIdx = buckets.reduce((mi, b, i, arr) => (b.value > arr[mi].value ? i : mi), 0);
  const gradId = 'chargeGrad';
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charge d’entraînement</span>
        <span style={{ fontSize: 11, color: TEXT_FAINT }}>total {total}</span>
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="1" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: buckets.length > 20 ? 3 : 7, height: 110, overflowX: buckets.length > 20 ? 'auto' : 'visible' }}>
        {buckets.map((b, i) => {
          const h = Math.max(4, (b.value / max) * 100);
          const isPeak = i === peakIdx && b.value > 0;
          return (
            <div key={i} style={{ flex: buckets.length > 20 ? '0 0 10px' : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%', maxWidth: 20, height: `${h}%`, borderRadius: 4,
                background: b.value > 0 ? `url(#${gradId})` : '#232A34',
                boxShadow: isPeak ? `0 0 12px ${ACCENT}77` : 'none',
                transition: 'height 0.8s cubic-bezier(0.16,1,0.3,1)',
              }} />
              {buckets.length <= 20 && <span style={{ fontSize: 8.5, fontWeight: 700, color: TEXT_FAINT }}>{b.label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisciplineDonutCard({ dayList }) {
  const parts = weekCategoryBreakdown(dayList);
  let acc = 0;
  const stops = parts.map(p => { const start = acc; acc += p.pct; return `${p.color} ${start}% ${acc}%`; }).join(', ');
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: acc > 0 ? `conic-gradient(${stops})` : '#1B2129', filter: 'blur(10px)', opacity: 0.5 }} />
        <div style={{ position: 'relative', width: 100, height: 100, borderRadius: '50%', background: acc > 0 ? `conic-gradient(${stops})` : '#1B2129', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={19} color={TEXT_SOFT} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Volume par discipline</span>
        {parts.map(p => (
          <div key={p.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#D6D9DD' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block' }} /> {p.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_SOFT }}>{p.minutes} min</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreaksRow({ stats }) {
  const seed = hashSeed('streak-' + stats.current);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', minHeight: 108 }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(60% 90% at 85% 20%, rgba(255,138,92,0.22), transparent 60%),
                         linear-gradient(150deg, #1E1712 0%, #08090B 100%)`,
          }}>
            <SceneComposition variant="sunrise" seed={seed} color="#FF8A5C" height={108} />
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,6,7,0.5) 0%, rgba(5,6,7,0.15) 60%)' }} />
        <div style={{ position: 'relative', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Flame size={30} color="#FF8A5C" />
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {stats.current} <span style={{ fontSize: 15, fontWeight: 700, color: '#E8CFC2' }}>jour{stats.current > 1 ? 's' : ''} d’affilée</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#C7B8AF', marginTop: 4 }}>Ton record est de {stats.longest} jours</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={16} color="#E8D94C" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{stats.longest}<span style={{ fontSize: 10.5, color: TEXT_SOFT, marginLeft: 3 }}>j</span></div>
            <div style={{ fontSize: 9.5, color: TEXT_SOFT }}>Record perso</div>
          </div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={16} color={ACCENT} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{stats.jourValides}<span style={{ fontSize: 10.5, color: TEXT_SOFT, marginLeft: 3 }}>/ {DAYS.length}</span></div>
            <div style={{ fontSize: 9.5, color: TEXT_SOFT }}>Jours validés</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DualBar({ cur, prev, color }) {
  const max = Math.max(1, cur, prev);
  const [w1, setW1] = useState(0);
  const [w2, setW2] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => { setW1((cur / max) * 100); setW2((prev / max) * 100); });
    return () => cancelAnimationFrame(id);
  }, [cur, prev, max]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ height: 9, borderRadius: 5, background: '#1B2129', overflow: 'hidden' }}>
        <div style={{ width: `${w1}%`, height: '100%', background: color, borderRadius: 5, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <div style={{ height: 5, borderRadius: 3, background: '#1B2129', overflow: 'hidden' }}>
        <div style={{ width: `${w2}%`, height: '100%', background: TEXT_FAINT, borderRadius: 3, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

function ComparisonCard({ periodKey, current, previous }) {
  const period = PERIODS.find(p => p.key === periodKey);
  if (!previous || period.key === 'tout') return null;
  const rows = [
    { label: 'Séances', icon: CheckCircle2, color: ACCENT, cur: current.done, prev: previous.done, unit: '' },
    { label: 'Charge totale', icon: Gauge, color: '#FF8A5C', cur: current.totalCharge, prev: previous.totalCharge, unit: '' },
    { label: 'Points', icon: Star, color: '#E8D94C', cur: current.totalPoints, prev: previous.totalPoints, unit: '' },
    { label: 'Temps', icon: Timer, color: CAT_MUSCU, cur: Math.round(current.totalMin / 60 * 10) / 10, prev: Math.round(previous.totalMin / 60 * 10) / 10, unit: 'h' },
  ];
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cette période vs précédente</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: TEXT_SOFT }}><span style={{ width: 10, height: 4, borderRadius: 2, background: ACCENT, display: 'inline-block' }} /> Actuelle</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: TEXT_FAINT }}><span style={{ width: 10, height: 4, borderRadius: 2, background: TEXT_FAINT, display: 'inline-block' }} /> Précédente</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {rows.map(r => {
          const delta = pctDelta(r.cur, r.prev);
          const up = delta >= 0;
          return (
            <div key={r.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#D6D9DD' }}>
                  <r.icon size={13} color={r.color} /> {r.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: TEXT }}>{r.cur}{r.unit}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: up ? ACCENT : '#FF6B5C', background: (up ? ACCENT : '#FF6B5C') + '1A', padding: '2px 7px', borderRadius: 8 }}>
                    {up ? '▲' : '▼'} {Math.abs(delta)}%
                  </span>
                </div>
              </div>
              <DualBar cur={r.cur} prev={r.prev} color={r.color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Architecture note: pass `coachImage` once a real Coach Spartan illustration exists.
function CoachBilanCard({ dayList, prevDayList, completions, coachImage }) {
  const cur = periodStats(dayList, completions);
  const prev = periodStats(prevDayList, completions);
  const curCat = weekCategoryBreakdown(dayList);
  const strongest = curCat.reduce((m, c) => (c.pct > m.pct ? c : m), curCat[0]);
  const weakest = curCat.reduce((m, c) => (c.pct < m.pct ? c : m), curCat[0]);
  const rateDelta = cur.completionRate - (prev.planned ? prev.completionRate : cur.completionRate);

  const lines = [];
  if (prev.planned) {
    lines.push(rateDelta >= 5
      ? `Ta régularité progresse : ${cur.completionRate}% de séances complétées, contre ${prev.completionRate}% sur la période précédente.`
      : rateDelta <= -5
      ? `Ta régularité recule un peu : ${cur.completionRate}% de séances complétées contre ${prev.completionRate}% avant.`
      : `Ta régularité reste stable autour de ${cur.completionRate}% de séances complétées.`);
  } else {
    lines.push(`Sur cette période, tu as complété ${cur.completionRate}% des séances prévues.`);
  }
  if (strongest && weakest && strongest.label !== weakest.label) {
    lines.push(`Ton point fort : ${strongest.label} (${strongest.pct}% du volume). Ton point le plus faible : ${weakest.label} (${weakest.pct}%) — un bon candidat pour rééquilibrer ta semaine.`);
  }

  return (
    <div style={{ position: 'relative', borderRadius: 20, padding: '18px 18px', overflow: 'hidden', background: coachImage ? '#0D1015' : `linear-gradient(135deg, #1A1F14 0%, #0D1015 65%)`, border: `1px solid ${ACCENT}33`, boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      {coachImage ? (
        <img src={coachImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }} />
      ) : (
        <div style={{ position: 'absolute', right: -14, top: -14, opacity: 0.12 }}>
          <Shield size={100} color={ACCENT} strokeWidth={1} />
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color={ACCENT} />
          <span style={{ fontSize: 11.5, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bilan Coach Spartan</span>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: '#D6D9DD', marginTop: i === 0 ? 10 : 6, lineHeight: 1.55 }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function coachProjectionAdvice(readiness, daysLeft) {
  if (daysLeft < 0) return 'Objectif déjà passé.';
  if (readiness >= 80) return daysLeft < 21 ? 'Maintiens le cap, ne change rien à l\u2019approche du jour J.' : 'Continue sur ce rythme, tu es en avance sur ton plan.';
  if (readiness >= 55) return daysLeft < 21 ? 'Priorise la récupération plutôt que d\u2019ajouter des séances maintenant.' : 'Resserre ta régularité sur les prochaines semaines pour combler l\u2019écart.';
  return daysLeft < 21 ? 'Vise uniquement les séances clés d\u2019ici l\u2019échéance, sans forcer.' : 'Il est encore temps de rattraper du retard si tu resserres ta régularité dès maintenant.';
}

function ProjectionRaceBanner({ race, readiness, label, color }) {
  const variant = RACE_SCENE_VARIANT[race.name] || 'ridge';
  const seed = hashSeed(race.name + '-proj');
  const d = daysBetween(todayISO(), race.date);
  const advice = coachProjectionAdvice(readiness, d);
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', minHeight: 120, boxShadow: '0 10px 22px -12px rgba(0,0,0,0.5)' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(60% 80% at 15% 10%, rgba(255,255,255,0.08), transparent 60%),
                     radial-gradient(130% 140% at 100% 105%, ${color}30, transparent 58%),
                     linear-gradient(155deg, #171B22 0%, #08090B 100%)`,
      }}>
        <SceneComposition variant={variant} seed={seed} color={color} height={120} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,6,7,0.6) 0%, rgba(5,6,7,0.2) 65%)' }} />
      <div style={{ position: 'relative', padding: '14px 16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>{race.emoji} {race.name}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{d >= 0 ? `J-${d}` : 'Passé'}</span>
        </div>
        <div>
          <MiniBar pct={readiness} color={color} glow />
          <div style={{ fontSize: 10.5, color, marginTop: 5, fontWeight: 700 }}>{label} · préparation estimée {readiness}%</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 7 }}>
            <Shield size={11} color={ACCENT} style={{ flexShrink: 0, marginTop: 1.5 }} />
            <span style={{ fontSize: 10.5, color: '#D6D9DD', lineHeight: 1.35 }}>{advice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectionCard({ completions }) {
  const overall = computeStats(completions);
  const rate = Math.max(0.15, overall.jourValides / Math.max(1, DAYS.filter(d => d.date <= todayISO()).length));
  const readiness = Math.min(100, Math.round(rate * 100));
  const label = readiness >= 80 ? 'Sur la bonne voie' : readiness >= 55 ? 'Assiduité à renforcer' : 'Retard à combler';
  const color = readiness >= 80 ? ACCENT : readiness >= 55 ? '#E8D94C' : '#FF6B5C';
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Projection</div>
      <div style={{ fontSize: 10.5, color: TEXT_FAINT, marginBottom: 14 }}>Estimation à partir de ton taux d’assiduité actuel ({readiness}%)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {RACES.map(r => <ProjectionRaceBanner key={r.name} race={r} readiness={readiness} label={label} color={color} />)}
      </div>
    </div>
  );
}

function BadgeTile({ b }) {
  const remaining = Math.max(0, b.target - b.current);
  const pct = Math.round(b.progress * 100);
  const close = !b.achieved && pct >= 50;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <div style={{ position: 'relative', width: 58, height: 58 }}>
        {b.achieved && (
          <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: `radial-gradient(circle, ${b.color}50, transparent 70%)`, filter: 'blur(4px)' }} />
        )}
        <div style={{
          position: 'relative', width: 58, height: 58, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: b.achieved ? `linear-gradient(155deg, ${b.color}33, #0D1015)` : '#0D1015',
          border: `1.5px solid ${b.achieved ? b.color : CARD_BORDER}`, overflow: 'hidden',
        }}>
          {b.achieved && <div className="spartan-shimmer" style={{ position: 'absolute', inset: 0 }} />}
          <b.icon size={22} color={b.achieved ? b.color : TEXT_FAINT} style={{ position: 'relative' }} />
        </div>
        {!b.achieved && (
          <div style={{ position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: '50%', background: CARD, border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={9} color={TEXT_FAINT} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, color: b.achieved ? TEXT : TEXT_SOFT, textAlign: 'center', lineHeight: 1.2, fontWeight: b.achieved ? 700 : 600 }}>{b.label}</span>
      {b.achieved ? (
        <span style={{ fontSize: 8, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{RARITY[b.rarity].label}</span>
      ) : (
        <div style={{ width: '100%' }}>
          <MiniBar pct={pct} color={close ? b.color : TEXT_FAINT} />
          {b.unit && (
            <div style={{ fontSize: 7.5, color: TEXT_FAINT, textAlign: 'center', marginTop: 3, lineHeight: 1.3 }}>
              Encore {remaining} {b.unit}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BadgesGrid({ badges }) {
  const unlocked = badges.filter(b => b.achieved);
  const locked = badges.filter(b => !b.achieved).sort((a, b) => b.progress - a.progress);
  const ordered = [...unlocked, ...locked];
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Badges</span>
        <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{unlocked.length} / {badges.length} débloqués</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {ordered.map(b => <BadgeTile key={b.id} b={b} />)}
      </div>
    </div>
  );
}

function TransformationCard({ completions, stats }) {
  const cum = cumulativeTrainingStats(completions, stats);
  const seed = hashSeed('transformation');
  const items = [
    { label: 'Séances complétées', value: cum.sessions, icon: CheckCircle2 },
    { label: 'Heures d\u2019entraînement', value: cum.hours, icon: Timer },
    { label: 'Pompes cumulées', value: cum.pompes, icon: Dumbbell },
    { label: 'Tractions cumulées', value: cum.tractions, icon: Shield },
  ];
  const phrase = cum.sessions >= 30
    ? 'Tu n\u2019es plus le sportif que tu étais il y a quelques mois. Continue.'
    : cum.sessions >= 5
    ? 'Chaque séance construit le Spartan que tu deviens. Continue.'
    : 'Ton aventure commence à peine. Chaque séance compte.';

  return (
    <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', minHeight: 230, boxShadow: '0 16px 34px -14px rgba(0,0,0,0.55)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(80% 100% at 90% 0%, rgba(255,255,255,0.10), transparent 60%),
                       radial-gradient(150% 150% at 100% 110%, ${ACCENT}35, transparent 58%),
                       linear-gradient(160deg, #171B22 0%, #06070A 100%)`,
        }}>
          <SceneComposition variant="obstacle" seed={seed} color={ACCENT} height={230} />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,7,0.15) 0%, rgba(5,6,7,0.55) 55%, rgba(5,6,7,0.94) 100%)' }} />
      <div style={{ position: 'relative', padding: '20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={14} color={ACCENT} />
          <span style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Depuis le début</span>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', marginTop: 8, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Tu deviens un Spartan</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
          {items.map(it => (
            <div key={it.label} style={{ background: 'rgba(13,16,21,0.7)', backdropFilter: 'blur(4px)', borderRadius: 14, padding: '11px 13px' }}>
              <it.icon size={14} color={ACCENT} />
              <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', marginTop: 6 }}>{it.value}</div>
              <div style={{ fontSize: 9.5, color: '#C7CAD1', marginTop: 2, lineHeight: 1.25 }}>{it.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, color: '#EDEAE3', marginTop: 16, lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14 }}>
          « {phrase} »
        </div>
      </div>
    </div>
  );
}

function BiometricPlaceholderCard() {
  const items = [
    { label: 'VO2Max', icon: BarChart3, color: CAT_COURSE },
    { label: 'Sommeil', icon: Moon, color: '#8FA9FF' },
    { label: 'Poids', icon: Weight, color: CAT_RECUP },
    { label: 'FC repos', icon: HeartPulse, color: '#FF8A5C' },
    { label: 'Récupération', icon: Battery, color: ACCENT },
  ];
  return (
    <div style={{ position: 'relative', background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 18px', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.08 }}>
        <Watch size={130} color={TEXT_SOFT} strokeWidth={1} />
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: '#1B2129', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Watch size={16} color={TEXT_SOFT} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: TEXT }}>Garmin non connecté</div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, marginTop: 8, marginBottom: 16, lineHeight: 1.5 }}>
          Synchronise ton compte Garmin Connect pour afficher automatiquement ces données ici.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(it => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0D1015', borderRadius: 12, padding: '9px 12px' }}>
              <it.icon size={14} color={it.color} />
              <span style={{ fontSize: 12, color: '#D6D9DD', flex: 1 }}>{it.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: TEXT_FAINT, background: '#1B2129', padding: '3px 8px', borderRadius: 8 }}>à venir</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function normalizeRecord(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return { value: raw, date: null, previous: null };
  return raw;
}
function formatRecordDate(iso) {
  if (!iso) return null;
  return dateFromISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function TrophyCard({ label, value: rawValue, color, variant, seed, onSave }) {
  const [editing, setEditing] = useState(false);
  const record = normalizeRecord(rawValue);
  const [draft, setDraft] = useState(record ? record.value : '');

  const handleSave = () => {
    if (!draft.trim()) { setEditing(false); return; }
    onSave({ value: draft.trim(), date: todayISO(), previous: record ? record.value : null });
    setEditing(false);
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 148, borderRadius: 18, overflow: 'hidden', minHeight: 148, boxShadow: '0 10px 24px -10px rgba(0,0,0,0.5)' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(90% 90% at 20% 0%, rgba(255,255,255,0.08), transparent 60%),
                     radial-gradient(140% 140% at 100% 105%, ${color}${record ? '40' : '20'}, transparent 58%),
                     linear-gradient(155deg, #171B22 0%, #08090B 100%)`,
      }}>
        <SceneComposition variant={variant} seed={seed} color={color} height={148} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent ${record ? '25%' : '10%'}, rgba(5,6,7,0.82) 100%)` }} />
      <div onClick={() => !editing && setEditing(true)} className="spartan-tap" style={{ position: 'relative', padding: '11px 12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 148, cursor: editing ? 'default' : 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Trophy size={17} color={record ? color : TEXT_FAINT} />
          {record && <Sparkles size={11} color={color} />}
        </div>

        {editing ? (
          <div onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 9.5, color: '#C7CAD1', marginBottom: 5 }}>{label}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus placeholder="Ex : 18 reps"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{ width: '100%', background: 'rgba(5,6,7,0.7)', border: `1px solid ${CARD_BORDER}`, borderRadius: 6, padding: '5px 7px', color: TEXT, fontSize: 12, fontFamily: FONT, outline: 'none' }} />
              <button onClick={handleSave} style={{ background: color, border: 'none', borderRadius: 6, padding: '0 8px', cursor: 'pointer', flexShrink: 0 }}>
                <Send size={11} color="#0A0C0E" />
              </button>
            </div>
          </div>
        ) : record ? (
          <div>
            <div style={{ fontSize: 9.5, color: '#C7CAD1', lineHeight: 1.25, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{record.value}</div>
            <div style={{ fontSize: 9, color: TEXT_FAINT, marginTop: 4 }}>
              {record.date ? `Depuis le ${formatRecordDate(record.date)}` : 'Ton record'}
            </div>
            {record.previous && (
              <div style={{ fontSize: 9, color, marginTop: 2, fontWeight: 700 }}>Précédent : {record.previous}</div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 9.5, color: '#C7CAD1', lineHeight: 1.25, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#D6D9DD', lineHeight: 1.3 }}>Aucun record enregistré</div>
            <div style={{ fontSize: 9.5, color, marginTop: 5, fontWeight: 800 }}>+ Enregistrer</div>
          </div>
        )}
      </div>
    </div>
  );
}

const RECORD_VARIANT = { muscu: 'gym', spartan: 'obstacle', course: 'track' };

function AllRecordsSection({ records, setRecord }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '20px 0 20px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, paddingRight: 18 }}>Records personnels</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(RECORD_CATALOG).map(([cat, items]) => (
          <div key={cat}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: CATEGORY_META[cat].color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingRight: 18 }}>{CATEGORY_META[cat].label}</div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingRight: 18, paddingBottom: 2 }}>
              {items.map(it => (
                <TrophyCard key={it.key} label={it.label} value={records[it.key]} color={CATEGORY_META[cat].color}
                  variant={RECORD_VARIANT[cat]} seed={hashSeed(it.key)} onSave={(v) => setRecord(it.key, v)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ProgressionScreen({ completions, level, records, setRecordFor }) {
  const [period, setPeriod] = useState('30j');
  const todayIdx = Math.max(0, Math.min(getDayIndex(), DAYS.length - 1));
  const todayDay = DAYS[todayIdx];

  const stats = useMemo(() => computeStats(completions), [completions]);
  const dayList = useMemo(() => periodDayList(period, todayIdx), [period, todayIdx]);
  const prevDayList = useMemo(() => previousPeriodDayList(period, todayIdx), [period, todayIdx]);
  const curStats = useMemo(() => periodStats(dayList, completions), [dayList, completions]);
  const prevStats = useMemo(() => periodStats(prevDayList, completions), [prevDayList, completions]);
  const skills = useMemo(() => computeSkills(dayList, completions), [dayList, completions]);
  const badges = useMemo(() => computeBadges(completions, stats, level), [completions, stats, level]);
  const weekDays = useMemo(() => getWeekDays(todayDay.semaine), [todayDay]);
  const weekSessionsDone = weekDays.filter(d => completions[d.date] && completions[d.date].fait).length;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 23, fontWeight: 800 }}>Progression</div>
        <div style={{ fontSize: 13.5, color: TEXT_SOFT, marginTop: 3 }}>Chaque effort te rapproche de ta meilleure version.</div>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="spartan-fade-in">
        <LevelHeroCard level={level} weekSessions={weekSessionsDone} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '40ms' }}>
        <StreaksRow stats={stats} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '80ms' }}>
        <SkillBars skills={skills} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '120ms' }}>
        <ChargeHistoryChart dayList={dayList} completions={completions} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '160ms' }}>
        <DisciplineDonutCard dayList={dayList} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '200ms' }}>
        <ComparisonCard periodKey={period} current={curStats} previous={prevDayList.length ? prevStats : null} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '240ms' }}>
        <CoachBilanCard dayList={dayList} prevDayList={prevDayList} completions={completions} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '280ms' }}>
        <ProjectionCard completions={completions} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '320ms' }}>
        <AllRecordsSection records={records} setRecord={setRecordFor} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '350ms' }}>
        <TransformationCard completions={completions} stats={stats} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '360ms' }}>
        <BadgesGrid badges={badges} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '400ms' }}>
        <BiometricPlaceholderCard />
      </div>

    </div>
  );
}

function StarRating({ value, max = 5, color, size = 12 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size} color={i < value ? (color || ACCENT) : '#2A313B'} fill={i < value ? (color || ACCENT) : 'none'} />
      ))}
    </div>
  );
}

function DifficultyBadge({ level, compact }) {
  const meta = DIFFICULTY_META[level] || DIFFICULTY_META.intermediaire;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: compact ? 11 : 12.5, fontWeight: 700,
      color: meta.color, background: meta.color + '1A', padding: compact ? '3px 8px' : '4px 10px', borderRadius: 10,
    }}>
      {meta.emoji} {meta.label}
    </span>
  );
}

function IntervalChart({ interval }) {
  if (!interval) return null;
  const bars = Array.from({ length: interval.reps });
  return (
    <div style={{ background: '#0D1015', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{interval.reps} × {interval.unitLabel}</div>
      {interval.allure && <div style={{ fontSize: 12.5, color: CAT_SPARTAN, marginTop: 2 }}>Allure cible : {interval.allure}</div>}
      {interval.recup && <div style={{ fontSize: 11.5, color: TEXT_SOFT, marginTop: 2 }}>Récupération : {interval.recup}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 16, height: 60 }}>
        {bars.map((_, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: 4, background: CAT_SPARTAN }} />
            <span style={{ fontSize: 9.5, color: TEXT_FAINT }}>{i + 1}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 10.5, color: TEXT_SOFT }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 3, background: CAT_SPARTAN, display: 'inline-block', borderRadius: 2 }} /> Effort</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 3, background: TEXT_FAINT, display: 'inline-block', borderRadius: 2 }} /> Récupération</span>
      </div>
    </div>
  );
}

const SESSION_VISUAL_ICON = {
  'course-🟢 Endurance fondamentale': PersonStanding,
  'course-🔴 Fractionné court': Zap,
  'course-🟠 Fractionné long': Flame,
  'course-🔵 Sortie longue': Mountain,
  'course-⛰️ Côtes': Mountain,
  'spartan-⚔️ Spécifique Spartan': Shield,
  'spartan-grip-core': Shield,
  'spartan-force': Flame,
  'recup-footing': Sunrise,
  'recup-repos-actif': Moon,
  'recup-respiration': Wind,
  'mobilite-hanches': Sparkles,
  'mobilite-haut-corps': Sparkles,
  'mobilite-complet': Sparkles,
};

function sessionVisualIcon(session) {
  return SESSION_VISUAL_ICON[session.id] || CATEGORY_META[session.category].icon;
}

// ---------- Cinematic scene art (crafted, license-safe stand-in for real photography) ----------
// Architecture note: every session/exercise can later carry a real `image` (or `videoUrl`) field.
// SessionCoverArt / ExerciseThumb check for it FIRST and render a plain <img>/<video poster> the
// moment it exists — nothing else about the layout, sizing, or call sites needs to change.
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < (str || 'x').length; i++) { h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}
function rnd(seed, salt) { // deterministic 0..1 pseudo-random from a seed + salt index
  const x = Math.sin(seed + salt * 999.17) * 43758.5453;
  return x - Math.floor(x);
}

const SCENE_VARIANT_BY_CATEGORY = { course: 'ridge', muscu: 'gym', spartan: 'obstacle', mobilite: 'calm', recuperation: 'sunrise' };
const SESSION_SCENE_OVERRIDE = {
  'course-🟢 Endurance fondamentale': 'track',
  'course-🔴 Fractionné court': 'track',
  'course-🟠 Fractionné long': 'track',
  'course-🔵 Sortie longue': 'ridge',
  'course-⛰️ Côtes': 'ridge',
};

// --- Atmosphere primitives ---
function Particles({ seed, color, count = 10, area = [10, 20, 290, 130] }) {
  const [x0, y0, x1, y1] = area;
  const dots = Array.from({ length: count }).map((_, i) => {
    const x = x0 + rnd(seed, i * 2 + 1) * (x1 - x0);
    const y = y0 + rnd(seed, i * 2 + 2) * (y1 - y0);
    const r = 0.5 + rnd(seed, i * 3 + 5) * 1.3;
    const o = 0.15 + rnd(seed, i * 5 + 7) * 0.35;
    return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o} />;
  });
  return <g>{dots}</g>;
}

function SmokeWisp({ x, y, w, h, color, filterId }) {
  return (
    <ellipse cx={x} cy={y} rx={w} ry={h} fill={color} opacity="0.16" filter={`url(#${filterId})`} />
  );
}

function LightBeam({ x1, y1, x2, y2, width, color, id }) {
  return (
    <g opacity="0.5">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${x1},${y1} ${x2},${y2} ${x2 + width},${y2} ${x1 + width * 2.4},${y1}`} fill={`url(#${id})`} />
    </g>
  );
}

// --- Athletic silhouettes (stylized, not literal anatomy — built to read clearly at small sizes) ---
function RunnerSilhouette({ x = 210, y = 92, scale = 1, color, opacity = 0.85, flip = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} opacity={opacity}>
      <circle cx="2" cy="-38" r="6.2" fill={color} />
      <path d="M 2 -32 C 6 -24 8 -18 4 -10 C 10 -6 16 -2 22 4 C 24 6 22 9 19 8 C 12 4 6 0 0 -3 C -4 2 -9 9 -11 16 C -12 19 -16 18 -15 14 C -13 4 -8 -6 -3 -13 C -6 -19 -8 -25 -6 -31 C -4 -35 0 -35 2 -32 Z" fill={color} />
      <path d="M 0 -3 C -6 -1 -13 2 -19 9 C -21 11 -24 9 -22 6 C -16 -2 -8 -7 -1 -10 Z" fill={color} />
      <path d="M -11 16 C -14 22 -14 28 -12 33 C -11 35 -14 37 -16 34 C -19 28 -18 21 -15 14 Z" fill={color} />
      <path d="M 19 8 C 24 10 28 9 32 6 C 34 5 36 7 34 9 C 30 13 24 15 18 12 Z" fill={color} />
    </g>
  );
}

function LifterSilhouette({ x = 150, y = 100, scale = 1, color, opacity = 0.85 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x="-34" y="-4" width="68" height="4.2" rx="2.1" fill={color} />
      <circle cx="-30" cy="-2" r="8.5" fill={color} />
      <circle cx="30" cy="-2" r="8.5" fill={color} />
      <circle cx="0" cy="-34" r="6" fill={color} />
      <path d="M 0 -28 C -3 -22 -4 -16 -2 -8 L 2 -8 C 4 -16 3 -22 0 -28 Z" fill={color} />
      <path d="M -2 -8 C -8 -6 -14 -4 -19 -3 L -18 0 C -12 -1 -6 -3 0 -6 Z" fill={color} />
      <path d="M 2 -8 C 8 -6 14 -4 19 -3 L 18 0 C 12 -1 6 -3 0 -6 Z" fill={color} />
      <path d="M -2 -8 C -5 0 -6 9 -4 17 L 0 17 C 1 9 1 0 -1 -8 Z" fill={color} />
      <path d="M 2 -8 C 6 -1 8 7 7 16 L 3 17 C 2 9 1 0 1 -8 Z" fill={color} />
    </g>
  );
}

function ClimberSilhouette({ x = 210, y = 70, scale = 1, color, opacity = 0.85 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx="0" cy="-30" r="5.6" fill={color} />
      <path d="M 0 -25 C -2 -18 -1 -10 2 -3 L 5 -4 C 4 -12 3 -19 3 -25 Z" fill={color} />
      <path d="M 2 -22 C 8 -26 14 -32 17 -38 C 18 -40 21 -38 20 -36 C 16 -29 10 -22 4 -18 Z" fill={color} />
      <path d="M 0 -22 C -6 -25 -11 -30 -14 -36 C -15 -38 -18 -36 -17 -34 C -13 -27 -8 -21 -2 -18 Z" fill={color} />
      <path d="M 2 -3 C 4 4 4 12 8 18 C 9 20 6 22 4 20 C 0 14 -1 6 -2 -2 Z" fill={color} />
      <path d="M -1 -2 C -3 6 -8 12 -9 20 C -10 22 -13 21 -12 18 C -10 11 -6 4 -4 -3 Z" fill={color} />
    </g>
  );
}

function StretchSilhouette({ x = 200, y = 108, scale = 1, color, opacity = 0.85 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx="-24" cy="-10" r="5.4" fill={color} />
      <path d="M -24 -5 C -18 -2 -8 0 4 0 C 7 0 7 3 4 3.2 C -8 4 -20 1 -27 -3 Z" fill={color} />
      <path d="M -20 -3 C -16 4 -12 10 -14 17 C -14 19 -17 19 -17 17 C -18 11 -20 5 -22 -1 Z" fill={color} />
      <path d="M 4 1 C 10 2 16 1 21 -3 C 23 -4 25 -2 23 0 C 18 4 11 5 4 4 Z" fill={color} />
      <path d="M -14 16 C -14 20 -12 24 -8 26 C -6 27 -8 30 -10 29 C -15 26 -18 21 -17 16 Z" fill={color} />
    </g>
  );
}

function WalkerSilhouette({ x = 210, y = 92, scale = 1, color, opacity = 0.8 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx="0" cy="-34" r="5.6" fill={color} />
      <path d="M 0 -28 C -2 -21 -2 -14 0 -6 L 3 -6 C 4 -14 3 -21 1 -28 Z" fill={color} />
      <path d="M 0 -20 C -5 -18 -10 -15 -14 -10 C -16 -8 -13 -6 -11 -8 C -7 -12 -3 -15 1 -17 Z" fill={color} />
      <path d="M 1 -17 C 6 -14 10 -10 13 -14 C 15 -16 12 -18 10 -16 C 7 -13 4 -16 1 -20 Z" fill={color} />
      <path d="M 0 -6 C -4 0 -9 4 -10 11 C -10 13 -13 12 -12 10 C -11 4 -7 0 -3 -6 Z" fill={color} />
      <path d="M 1 -6 C 5 1 7 8 6 15 C 6 17 3 17 3 15 C 3 8 2 1 -1 -6 Z" fill={color} />
    </g>
  );
}

// --- Environment layers ---
function MountainLayers({ seed, color }) {
  const ridge = (baseY, jag, s) => {
    let d = `M -10 170 L -10 ${baseY}`;
    const pts = 7;
    for (let i = 0; i <= pts; i++) {
      const x = -10 + (i / pts) * 320;
      const y = baseY - jag * (0.4 + rnd(seed + s, i) * 0.9) - Math.sin(i * 1.3 + seed % 5) * jag * 0.3;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += ` L 310 170 Z`;
    return d;
  };
  return (
    <g>
      <path d={ridge(118, 34, 1)} fill={color} opacity="0.14" />
      <path d={ridge(132, 24, 2)} fill={color} opacity="0.22" />
      <path d={ridge(150, 16, 3)} fill={color} opacity="0.34" />
    </g>
  );
}

function TrackLanes({ seed, color }) {
  const dip = 46 + (seed % 18);
  return (
    <g opacity="0.9">
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M -20 ${150 + i * 13} C 60 ${dip + i * 11}, 240 ${dip + i * 11}, 320 ${150 + i * 13}`}
          stroke={color} strokeWidth={i === 0 ? 2.4 : 1.4} fill="none" opacity={0.42 - i * 0.08} />
      ))}
      <line x1="24" y1="150" x2="24" y2="98" stroke={color} strokeWidth="1.2" opacity="0.25" />
    </g>
  );
}

function GymScene({ seed, color }) {
  const rackX = 40 + (seed % 20);
  return (
    <g opacity="0.9">
      <line x1={rackX} y1="30" x2={rackX} y2="150" stroke={color} strokeWidth="4" opacity="0.16" />
      <line x1={rackX + 190} y1="30" x2={rackX + 190} y2="150" stroke={color} strokeWidth="4" opacity="0.16" />
      <line x1={rackX} y1="60" x2={rackX + 190} y2="60" stroke={color} strokeWidth="3" opacity="0.14" />
      <rect x="0" y="150" width="300" height="20" fill={color} opacity="0.08" />
    </g>
  );
}

function ObstacleScene({ seed, color }) {
  const zig = seed % 10;
  return (
    <g opacity="0.9">
      <rect x="205" y="14" width="90" height="146" fill={color} opacity="0.13" />
      <g opacity="0.22">
        {Array.from({ length: 6 }).map((_, r) => (
          Array.from({ length: 5 }).map((_, c) => (
            <line key={`h${r}${c}`} x1={210 + c * 17} y1={20 + r * 22} x2={210 + (c + 1) * 17} y2={20 + (r + 1) * 22} stroke={color} strokeWidth="1" />
          ))
        ))}
      </g>
      <path d={`M 30 8 C ${40 + zig} 40, ${20 - zig} 70, 34 100 C ${44 + zig} 128, 24 150, 32 168`} stroke={color} strokeWidth="3.2" fill="none" opacity="0.3" />
    </g>
  );
}

function CalmRibbons({ seed, color }) {
  const amp = 18 + (seed % 12);
  return (
    <g opacity="0.85">
      <path d={`M -20 70 C 60 ${70 - amp}, 140 ${70 + amp}, 220 70 S 340 ${70 - amp}, 360 70`} stroke={color} strokeWidth="2.2" fill="none" opacity="0.3" />
      <path d={`M -20 100 C 60 ${100 - amp * 0.7}, 140 ${100 + amp * 0.7}, 220 100 S 340 ${100 - amp * 0.7}, 360 100`} stroke={color} strokeWidth="1.6" fill="none" opacity="0.22" />
      <path d={`M -20 130 C 60 ${130 - amp * 0.5}, 140 ${130 + amp * 0.5}, 220 130 S 340 ${130 - amp * 0.5}, 360 130`} stroke={color} strokeWidth="1.2" fill="none" opacity="0.16" />
    </g>
  );
}

function SunriseScene({ seed, color }) {
  const r = 34 + (seed % 16);
  return (
    <g opacity="0.9">
      <circle cx="150" cy="150" r={r} fill={color} opacity="0.24" />
      <circle cx="150" cy="150" r={r + 14} fill={color} opacity="0.09" />
      {[0, 1, 2].map(i => (
        <ellipse key={i} cx={70 + i * 90} cy={100 - i * 8} rx="60" ry="6" fill={color} opacity={0.08 + i * 0.02} />
      ))}
      <line x1="-10" y1="150" x2="310" y2="150" stroke={color} strokeWidth="1.4" opacity="0.3" />
    </g>
  );
}

function AvenueScene({ seed, color }) {
  const vpX = 130 + (seed % 40);
  return (
    <g opacity="0.9">
      <line x1="-20" y1="175" x2={vpX} y2="58" stroke={color} strokeWidth="2" opacity="0.32" />
      <line x1="320" y1="175" x2={vpX} y2="58" stroke={color} strokeWidth="2" opacity="0.32" />
      {[0, 1, 2, 3].map(i => (
        <line key={i} x1={vpX - 6 + i * 3} y1={100 + i * 18} x2={vpX + 6 - i * 3} y2={100 + i * 18} stroke={color} strokeWidth="1.2" opacity={0.28 - i * 0.05} />
      ))}
      <circle cx={vpX} cy="58" r="16" fill={color} opacity="0.28" />
    </g>
  );
}

// --- Full composed scene, keyed by category + variant + a deterministic seed per session ---
function SceneComposition({ variant, seed, color, height }) {
  const filterId = `spartanBlur${seed}`;
  const beamId = `spartanBeam${seed}`;
  const lightX = 40 + (seed % 180);

  const figure = (() => {
    const fx = 190 + (seed % 40);
    const fy = variant === 'gym' ? 118 : variant === 'obstacle' ? 96 : variant === 'calm' ? 122 : 140;
    const sc = 0.85 + rnd(seed, 11) * 0.35;
    if (variant === 'gym') return <LifterSilhouette x={150 + (seed % 20) - 10} y={132} scale={sc} color={color} />;
    if (variant === 'obstacle') return <ClimberSilhouette x={fx} y={128} scale={sc} color={color} />;
    if (variant === 'calm') return <StretchSilhouette x={fx - 20} y={fy} scale={sc} color={color} />;
    if (variant === 'sunrise') return <WalkerSilhouette x={fx} y={fy} scale={sc} color={color} />;
    if (variant === 'track') return <RunnerSilhouette x={fx} y={132} scale={sc * 1.05} color={color} />;
    if (variant === 'avenue') return <RunnerSilhouette x={150} y={150} scale={sc * 1.1} color={color} />;
    return <RunnerSilhouette x={fx} y={140} scale={sc} color={color} />; // ridge / default course
  })();

  const environment = (() => {
    if (variant === 'gym') return <GymScene seed={seed} color={color} />;
    if (variant === 'obstacle') return <ObstacleScene seed={seed} color={color} />;
    if (variant === 'calm') return <CalmRibbons seed={seed} color={color} />;
    if (variant === 'sunrise') return <SunriseScene seed={seed} color={color} />;
    if (variant === 'track') return <TrackLanes seed={seed} color={color} />;
    if (variant === 'avenue') return <AvenueScene seed={seed} color={color} />;
    return <MountainLayers seed={seed} color={color} />; // ridge
  })();

  return (
    <svg viewBox="0 0 300 170" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <LightBeam x1={lightX} y1="-10" x2={lightX - 60} y2="180" width="70" color={color} id={beamId} />
      {environment}
      <SmokeWisp x={60 + (seed % 40)} y={60} w="70" h="26" color={color} filterId={filterId} />
      <SmokeWisp x={220 - (seed % 30)} y={100} w="55" h="20" color={color} filterId={filterId} />
      <Particles seed={seed} color={color} count={14} />
      {figure}
    </svg>
  );
}

function SessionCoverArt({ session, height = 140, rounded = 18, showLabel = true }) {
  const cat = CATEGORY_META[session.category];
  const Icon = sessionVisualIcon(session);
  const seed = hashSeed(session.id);
  const variant = SESSION_SCENE_OVERRIDE[session.id] || SCENE_VARIANT_BY_CATEGORY[session.category];
  const lightX = 20 + (seed % 60);
  const lightY = 6 + (seed % 22);

  // Future-proofing: if a real image/video asset exists on the session, use it directly —
  // everything downstream (cards, hero, recommendations, favorites) already renders via this
  // single component, so dropping in real media never requires touching call sites.
  if (session.image) {
    return (
      <div style={{ position: 'relative', width: '100%', height, borderRadius: rounded, overflow: 'hidden' }}>
        <img src={session.image} alt={session.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(5,6,7,0.6) 100%)' }} />
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height, borderRadius: rounded, overflow: 'hidden',
      background: `radial-gradient(60% 75% at ${lightX}% ${lightY}%, rgba(255,255,255,0.10), transparent 62%),
                   radial-gradient(140% 150% at 100% 105%, ${cat.color}38, transparent 60%),
                   linear-gradient(155deg, #171B22 0%, #08090B 100%)`,
    }}>
      <SceneComposition variant={variant} seed={seed} color={cat.color} height={height} />
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 46px 12px rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 34%, rgba(5,6,7,0.66) 100%)' }} />
      {showLabel && (
        <div style={{ position: 'absolute', left: 14, top: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 26, height: 26, borderRadius: 9, background: 'rgba(5,6,7,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} color={cat.color} />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{cat.label}</span>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, onClick, favorite, onToggleFavorite }) {
  const cat = CATEGORY_META[session.category];
  return (
    <button onClick={onClick} className="spartan-tap" style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', background: CARD, border: `1px solid ${CARD_BORDER}`,
      borderRadius: 20, padding: 8, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ position: 'relative' }}>
        <SessionCoverArt session={session} height={128} rounded={14} />
        {onToggleFavorite && (
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(session.id); }} style={{
            position: 'absolute', top: 8, right: 8, background: 'rgba(5,6,7,0.55)', backdropFilter: 'blur(6px)',
            border: 'none', borderRadius: 9, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Star size={14} color={favorite ? ACCENT : '#C7CAD1'} fill={favorite ? ACCENT : 'none'} />
          </button>
        )}
        <div style={{ position: 'absolute', left: 12, bottom: 10, right: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{session.name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 6px 8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: TEXT_SOFT, display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={11} /> {session.durationText || `${session.duration} min`}</span>
        <DifficultyBadge level={session.difficulty} compact />
      </div>
    </button>
  );
}

function CoachRecommendCard({ session, reason, onOpen }) {
  const cat = CATEGORY_META[session.category];
  return (
    <div style={{ background: `linear-gradient(160deg, ${cat.color}14, ${CARD})`, border: `1px solid ${cat.color}44`, borderRadius: 22, padding: '18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={15} color={cat.color} />
        <span style={{ fontSize: 12, fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach Spartan recommande</span>
      </div>
      <div style={{ fontSize: 13.5, color: '#D6D9DD', marginTop: 10, lineHeight: 1.55 }}>{reason}</div>
      <button onClick={onOpen} className="spartan-tap" style={{ marginTop: 14, width: '100%', textAlign: 'left', background: '#0D1015', border: 'none', borderRadius: 16, padding: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, flexShrink: 0, overflow: 'hidden' }}>
          <SessionCoverArt session={session} height={56} rounded={12} showLabel={false} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: TEXT_SOFT, textTransform: 'uppercase' }}>{cat.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{session.name}</div>
        </div>
        <div style={{ background: ACCENT, color: '#0A0C0E', fontSize: 11.5, fontWeight: 800, padding: '8px 13px', borderRadius: 10, flexShrink: 0 }}>Voir</div>
      </button>
    </div>
  );
}

function WhySessionCard({ day, session }) {
  const lines = buildWhyThisSession(day, session);
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={14} color={ACCENT} />
        <span style={{ fontSize: 12, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pourquoi cette séance aujourd’hui ?</span>
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: '#D6D9DD', lineHeight: 1.5 }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- Profil: Hero, Objectifs, Résumé ----------
// Architecture note: pass `heroImage` once a real cinematic portrait/scene exists —
// it replaces the generated backdrop with no other change to this component.
function ProfileHero({ level, stats, heroImage }) {
  const seed = hashSeed('profile-hero');
  const animatedXp = useCountUp(level.xpIntoLevel, 1100);
  const remaining = level.xpPerLevel - level.xpIntoLevel;
  const quote = DAILY_INSIGHTS.find(i => i.cat === 'citation').text;

  return (
    <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', boxShadow: '0 18px 40px -14px rgba(0,0,0,0.55)' }}>
      <div style={{ position: 'relative', height: 210 }}>
        {heroImage ? (
          <img src={heroImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(70% 90% at 20% 0%, rgba(255,255,255,0.10), transparent 60%),
                         radial-gradient(150% 150% at 100% 110%, ${ACCENT}30, transparent 58%),
                         linear-gradient(160deg, #1A1F14 0%, #06070A 100%)`,
          }}>
            <SceneComposition variant="ridge" seed={seed} color={ACCENT} height={210} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,7,0.1) 0%, rgba(5,6,7,0.55) 60%, rgba(5,6,7,0.96) 100%)' }} />

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px 16px 20px', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ position: 'relative', width: 74, height: 74, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: `radial-gradient(circle, ${ACCENT}55, transparent 70%)`, filter: 'blur(5px)' }} />
            <div style={{
              position: 'relative', width: 74, height: 74, borderRadius: '50%', background: '#1B2129',
              border: `2px solid ${ACCENT}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <User size={34} color={TEXT_SOFT} />
            </div>
            <div style={{
              position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: '50%',
              background: ACCENT, border: '2px solid #050607', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#0A0C0E',
            }}>{level.level}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>Marc</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginTop: 1 }}>{level.name}</div>
          </div>
        </div>
      </div>

      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderTop: 'none', padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>{animatedXp} <span style={{ color: TEXT_SOFT, fontWeight: 600 }}>/ {level.xpPerLevel} XP</span></span>
          <span style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700 }}>{remaining} XP avant le niveau {level.level + 1}</span>
        </div>
        <MiniBar pct={Math.round((level.xpIntoLevel / level.xpPerLevel) * 100)} glow />

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: '#0D1015', borderRadius: 12, padding: '9px 11px' }}>
            <Flame size={13} color="#FF8A5C" />
            <span style={{ fontSize: 12, color: TEXT }}>Série <b style={{ color: '#fff' }}>{stats.current}j</b></span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, background: '#0D1015', borderRadius: 12, padding: '9px 11px' }}>
            <CalendarDays size={13} color={CAT_MUSCU} />
            <span style={{ fontSize: 12, color: TEXT }}>Depuis {memberSinceLabel()}</span>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${CARD_BORDER}`, fontSize: 12.5, color: '#D6D9DD', fontStyle: 'italic', lineHeight: 1.4 }}>
          « {quote} »
        </div>
      </div>
    </div>
  );
}

function ObjectiveRaceRow({ race }) {
  const d = daysBetween(todayISO(), race.date);
  const pct = raceProgress(race);
  const variant = RACE_SCENE_VARIANT[race.name] || 'ridge';
  const color = variant === 'avenue' ? CAT_COURSE : variant === 'obstacle' ? CAT_SPARTAN : CAT_COURSE;
  const seed = hashSeed(race.name + '-obj');
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight: 84 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(60% 80% at 15% 10%, rgba(255,255,255,0.08), transparent 60%),
                     radial-gradient(130% 140% at 100% 105%, ${color}30, transparent 58%),
                     linear-gradient(155deg, #171B22 0%, #08090B 100%)`,
      }}>
        <SceneComposition variant={variant} seed={seed} color={color} height={84} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(5,6,7,0.6) 0%, rgba(5,6,7,0.2) 65%)' }} />
      <div style={{ position: 'relative', padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{race.emoji} {race.name}</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: ACCENT }}>{d >= 0 ? `J-${d}` : 'Passé'}</span>
        </div>
        <div style={{ marginTop: 8 }}><MiniBar pct={pct} color={color} /></div>
        <div style={{ fontSize: 10, color: '#C7CAD1', marginTop: 4 }}>{pct}% du plan écoulé · {dateFromISO(race.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
  );
}

function parseLeadingNumber(str) {
  if (!str) return null;
  const m = String(str).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

function PhysicalGoalRow({ goal, records, last }) {
  const target = parseLeadingNumber(goal.target);
  const recordKey = goal.name === 'Tractions' ? 'record-pullups' : null;
  const current = recordKey ? normalizeRecord(records[recordKey]) : null;
  const currentNum = current ? parseLeadingNumber(current.value) : null;
  const hasProgress = target && currentNum !== null;
  const pct = hasProgress ? Math.min(100, Math.round((currentNum / target) * 100)) : null;
  return (
    <div style={{ padding: '12px 15px', borderBottom: last ? 'none' : `1px solid ${CARD_BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: TEXT }}>{goal.emoji} {goal.name}</span>
        <span style={{ fontSize: 11.5, color: TEXT_SOFT }}>Objectif : {goal.target}</span>
      </div>
      {hasProgress ? (
        <div style={{ marginTop: 7 }}>
          <MiniBar pct={pct} color={ACCENT} />
          <div style={{ fontSize: 10, color: ACCENT, marginTop: 3, fontWeight: 700 }}>{current.value} actuellement · {pct}%</div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: TEXT_FAINT, marginTop: 5 }}>Enregistre ton record actuel dans Progression pour suivre ta progression.</div>
      )}
    </div>
  );
}

function ObjectivesSection({ records }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, paddingLeft: 2 }}>Objectifs en cours</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {RACES.map(r => <ObjectiveRaceRow key={r.name} race={r} />)}
      </div>
      <div style={{ marginTop: 12, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        {PHYSICAL_GOALS.filter(g => g.name === 'Tractions' || g.name === 'Poids').map((g, i, arr) => (
          <PhysicalGoalRow key={g.name} goal={g} records={records} last={i === arr.length - 1} />
        ))}
      </div>
    </div>
  );
}

function GlobalSummaryCard({ stats, cum }) {
  const items = [
    { label: 'Séances', value: cum.sessions, icon: CheckCircle2, color: ACCENT },
    { label: 'Entraînement', value: `${cum.hours}h`, icon: Timer, color: CAT_MUSCU },
    { label: 'Calories est.', value: cum.kcal.toLocaleString('fr-FR'), icon: Flame, color: '#FF8A5C' },
    { label: 'Plus longue série', value: `${stats.longest}j`, icon: Trophy, color: '#E8D94C' },
  ];
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: '18px 18px', boxShadow: '0 10px 24px -14px rgba(0,0,0,0.5)' }}>
      <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Résumé global</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(it => (
          <div key={it.label} style={{ background: '#0D1015', borderRadius: 14, padding: '12px 13px' }}>
            <it.icon size={14} color={it.color} />
            <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, marginTop: 7 }}>{it.value}</div>
            <div style={{ fontSize: 9.5, color: TEXT_SOFT, marginTop: 2 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---------- Profil: Planning hebdomadaire (préférence) ----------
const WEEKLY_PLAN_OPTIONS = [
  { key: 'course', label: 'Course', icon: PersonStanding, color: CAT_COURSE },
  { key: 'muscu', label: 'Musculation', icon: Dumbbell, color: CAT_MUSCU },
  { key: 'spartan', label: 'Spartan', icon: Shield, color: CAT_SPARTAN },
  { key: 'mobilite', label: 'Mobilité', icon: Sparkles, color: CAT_MOBILITE },
  { key: 'repos', label: 'Repos', icon: Moon, color: TEXT_FAINT },
];
const WEEKDAY_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const DEFAULT_WEEKLY_PLAN = { LUN: 'muscu', MAR: 'course', MER: 'muscu', JEU: 'course', VEN: 'muscu', SAM: 'repos', DIM: 'course' };

function WeeklyScheduleConfigurator({ plan, setPlan }) {
  const [editingDay, setEditingDay] = useState(null);
  const effectivePlan = { ...DEFAULT_WEEKLY_PLAN, ...plan };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 2 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planning hebdomadaire</span>
        <span style={{ fontSize: 10.5, color: TEXT_FAINT }}>Préférence indicative</span>
      </div>
      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, padding: '16px 14px' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {WEEKDAY_SHORT.map(day => {
            const cur = WEEKLY_PLAN_OPTIONS.find(o => o.key === effectivePlan[day]) || WEEKLY_PLAN_OPTIONS[4];
            const isEditing = editingDay === day;
            return (
              <div key={day} style={{ position: 'relative' }}>
                <button onClick={() => setEditingDay(isEditing ? null : day)} className="spartan-tap" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: cur.color + '22', border: `1.5px solid ${isEditing ? ACCENT : cur.color}`,
                  }}>
                    <cur.icon size={14} color={cur.color} />
                  </div>
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: TEXT_SOFT }}>{day}</span>
                </button>
                {isEditing && (
                  <div style={{
                    position: 'absolute', top: 42, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
                    background: '#14181F', border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: 6,
                    display: 'flex', flexDirection: 'column', gap: 2, boxShadow: '0 12px 28px rgba(0,0,0,0.5)', minWidth: 130,
                  }}>
                    {WEEKLY_PLAN_OPTIONS.map(opt => (
                      <button key={opt.key} onClick={() => { setPlan({ ...effectivePlan, [day]: opt.key }); setEditingDay(null); }} className="spartan-tap" style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 9, border: 'none', cursor: 'pointer',
                        background: effectivePlan[day] === opt.key ? opt.color + '22' : 'transparent',
                      }}>
                        <opt.icon size={13} color={opt.color} />
                        <span style={{ fontSize: 11.5, color: TEXT }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Préférences d'entraînement ----------
function TrainingPreferencesSection({ prefs, setPrefs }) {
  const p = prefs || {};
  return (
    <SettingsGroup title="Préférences d'entraînement">
      <EditableValueRow icon={Dumbbell} iconColor={CAT_MUSCU} label="Lieu principal" value={p.location} placeholder="Ex : Salle de sport" onSave={(v) => setPrefs({ ...p, location: v })} />
      <EditableValueRow icon={Backpack} iconColor={CAT_SPARTAN} label="Matériel disponible" value={p.equipment} placeholder="Ex : Salle complète" onSave={(v) => setPrefs({ ...p, equipment: v })} />
      <EditableValueRow icon={Timer} iconColor={ACCENT} label="Durée moyenne" value={p.duration} placeholder="Ex : 60 à 90 min" onSave={(v) => setPrefs({ ...p, duration: v })} />
      <EditableValueRow icon={Star} iconColor="#E8D94C" label="Niveau" value={p.level} placeholder="Ex : Intermédiaire" onSave={(v) => setPrefs({ ...p, level: v })} />
      <EditableValueRow icon={ShieldCheck} iconColor="#FF6B5C" label="Blessures / douleurs" value={p.injuries} placeholder="Aucune" onSave={(v) => setPrefs({ ...p, injuries: v })} last />
    </SettingsGroup>
  );
}

// ---------- Connexions ----------
const CONNECTOR_LIST = [
  { key: 'garmin', label: 'Garmin Connect', icon: Watch, color: '#4FA8FF' },
  { key: 'strava', label: 'Strava', icon: Flame, color: '#FF5B37' },
  { key: 'health', label: 'Health Connect', icon: HeartPulse, color: '#FF6B9D' },
  { key: 'googlefit', label: 'Google Fit', icon: Target, color: '#4FE0A0' },
];
function ConnectionsSection() {
  return (
    <SettingsGroup title="Connexions">
      {CONNECTOR_LIST.map((c, i) => (
        <SettingsRow key={c.key} icon={c.icon} iconColor={c.color} label={c.label} value="Non connecté" valueColor={TEXT_FAINT} last={i === CONNECTOR_LIST.length - 1} />
      ))}
    </SettingsGroup>
  );
}

// ---------- Notifications ----------
const DEFAULT_NOTIF_PREFS = { rappel: true, coach: true, hydratation: true, sommeil: true, pesee: false };
function NotificationsSection({ notifPrefs, setNotifPrefs }) {
  const n = { ...DEFAULT_NOTIF_PREFS, ...notifPrefs };
  const upd = (k, v) => setNotifPrefs({ ...n, [k]: v });
  return (
    <SettingsGroup title="Notifications">
      <ToggleSettingsRow icon={Bell} iconColor={ACCENT} label="Rappel séance" sublabel="1h avant" value={n.rappel} onChange={(v) => upd('rappel', v)} />
      <ToggleSettingsRow icon={Shield} iconColor={ACCENT} label="Conseils du coach" sublabel="Chaque matin" value={n.coach} onChange={(v) => upd('coach', v)} />
      <ToggleSettingsRow icon={Droplet} iconColor={CAT_RECUP} label="Hydratation" value={n.hydratation} onChange={(v) => upd('hydratation', v)} />
      <ToggleSettingsRow icon={Moon} iconColor="#8FA9FF" label="Sommeil" value={n.sommeil} onChange={(v) => upd('sommeil', v)} />
      <ToggleSettingsRow icon={Weight} iconColor={CAT_MOBILITE} label="Pesée" sublabel="Chaque lundi" value={n.pesee} onChange={(v) => upd('pesee', v)} last />
    </SettingsGroup>
  );
}

// ---------- Apparence ----------
const DEFAULT_APPEARANCE = { sound: true, vibration: true };
function AppearanceSection({ appearance, setAppearance }) {
  const a = { ...DEFAULT_APPEARANCE, ...appearance };
  const upd = (k, v) => setAppearance({ ...a, [k]: v });
  return (
    <SettingsGroup title="Apparence">
      <SettingsRow icon={Moon} iconColor={ACCENT} label="Mode sombre" value="Toujours activé" valueColor={ACCENT} />
      <SettingsRow icon={Sparkles} iconColor={ACCENT} label="Couleur Spartan" value="Vert" valueColor={TEXT_SOFT} />
      <ToggleSettingsRow icon={Volume2} iconColor={TEXT_SOFT} label="Sons" value={a.sound} onChange={(v) => upd('sound', v)} />
      <ToggleSettingsRow icon={Vibrate} iconColor={TEXT_SOFT} label="Vibrations" value={a.vibration} onChange={(v) => upd('vibration', v)} last />
    </SettingsGroup>
  );
}


// ---------- Mes informations ----------
function MyInfoSection({ info, setInfo }) {
  const p = info || {};
  const upd = (k, v) => setInfo({ ...p, [k]: v });
  return (
    <SettingsGroup title="Mes informations" action={<span style={{ fontSize: 10, color: TEXT_FAINT }}>Tape pour renseigner</span>}>
      <EditableValueRow icon={PersonStanding} iconColor={CAT_COURSE} label="Taille" value={p.taille} unit=" cm" placeholder="cm" onSave={(v) => upd('taille', v)} />
      <EditableValueRow icon={Weight} iconColor={CAT_RECUP} label="Poids" value={p.poids} unit=" kg" placeholder="kg" onSave={(v) => upd('poids', v)} />
      <EditableValueRow icon={CalendarDays} iconColor={CAT_MUSCU} label="Âge" value={p.age} unit=" ans" placeholder="ans" onSave={(v) => upd('age', v)} />
      <EditableValueRow icon={HeartPulse} iconColor="#FF6B5C" label="FC max" value={p.fcMax} unit=" bpm" placeholder="bpm" onSave={(v) => upd('fcMax', v)} />
      <EditableValueRow icon={HeartPulse} iconColor="#FF8A5C" label="FC repos" value={p.fcRepos} unit=" bpm" placeholder="bpm" onSave={(v) => upd('fcRepos', v)} />
      <EditableValueRow icon={BarChart3} iconColor={CAT_COURSE} label="VO₂max" value={p.vo2max} unit=" ml/kg/min" placeholder="ml/kg/min" onSave={(v) => upd('vo2max', v)} />
      <EditableValueRow icon={Zap} iconColor="#E8D94C" label="VMA" value={p.vma} unit=" km/h" placeholder="km/h" onSave={(v) => upd('vma', v)} />
      <EditableValueRow icon={Gauge} iconColor={CAT_MUSCU} label="FTP" value={p.ftp} unit=" W" placeholder="watts" onSave={(v) => upd('ftp', v)} />
      <EditableValueRow icon={PersonStanding} iconColor={CAT_COURSE} label="Allure endurance" value={p.alureEndurance} placeholder="min/km" onSave={(v) => upd('alureEndurance', v)} />
      <EditableValueRow icon={Zap} iconColor={CAT_SPARTAN} label="Allure seuil" value={p.alureSeuil} placeholder="min/km" onSave={(v) => upd('alureSeuil', v)} last />
    </SettingsGroup>
  );
}

// ---------- Statistiques avancées ----------
function AdvancedStatsSection({ completions, stats, records }) {
  const bw = bestWeek(completions);
  const bm = bestMonth(completions);
  const ls = longestSession(completions);
  const muscuRecord = Object.entries(records).find(([k]) => k.startsWith('record-') && RECORD_CATALOG.muscu.some(it => it.key === k));
  const muscuRecordNorm = muscuRecord ? normalizeRecord(muscuRecord[1]) : null;
  const muscuRecordLabel = muscuRecord ? RECORD_CATALOG.muscu.find(it => it.key === muscuRecord[0])?.label : null;

  return (
    <SettingsGroup title="Statistiques avancées">
      <SettingsRow icon={TrendingUp} iconColor={ACCENT} label="Meilleure semaine" sublabel={bw ? `Semaine ${bw.week}` : 'Pas encore de données'} value={bw ? `${bw.sessions} séances` : '—'} />
      <SettingsRow icon={CalendarDays} iconColor={CAT_MUSCU} label="Meilleur mois" sublabel={bm ? formatMonthLabel(bm.month) : 'Pas encore de données'} value={bm ? `${bm.count} séances` : '—'} />
      <SettingsRow icon={Flame} iconColor="#FF8A5C" label="Plus longue série" value={`${stats.longest} jours`} valueColor={stats.current === stats.longest && stats.current > 0 ? ACCENT : TEXT_SOFT} />
      <SettingsRow icon={Timer} iconColor={CAT_COURSE} label="Plus longue séance" sublabel={ls ? formatMonthLabel(ls.date.slice(0, 7)) : 'Pas encore de données'} value={ls ? `${Math.floor(ls.totalMin / 60)}h${String(ls.totalMin % 60).padStart(2, '0')}` : '—'} />
      <SettingsRow icon={Trophy} iconColor="#E8D94C" label="Record musculation" sublabel={muscuRecordLabel || undefined} value={muscuRecordNorm ? muscuRecordNorm.value : '—'} last />
    </SettingsGroup>
  );
}

// ---------- Mes équipements ----------
const EQUIPMENT_TYPES = [
  { key: 'watch', label: 'Montre', icon: Watch },
  { key: 'hr', label: 'Ceinture cardio', icon: HeartPulse },
  { key: 'shoes', label: 'Chaussures', icon: Footprints },
  { key: 'sensor', label: 'Capteur', icon: Battery },
  { key: 'bike', label: 'Compteur vélo', icon: Gauge },
];

function EquipmentRow({ item, onUpdateMileage, last }) {
  const type = EQUIPMENT_TYPES.find(t => t.key === item.type) || EQUIPMENT_TYPES[0];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: last ? 'none' : `1px solid ${CARD_BORDER}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: ACCENT + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <type.icon size={15} color={ACCENT} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{item.name}</div>
        <div style={{ fontSize: 10.5, color: TEXT_SOFT, marginTop: 1 }}>
          {item.purchaseDate ? `Acquis le ${formatRecordDate(item.purchaseDate) || item.purchaseDate}` : 'Date non renseignée'}
          {item.type === 'shoes' && item.mileage ? ` · ${item.mileage} km` : ''}
        </div>
      </div>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: TEXT_FAINT, background: '#1B2129', padding: '3px 8px', borderRadius: 8, flexShrink: 0 }}>Non synchronisé</span>
    </div>
  );
}

function AddEquipmentRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('watch');
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="spartan-tap" style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <PlusCircle size={16} color={ACCENT} />
        <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>Ajouter un équipement</span>
      </button>
    );
  }
  return (
    <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom (ex : Garmin Fenix 7)" autoFocus
        style={{ background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 9, padding: '8px 11px', color: TEXT, fontSize: 12.5, fontFamily: FONT, outline: 'none' }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {EQUIPMENT_TYPES.map(t => (
          <button key={t.key} onClick={() => setType(t.key)} className="spartan-tap" style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 9, cursor: 'pointer',
            background: type === t.key ? ACCENT + '22' : '#0D1015', border: `1px solid ${type === t.key ? ACCENT : CARD_BORDER}`,
          }}>
            <t.icon size={11} color={type === t.key ? ACCENT : TEXT_SOFT} />
            <span style={{ fontSize: 10.5, color: type === t.key ? ACCENT : TEXT_SOFT }}>{t.label}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setOpen(false); setName(''); }} style={{ flex: 1, background: 'none', border: `1px solid ${CARD_BORDER}`, borderRadius: 9, padding: '8px 0', color: TEXT_SOFT, fontSize: 12, cursor: 'pointer' }}>Annuler</button>
        <button onClick={() => { if (name.trim()) { onAdd({ id: Date.now(), name: name.trim(), type, purchaseDate: todayISO(), mileage: 0 }); setOpen(false); setName(''); } }}
          style={{ flex: 1, background: ACCENT, border: 'none', borderRadius: 9, padding: '8px 0', color: '#0A0C0E', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Ajouter</button>
      </div>
    </div>
  );
}

function EquipmentSection({ equipment, setEquipment }) {
  const list = equipment || [];
  return (
    <SettingsGroup title="Mes équipements">
      {list.map((item, i) => <EquipmentRow key={item.id} item={item} last={false} />)}
      <AddEquipmentRow onAdd={(item) => setEquipment([...list, item])} />
    </SettingsGroup>
  );
}

// ---------- Sauvegarde ----------
function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = React.useRef(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try { await exportAllData(); setMessage('Sauvegarde exportée.'); }
    catch (e) { setMessage('Échec de l\u2019export.'); }
    setBusy(false);
    setTimeout(() => setMessage(''), 3000);
  };
  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    try { await importAllData(file); setMessage('Import réussi. Recharge l\u2019application pour voir les changements.'); }
    catch (err) { setMessage('Fichier invalide.'); }
    setBusy(false);
    setTimeout(() => setMessage(''), 4000);
  };
  const handleReset = async () => {
    if (!confirmingReset) { setConfirmingReset(true); return; }
    setBusy(true);
    await resetAllData();
    setBusy(false);
    setConfirmingReset(false);
    setMessage('Données réinitialisées. Recharge l\u2019application.');
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <SettingsGroup title="Sauvegarde & données">
      <SettingsRow icon={CloudOff} iconColor={TEXT_SOFT} label="Sauvegarde cloud" value="Non disponible" valueColor={TEXT_FAINT} />
      <SettingsRow icon={Download} iconColor={ACCENT} label="Exporter mes données" sublabel="Fichier .json" onClick={handleExport} />
      <SettingsRow icon={Upload} iconColor={CAT_MUSCU} label="Importer des données" sublabel="Depuis un fichier" onClick={() => fileInputRef.current && fileInputRef.current.click()} />
      <SettingsRow icon={Trash2} iconColor="#FF6B5C" danger label={confirmingReset ? 'Confirmer la suppression ?' : 'Réinitialiser l\u2019application'} sublabel={confirmingReset ? 'Cette action est définitive' : 'Supprimer toutes les données'} onClick={handleReset} last />
      <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
      {message && <div style={{ padding: '10px 15px', fontSize: 11.5, color: ACCENT, borderTop: `1px solid ${CARD_BORDER}` }}>{message}</div>}
    </SettingsGroup>
  );
}

// ---------- À propos ----------
function AboutSection() {
  return (
    <SettingsGroup title="À propos">
      <SettingsRow icon={Shield} iconColor={ACCENT} label="Spartan 365" value={`Version ${APP_VERSION}`} valueColor={TEXT_SOFT} />
      <SettingsRow icon={Sparkles} iconColor={CAT_MOBILITE} label="Nouveautés" sublabel="Voir le changelog" />
      <SettingsRow icon={MessageSquare} iconColor={CAT_COURSE} label="Nous contacter" sublabel="support@spartan365.app" />
      <SettingsRow icon={BookOpen} iconColor={TEXT_SOFT} label="Mentions légales" />
      <SettingsRow icon={ShieldCheck} iconColor={TEXT_SOFT} label="Politique de confidentialité" last />
    </SettingsGroup>
  );
}


// ---------- Profil: écran principal ----------
function ProfileScreen({
  completions, level, records, setRecordFor,
  weeklyPlan, setWeeklyPlan, trainingPrefs, setTrainingPrefs,
  notifPrefs, setNotifPrefs, appearance, setAppearance,
  profileInfo, setProfileInfo, equipment, setEquipment,
}) {
  const stats = useMemo(() => computeStats(completions), [completions]);
  const cum = useMemo(() => cumulativeTrainingStats(completions, stats), [completions, stats]);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 23, fontWeight: 800 }}>Profil</div>
      </div>

      <div className="spartan-fade-in">
        <ProfileHero level={level} stats={stats} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '40ms' }}>
        <ObjectivesSection records={records} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '80ms' }}>
        <GlobalSummaryCard stats={stats} cum={cum} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '120ms' }}>
        <WeeklyScheduleConfigurator plan={weeklyPlan} setPlan={setWeeklyPlan} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '160ms' }}>
        <TrainingPreferencesSection prefs={trainingPrefs} setPrefs={setTrainingPrefs} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '200ms' }}>
        <ConnectionsSection />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '240ms' }}>
        <NotificationsSection notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '280ms' }}>
        <AppearanceSection appearance={appearance} setAppearance={setAppearance} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '320ms' }}>
        <MyInfoSection info={profileInfo} setInfo={setProfileInfo} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '360ms' }}>
        <AdvancedStatsSection completions={completions} stats={stats} records={records} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '400ms' }}>
        <EquipmentSection equipment={equipment} setEquipment={setEquipment} />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '440ms' }}>
        <BackupSection />
      </div>

      <div className="spartan-fade-in" style={{ animationDelay: '480ms' }}>
        <AboutSection />
      </div>

    </div>
  );
}



const SESSION_TIME_LABEL = { muscu: '08:00', course: '18:30', routine: '20:00' };

function TimelineSessionCard({ s, day, done, onClick, isLast }) {
  const libSession = s.key === 'course' ? findSessionForDay(day, 'course') : s.key === 'muscu' ? findSessionForDay(day, 'muscu') : null;
  const time = SESSION_TIME_LABEL[s.key] || '';
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 44 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: TEXT_FAINT, fontFamily: FONT }}>{time}</span>
        <div style={{
          width: 11, height: 11, borderRadius: '50%', marginTop: 6, flexShrink: 0,
          background: done ? ACCENT : 'transparent', border: `2px solid ${done ? ACCENT : CARD_BORDER}`,
          transition: 'all 0.3s ease',
        }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: CARD_BORDER, marginTop: 4 }} />}
      </div>
      <button onClick={onClick} className="spartan-tap" style={{
        flex: 1, marginBottom: 16, textAlign: 'left', cursor: 'pointer', background: CARD, border: `1px solid ${CARD_BORDER}`,
        borderRadius: 16, padding: 8, display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden',
      }}>
        {libSession ? (
          <div style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            <SessionCoverArt session={libSession} height={46} rounded={12} showLabel={false} />
          </div>
        ) : (
          <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: `linear-gradient(150deg, ${s.iconColor}2A, #0B0D11)` }}>
            <SceneComposition variant="obstacle" seed={hashSeed(day.date + s.key)} color={s.iconColor} height={46} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,6,7,0.3)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={18} color={s.iconColor} />
            </div>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: TEXT_SOFT }}>{s.kicker}</div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: TEXT, marginTop: 1 }}>{s.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: TEXT_SOFT, display: 'flex', alignItems: 'center', gap: 4 }}><Timer size={10} /> {s.minutes} min</span>
            {libSession && <DifficultyBadge level={libSession.difficulty} compact />}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '5px 9px', borderRadius: 9, flexShrink: 0,
          color: done ? '#0A0C0E' : TEXT_SOFT, background: done ? ACCENT : '#1B2129',
          transition: 'all 0.3s ease',
        }}>
          {done ? 'Terminée' : 'À faire'}
        </span>
      </button>
    </div>
  );
}

function WeekLoadChart({ weekDays, selectedDate, todayDate }) {
  const data = weekLoadData(weekDays);
  const max = Math.max(1, ...data.map(d => d.charge));
  const hardest = data.reduce((m, d) => (d.charge > m.charge ? d : m), data[0]);
  const gradId = 'spartanLoadGrad';
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charge hebdomadaire</span>
        <span style={{ fontSize: 10.5, color: TEXT_FAINT }}>pic {weekdayLabel(hardest.date)}</span>
      </div>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="1" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.35" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 84 }}>
        {data.map((d, i) => {
          const isSel = d.date === selectedDate;
          const isToday = d.date === todayDate;
          const h = Math.max(8, (d.charge / max) * 100);
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: isSel ? ACCENT : TEXT_FAINT, opacity: isSel || isToday ? 1 : 0.7 }}>{d.charge}</span>
              <div style={{
                width: '100%', maxWidth: 22, height: `${h}%`, borderRadius: 5,
                background: isSel ? `url(#${gradId})` : (isToday ? '#4A5A32' : '#232A34'),
                border: isToday && !isSel ? `1px solid ${ACCENT}55` : 'none',
                transition: 'height 0.8s cubic-bezier(0.16,1,0.3,1), background 0.3s',
                boxShadow: isSel ? `0 0 14px ${ACCENT}55` : 'none',
              }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: isSel ? ACCENT : TEXT_FAINT }}>{weekdayLabel(d.date).slice(0, 2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TomorrowPreviewCard({ nextDay, onClick }) {
  const est = estimateSession(nextDay);
  const st = dayStatus(nextDay);
  const mainObjective = nextDay.course ? nextDay.course.replace(/^[^\s]+\s/, '') : (nextDay.seanceMuscu !== '—' ? nextDay.seanceMuscu.replace(/^[^\s]+\s/, '') : nextDay.theme.replace(/^[^\s]+\s/, ''));
  return (
    <button onClick={onClick} className="spartan-tap" style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', background: '#0E1116', border: `1px solid ${CARD_BORDER}`,
      borderRadius: 18, padding: '15px 16px', display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#1B2129', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Moon size={17} color={TEXT_SOFT} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Demain</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 1 }}>{mainObjective}</div>
        <div style={{ fontSize: 11, color: TEXT_SOFT, marginTop: 3 }}>{st.sessionCount} séance{st.sessionCount > 1 ? 's' : ''} · {est.totalMin} min</div>
      </div>
      <ChevronRight size={17} color={TEXT_FAINT} />
    </button>
  );
}

// Architecture note: pass `coachImage` (a real illustration of the coach / a scene) once available —
// this card swaps its Shield watermark for that image with no other structural change.
function PlanningCoachCard({ day, tomorrow, coachImage }) {
  const fatigue = FATIGUE_INFO[day.indicateur] || FATIGUE_INFO['🟢 Faible'];
  const tomorrowSt = dayStatus(tomorrow);
  const chargeDelta = (tomorrow.charge || 0) - (day.charge || 0);
  const courseMatch = matchCourseType(day.course);
  const hasMuscu = day.seanceMuscu && day.seanceMuscu !== '—';

  // Why today's session is placed here — pulled from the real programme data, never generic.
  let placement;
  if (courseMatch && !courseMatch.isRace && courseMatch.data) {
    placement = `La séance de ${day.course.replace(/^[^\s]+\s/, '')} d\u2019aujourd\u2019hui vise à ${courseMatch.data.objectif.toLowerCase()} — cohérent avec la phase « ${phaseInfo(day).name} » que tu traverses.`;
  } else if (hasMuscu) {
    const meta = MUSCU_META[day.seanceMuscu];
    placement = meta ? `${day.seanceMuscu.replace(/^[^\s]+\s/, '')} (${meta.subtitle.toLowerCase()}) est placée aujourd\u2019hui pour équilibrer ta semaine de renforcement.` : `Ta séance de musculation du jour complète l\u2019équilibre de ta semaine.`;
  } else {
    placement = `Pas de grosse séance aujourd\u2019hui — la routine Spartan et la mobilité (${day.mobilite || 0} min prévues) entretiennent ta base pendant que tu récupères.`;
  }

  // Tomorrow — a real numeric comparison, not a vague statement.
  let tomorrowLine;
  if (tomorrowSt.isRace) {
    tomorrowLine = `Demain, c\u2019est le jour J : ${tomorrow.course.replace(/^[^\s]+\s/, '')}. Priorité absolue au repos ce soir.`;
  } else if (chargeDelta >= 5) {
    tomorrowLine = `Demain sera nettement plus exigeant (charge ${tomorrow.charge} contre ${day.charge} aujourd\u2019hui) — arrive frais.`;
  } else if (chargeDelta > 0) {
    tomorrowLine = `Demain sera un peu plus dense (charge ${tomorrow.charge} contre ${day.charge}).`;
  } else if (chargeDelta < 0) {
    tomorrowLine = `Demain sera plus léger (charge ${tomorrow.charge} contre ${day.charge}) — bon moment pour souffler.`;
  } else {
    tomorrowLine = `Demain conserve une charge similaire (${tomorrow.charge}) — reste régulier.`;
  }

  const tips = [];
  const tomorrowDemanding = tomorrowSt.hasCourse || (tomorrow.charge || 0) >= 15;
  tips.push({
    icon: Droplet, label: 'Hydratation',
    text: tomorrowDemanding ? 'vise 500 ml d\u2019eau de plus qu\u2019un jour normal' : 'maintiens ton hydratation habituelle',
  });
  tips.push({
    icon: Moon, label: 'Sommeil',
    text: tomorrowDemanding ? 'couche-toi avant 22h30 pour encaisser la charge de demain' : '7 à 8h suffisent ce soir',
  });
  tips.push({
    icon: Flame, label: 'Alimentation',
    text: tomorrowDemanding ? 'privilégie les glucides complexes ce soir (riz, pâtes, patate douce)' : 'repas normal, pas besoin de surcharger',
  });
  tips.push({
    icon: ShieldCheck, label: 'Prévention',
    text: day.indicateur === '🔴 Élevée' ? 'à la moindre douleur inhabituelle, arrête la séance' : 'échauffement complet avant l\u2019effort, comme toujours',
  });

  return (
    <div style={{ position: 'relative', borderRadius: 20, padding: '18px 18px', overflow: 'hidden', background: coachImage ? '#0D1015' : `linear-gradient(135deg, #1A1F14 0%, #0D1015 65%)`, border: `1px solid ${ACCENT}33` }}>
      {coachImage ? (
        <img src={coachImage} alt="Coach Spartan" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }} />
      ) : (
        <div style={{ position: 'absolute', right: -14, top: -14, opacity: 0.12 }}>
          <Shield size={100} color={ACCENT} strokeWidth={1} />
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color={ACCENT} />
          <span style={{ fontSize: 11.5, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coach Spartan</span>
        </div>
        <div style={{ fontSize: 13, color: '#D6D9DD', marginTop: 10, lineHeight: 1.55 }}>{placement}</div>
        <div style={{ fontSize: 13, color: '#D6D9DD', marginTop: 6, lineHeight: 1.55 }}>{tomorrowLine}</div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <t.icon size={13} color={ACCENT} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12.5, color: '#B9BEC6' }}><span style={{ color: TEXT, fontWeight: 700 }}>{t.label}</span> — {t.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Architecture note: pass `bgImage` once real photography/illustration exists for "Pensée du jour" —
// it replaces the generated backdrop scene with no other change to this component's API.
function DailyInsightCard({ dateISO, bgImage }) {
  const insight = dailyInsight(dateISO);
  const meta = INSIGHT_CATEGORIES[insight.cat];
  const seed = hashSeed(dateISO);
  const sceneVariant = insight.cat === 'course' ? 'ridge' : insight.cat === 'muscu' ? 'gym' : insight.cat === 'mental' || insight.cat === 'histoire' ? 'obstacle' : insight.cat === 'recup' || insight.cat === 'nutrition' ? 'sunrise' : 'calm';
  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', minHeight: 108 }}>
      {bgImage ? (
        <img src={bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5 }}>
          <SceneComposition variant={sceneVariant} seed={seed} color={meta.color} height={108} />
        </div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,6,7,0.55), rgba(5,6,7,0.88))' }} />
      <div style={{ position: 'relative', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <meta.icon size={12} color={meta.color} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginTop: 9, lineHeight: 1.45, fontStyle: insight.cat === 'citation' || insight.cat === 'mental' ? 'italic' : 'normal' }}>
          {insight.cat === 'citation' || insight.cat === 'mental' ? `« ${insight.text} »` : insight.text}
        </div>
      </div>
    </div>
  );
}

function TodaySummaryCard({ day, est }) {
  const objectif = day.course ? day.course.replace(/^[^\s]+\s/, '') : (day.seanceMuscu !== '—' ? day.seanceMuscu.replace(/^[^\s]+\s/, '') : day.theme.replace(/^[^\s]+\s/, ''));
  const fatigue = FATIGUE_INFO[day.indicateur] || FATIGUE_INFO['🟢 Faible'];
  const stat = (Icon, color, label, value) => (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: TEXT_SOFT }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginTop: 1, lineHeight: 1.25 }}>{value}</div>
      </div>
    </div>
  );
  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 20, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Résumé du jour</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {stat(Timer, ACCENT, 'Temps prévu', `${Math.floor(est.totalMin / 60)}h${String(est.totalMin % 60).padStart(2, '0')}`)}
        {stat(Flame, '#FF8A5C', 'Calories est.', `${est.totalKcal} kcal`)}
        {stat(Zap, fatigue.color, 'Charge', day.charge)}
        {stat(Target, CAT_SPARTAN, 'Objectif principal', objectif)}
      </div>
    </div>
  );
}


const RACE_SCENE_VARIANT = {
  'Semi-Marathon Saint-Jean-de-Luz': 'track',
  'Marathon de Paris': 'avenue',
  'Spartan Ultra Morzine': 'obstacle',
};

function ObjectiveCard({ race, daysToRace, pct }) {
  const variant = RACE_SCENE_VARIANT[race.name] || 'ridge';
  const color = variant === 'avenue' ? CAT_COURSE : variant === 'obstacle' ? CAT_SPARTAN : CAT_COURSE;
  const seed = hashSeed(race.name);
  return (
    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: 108 }}>
        {race.image ? (
          <img src={race.image} alt={race.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(60% 80% at 20% 10%, rgba(255,255,255,0.09), transparent 60%),
                         radial-gradient(130% 140% at 100% 105%, ${color}38, transparent 58%),
                         linear-gradient(155deg, #171B22 0%, #08090B 100%)`,
          }}>
            <SceneComposition variant={variant} seed={seed} color={color} height={108} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(5,6,7,0.55) 100%)' }} />
      </div>
      <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderTop: 'none', borderRadius: '0 0 20px 20px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: TEXT_SOFT }}>Prochain objectif</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 1 }}>{race.name}</div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>J-{daysToRace}</div>
        </div>
        <div style={{ marginTop: 12 }}><MiniBar pct={pct} glow /></div>
        <div style={{ fontSize: 11, color: TEXT_FAINT, marginTop: 5 }}>{pct}% du plan écoulé</div>
      </div>
    </div>
  );
}

function PlanningScreen({ completions, toggleDay, level, setTab }) {
  const todayIdx = Math.max(0, Math.min(getDayIndex(), DAYS.length - 1));
  const todayDay = DAYS[todayIdx];
  const [selectedDate, setSelectedDate] = useState(todayDay.date);
  const [detail, setDetail] = useState(null); // { day, kind }

  const selectedDay = useMemo(() => DAYS.find(d => d.date === selectedDate) || todayDay, [selectedDate]);
  const weekDays = useMemo(() => getWeekDays(selectedDay.semaine), [selectedDay]);
  const maxWeek = DAYS[DAYS.length - 1].semaine;

  const goWeek = (delta) => {
    const target = Math.max(1, Math.min(maxWeek, selectedDay.semaine + delta));
    const first = getWeekDays(target)[0];
    if (first) setSelectedDate(first.date);
  };

  const phase = phaseInfo(selectedDay);
  const isSelectedToday = selectedDate === todayDay.date;

  const selectedIdx = DAYS.findIndex(d => d.date === selectedDate);
  const nextDay = DAYS[Math.min(DAYS.length - 1, selectedIdx + 1)];

  const est = estimateSession(selectedDay);
  const sessionsToday = sessionSummaryForDay(selectedDay)
    .map(s => ({ ...s, minutes: est.items.find(i => i.type === s.key)?.min }))
    .sort((a, b) => (SESSION_TIME_LABEL[a.key] || '').localeCompare(SESSION_TIME_LABEL[b.key] || ''));

  const nextRace = useMemo(() => {
    const t = todayISO();
    return RACES.find(r => r.date >= t) || RACES[RACES.length - 1];
  }, []);
  const daysToRace = daysBetween(todayISO(), nextRace.date);
  const racePct = raceProgress(nextRace);
  const coachPrepLine = racePct >= 80
    ? 'Tu es parfaitement dans les temps.'
    : racePct >= 50
    ? 'Bon rythme, garde le cap.'
    : 'Attention, il reste encore du travail — reste régulier.';

  const animatedPhasePct = useCountUp(phase.pct);
  const animatedRacePct = useCountUp(racePct);

  const openDetail = (kind, day) => setDetail({ kind, day });

  const detailDay = detail && detail.day;
  const detailMatch = detailDay ? matchCourseType(detailDay.course) : null;
  const detailMuscu = detailDay && detailDay.seanceMuscu !== '—' ? MUSCULATION[detailDay.seanceMuscu] : null;
  const detailIsToday = detailDay && detailDay.date === todayDay.date;
  const detailDone = detailDay && completions[detailDay.date] && completions[detailDay.date].fait;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 40px 20px' }}>

      {/* Header */}
      <div style={{ fontSize: 23, fontWeight: 800 }}>Planning</div>
      <div style={{ fontSize: 13.5, color: TEXT_SOFT, marginTop: 3 }}>Ton plan. Ta discipline. Ton objectif.</div>

      {/* Week navigator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 }}>
        <button onClick={() => goWeek(-1)} className="spartan-tap" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={16} color={TEXT_SOFT} />
        </button>
        <div key={selectedDay.semaine} className="spartan-fade-in" style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>
          {formatDateHeader(weekDays[0].date).split(' ').slice(0, 3).join(' ')} — Semaine {selectedDay.semaine}
        </div>
        <button onClick={() => goWeek(1)} className="spartan-tap" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronRight size={16} color={TEXT_SOFT} />
        </button>
      </div>

      {/* Capsule calendar */}
      <div key={selectedDay.semaine} className="spartan-fade-in" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
        {weekDays.map(d => {
          const isSel = d.date === selectedDate;
          const isToday = d.date === todayDay.date;
          const done = completions[d.date] && completions[d.date].fait;
          const st = dayStatus(d);
          const cat = dayPrimaryCategory(d);
          const iconColor = done ? ACCENT : cat.color;
          return (
            <button key={d.date} onClick={() => setSelectedDate(d.date)} className="spartan-tap" style={{
              flex: '1 0 0', minWidth: 42, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '10px 0 9px 0', borderRadius: 16, cursor: 'pointer',
              background: isSel ? ACCENT : CARD,
              border: isSel ? 'none' : `1px solid ${isToday ? '#3A4A2E' : CARD_BORDER}`,
              transform: isSel ? 'scale(1.07)' : 'scale(1)',
              transition: 'background 0.25s, transform 0.25s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: isSel ? '#0A0C0E' : TEXT_SOFT, letterSpacing: '0.03em' }}>{weekdayLabel(d.date)}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: isSel ? '#0A0C0E' : TEXT }}>{dateFromISO(d.date).getDate()}</span>
              <span style={{ height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <cat.icon size={12} color={isSel ? '#0A0C0E' : iconColor} strokeWidth={done ? 2.6 : 2} />
              </span>
              {st.sessionCount > 2 && (
                <span style={{
                  fontSize: 7.5, fontWeight: 800, color: isSel ? '#0A0C0E' : ACCENT,
                  background: isSel ? 'rgba(10,12,14,0.25)' : ACCENT + '1F', borderRadius: 6, padding: '1px 4px', marginTop: -2,
                }}>×{st.sessionCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progression card */}
      <div className="spartan-fade-in" style={{ animationDelay: '40ms', marginTop: 18, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semaine {phase.weekInPhase} / {phase.totalWeeks}</div>
            <div style={{ fontSize: 12, color: TEXT_SOFT, marginTop: 6 }}>Phase actuelle</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 1 }}>{phase.name}</div>
            <div style={{ margin: '10px 0 6px 0' }}><MiniBar pct={phase.pct} glow /></div>
            <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{animatedPhasePct}% complétée</div>
          </div>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#1B2129', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 8.5, color: TEXT_SOFT }}>NIV.</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{level.level}</span>
          </div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <Shield size={14} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12.5, color: '#D6D9DD' }}>Coach Spartan : <span style={{ fontStyle: 'italic' }}>« {coachPrepLine} »</span></div>
        </div>
      </div>

      {/* Résumé du jour */}
      <div className="spartan-fade-in" style={{ animationDelay: '90ms', marginTop: 14 }}>
        <TodaySummaryCard day={selectedDay} est={est} />
      </div>

      {/* Timeline du jour sélectionné */}
      <div style={{ marginTop: 22, marginBottom: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {isSelectedToday ? 'Aujourd\u2019hui' : formatDateMedium(selectedDay.date)}
        </span>
        <span style={{ fontSize: 11, color: TEXT_FAINT }}>{sessionsToday.length} séance{sessionsToday.length > 1 ? 's' : ''}</span>
      </div>
      <div key={selectedDate} className="spartan-fade-in">
        {sessionsToday.map((s, i) => (
          <TimelineSessionCard key={s.key} s={s} day={selectedDay} done={completions[selectedDay.date] && completions[selectedDay.date].fait} onClick={() => openDetail(s.key, selectedDay)} isLast={i === sessionsToday.length - 1} />
        ))}
      </div>

      {/* Aperçu de demain */}
      <div className="spartan-fade-in" style={{ animationDelay: '120ms', marginTop: 4, marginBottom: 18 }}>
        <TomorrowPreviewCard nextDay={nextDay} onClick={() => setSelectedDate(nextDay.date)} />
      </div>

      {/* Charge hebdomadaire */}
      <div className="spartan-fade-in" style={{ animationDelay: '150ms', marginBottom: 14 }}>
        <WeekLoadChart weekDays={weekDays} selectedDate={selectedDate} todayDate={todayDay.date} />
      </div>

      {/* Coach Spartan */}
      <div className="spartan-fade-in" style={{ animationDelay: '210ms', marginBottom: 14 }}>
        <PlanningCoachCard day={todayDay} tomorrow={DAYS[Math.min(DAYS.length - 1, todayIdx + 1)]} />
      </div>

      {/* Pensée du jour */}
      <div className="spartan-fade-in" style={{ animationDelay: '240ms', marginBottom: 14 }}>
        <DailyInsightCard dateISO={todayDay.date} />
      </div>

      {/* Prochain objectif */}
      <div className="spartan-fade-in" style={{ animationDelay: '270ms' }}>
        <ObjectiveCard race={nextRace} daysToRace={daysToRace} pct={animatedRacePct} />
      </div>

      {/* Session detail sheet */}
      {detail && (
        <DetailModal
          onClose={() => setDetail(null)}
          kicker={detail.kind === 'course' ? 'Course à pied' : detail.kind === 'muscu' ? 'Musculation' : 'Routine Spartan'}
          title={
            detail.kind === 'course' ? (detailDay.course || '').replace(/^[^\s]+\s/, '') :
            detail.kind === 'muscu' ? (detailDay.seanceMuscu || '').replace(/^[^\s]+\s/, '') :
            `${sessionSummaryForDay(detailDay).find(s => s.key === 'routine').title}`
          }
        >
          <div style={{ fontSize: 12, color: TEXT_SOFT, marginBottom: 14 }}>{formatDateMedium(detailDay.date)}</div>
          {detail.kind === 'routine' && <RoutineDetail day={detailDay} />}
          {detail.kind === 'muscu' && <MuscuDetail exercises={detailMuscu} />}
          {detail.kind === 'course' && <CourseDetail match={detailMatch} />}

          {detailIsToday ? (
            <button onClick={() => { toggleDay(detailDay.date); setDetail(null); setTab('today'); }} className="spartan-tap" style={{
              width: '100%', marginTop: 18, padding: '15px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14.5, fontWeight: 800, color: '#0A0C0E',
            }}>
              <Play size={16} /> {detailDone ? 'Journée validée' : 'Lancer la séance'}
            </button>
          ) : (
            <div style={{ marginTop: 18, textAlign: 'center', fontSize: 12.5, color: TEXT_FAINT }}>Disponible le jour J</div>
          )}
        </DetailModal>
      )}
    </div>
  );
}

// ---------- Séances: coach recommendation logic ----------
function findSessionForDay(day, kind) {
  if (kind === 'course' && day.course) {
    const match = matchCourseType(day.course);
    if (match && !match.isRace && match.key) return SESSION_LIBRARY.find(s => s.id === 'course-' + match.key) || null;
  }
  if (kind === 'muscu' && day.seanceMuscu && day.seanceMuscu !== '—') {
    return SESSION_LIBRARY.find(s => s.id === 'muscu-' + day.seanceMuscu) || null;
  }
  return null;
}

function coachContext(day) {
  const fatigue = FATIGUE_INFO[day.indicateur] || FATIGUE_INFO['🟢 Faible'];
  const phase = phaseInfo(day);
  const nextRace = RACES.find(r => r.date >= todayISO()) || RACES[RACES.length - 1];
  const daysToRace = daysBetween(todayISO(), nextRace.date);
  const idx = DAYS.findIndex(d => d.date === day.date);
  const tomorrow = DAYS[Math.min(DAYS.length - 1, idx + 1)];
  const tomorrowSession = findSessionForDay(tomorrow, 'course') || findSessionForDay(tomorrow, 'muscu');
  return { fatigue, phase, nextRace, daysToRace, tomorrow, tomorrowSession };
}

function recoverySentence(fatigue, indicateur) {
  if (indicateur === '🔴 Élevée') return `Ta charge d\u2019entraînement est élevée cette semaine — mieux vaut lever le pied aujourd\u2019hui.`;
  if (indicateur === '🟠 Modérée') return `Ta récupération est modérée aujourd\u2019hui, reste à l\u2019écoute de tes sensations.`;
  return `Tu as bien récupéré, ton corps est prêt à performer aujourd\u2019hui.`;
}

function computeRecommendation(day) {
  const ctx = coachContext(day);
  let session, focusReason;

  if (day.indicateur === '🔴 Élevée') {
    session = SESSION_LIBRARY.find(s => s.id === 'recup-respiration');
    focusReason = `Je te conseille une séance de récupération pour repartir plus fort dès demain.`;
  } else {
    const courseSession = findSessionForDay(day, 'course');
    const muscuSession = findSessionForDay(day, 'muscu');
    if (courseSession) {
      session = courseSession;
      focusReason = `Cette séance travaille : ${courseSession.objectif.toLowerCase()}.`;
    } else if (muscuSession) {
      session = muscuSession;
      focusReason = `${muscuSession.objectif} — charge adaptée à ta forme du jour.`;
    } else {
      session = SESSION_LIBRARY.find(s => s.id === 'spartan-grip-core');
      focusReason = `Aucune séance longue prévue aujourd\u2019hui : profites-en pour travailler ton grip et ton gainage.`;
    }
  }

  const reason = `${recoverySentence(ctx.fatigue, day.indicateur)} ${focusReason}`;
  return { session, reason, ctx };
}

// Longer, multi-factor explanation for the "Pourquoi cette séance aujourd'hui ?" card.
function buildWhyThisSession(day, session) {
  const ctx = coachContext(day);
  const lines = [];
  lines.push(recoverySentence(ctx.fatigue, day.indicateur));
  lines.push(`Tu es en phase « ${ctx.phase.name} » (semaine ${ctx.phase.weekInPhase} sur ${ctx.phase.totalWeeks}), avec ${ctx.nextRace.name} dans ${ctx.daysToRace} jours.`);
  if (ctx.tomorrowSession && ctx.tomorrowSession.id !== session.id) {
    const sameEffort = ctx.tomorrowSession.category === session.category;
    if (!sameEffort) {
      lines.push(`Elle complète bien ta ${ctx.tomorrowSession.name.toLowerCase()} prévue demain, sans accumuler de fatigue sur les mêmes filières.`);
    } else {
      lines.push(`Reste progressif : une ${ctx.tomorrowSession.name.toLowerCase()} suit demain sur un registre proche.`);
    }
  }
  return lines;
}

function WeeklyRecapCard({ completions, onDismiss }) {
  const todayIdx = Math.max(0, Math.min(getDayIndex(), DAYS.length - 1));
  const today = DAYS[todayIdx];
  const week = weeklySessions(today, completions);
  const weekDays = getWeekDays(today.semaine);
  const xp = weekDays.reduce((s, d) => s + ((completions[d.date] && completions[d.date].fait) ? (d.points || 0) : 0), 0);
  const pct = Math.round((week.done / Math.max(1, week.total)) * 100);
  const courseDone = weekDays.filter(d => completions[d.date] && completions[d.date].fait && d.course).length;
  const muscuDone = weekDays.filter(d => completions[d.date] && completions[d.date].fait && d.seanceMuscu && d.seanceMuscu !== '—').length;
  const strongPoint = courseDone >= muscuDone ? 'course' : 'musculation';
  const weakPoint = courseDone >= muscuDone ? 'récupération et mobilité' : 'course';

  return (
    <div style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '18px 20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={15} color={ACCENT} />
        <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bilan de la semaine</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: ACCENT }}>{pct}%</div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{week.done} séance{week.done > 1 ? 's' : ''} sur {week.total}</div>
          <div style={{ fontSize: 12, color: TEXT_SOFT, marginTop: 2 }}>+{xp} XP cette semaine</div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}`, fontSize: 12.5, color: '#D6D9DD', lineHeight: 1.6 }}>
        <div>📈 Point fort : régularité sur tes séances de {strongPoint}.</div>
        <div>🎯 Recommandation : ajoute une ou deux séances de {weakPoint} la semaine prochaine.</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={() => onDismiss('adapt')} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', background: ACCENT, color: '#0A0C0E', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>
          ✅ Adapter mon programme
        </button>
        <button onClick={() => onDismiss('keep')} style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: `1px solid ${CARD_BORDER}`, background: 'transparent', color: TEXT_SOFT, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
          ➡ Garder le programme
        </button>
      </div>
    </div>
  );
}

// ---------- Carousel du haut ----------
function CarouselDots({ count, active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: i === active ? 16 : 6, height: 6, borderRadius: 3,
          background: i === active ? ACCENT : '#2A313B', transition: 'all 0.2s',
        }} />
      ))}
    </div>
  );
}

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function MiniBar({ pct, color, glow }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div style={{ width: '100%', height: glow ? 8 : 6, borderRadius: 4, background: '#1B2129', overflow: 'hidden', position: 'relative' }}>
      <div style={{
        width: `${w}%`, height: '100%', background: color || ACCENT, borderRadius: 4,
        transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)', position: 'relative', overflow: 'hidden',
        boxShadow: glow ? `0 0 10px ${color || ACCENT}88` : 'none',
      }}>
        {glow && <div className="spartan-shimmer" style={{ position: 'absolute', inset: 0 }} />}
      </div>
    </div>
  );
}

function TopCarousel({ day, completions, level, xpTotal }) {
  const scrollRef = React.useRef(null);
  const [active, setActive] = useState(0);
  const week = weeklySessions(day, completions);
  const daysToMorzine = daysBetween(todayISO(), RACES[2].date);
  const morzinePct = raceProgress(RACES[2]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = el.firstChild ? el.firstChild.offsetWidth + 12 : 1;
    setActive(Math.round(el.scrollLeft / cardW));
  };

  const cardStyle = {
    flex: '0 0 85%', scrollSnapAlign: 'start', background: CARD, border: `1px solid ${CARD_BORDER}`,
    borderRadius: 22, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190,
  };
  const kickerStyle = { fontSize: 11, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 };

  return (
    <div>
      <div ref={scrollRef} onScroll={onScroll} style={{
        display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch', paddingBottom: 2, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
      }}>
        {/* Carte 1 — Défi & Objectif */}
        <div style={cardStyle}>
          <div style={kickerStyle}><Flame size={13} color={ACCENT} /> Défi &amp; objectif</div>
          <div>
            <div style={{ fontSize: 11.5, color: TEXT_SOFT }}>Jour du défi</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{day.jour} <span style={{ fontSize: 15, color: TEXT_SOFT, fontWeight: 600 }}>/ 366</span></div>
          </div>
          <div style={{ fontSize: 12, color: TEXT_SOFT }}>Objectif principal</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{RACES[2].name}</div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginTop: -6 }}>J-{daysToMorzine}</div>
          <MiniBar pct={morzinePct} />
        </div>

        {/* Carte 2 — Progression */}
        <div style={cardStyle}>
          <div style={kickerStyle}><TrendingUp size={13} color={ACCENT} /> Progression semaine</div>
          <div>
            <div style={{ fontSize: 11.5, color: TEXT_SOFT }}>Séances complétées</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>{week.done} <span style={{ fontSize: 15, color: TEXT_SOFT, fontWeight: 600 }}>/ {week.total}</span></div>
          </div>
          <MiniBar pct={(week.done / Math.max(1, week.total)) * 100} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#1B2129', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 8.5, color: TEXT_SOFT }}>NIV.</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{level.level}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{level.name}</div>
              <div style={{ fontSize: 11, color: TEXT_SOFT }}>{level.xpIntoLevel} / {level.xpPerLevel} XP</div>
              <MiniBar pct={(level.xpIntoLevel / level.xpPerLevel) * 100} />
            </div>
          </div>
        </div>

        {/* Carte 3 — Santé */}
        <div style={cardStyle}>
          <div style={kickerStyle}>❤️ Santé aujourd'hui</div>
          {[
            ['Sommeil', '7h45', 'Bon'],
            ['Body Battery', '78 / 100', 'Élevé'],
            ['FC repos', '48 bpm', 'Bas'],
            ['Poids', '78,4 kg', 'Stable'],
          ].map(([l, v, s]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: TEXT_SOFT }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{v} <span style={{ fontSize: 11, color: ACCENT, fontWeight: 600, marginLeft: 4 }}>{s}</span></span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: TEXT_FAINT, marginTop: 2 }}>Données Garmin — à venir</div>
        </div>

        {/* Carte 4 — Records */}
        <div style={cardStyle}>
          <div style={kickerStyle}><Trophy size={13} color={ACCENT} /> Records</div>
          {RECORDS.map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: TEXT_SOFT }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_FAINT }}>{r.value} <span style={{ fontSize: 10.5, color: TEXT_FAINT, fontWeight: 500 }}>{r.status}</span></span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginTop: 4 }}>Voir tous les records ›</div>
        </div>

        {/* Carte 5 — Objectifs */}
        <div style={cardStyle}>
          <div style={kickerStyle}><Target size={13} color={ACCENT} /> Objectifs</div>
          {RACES.map(r => {
            const d = daysBetween(todayISO(), r.date);
            const pct = raceProgress(r);
            return (
              <div key={r.name} style={{ marginBottom: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: TEXT }}>{r.emoji} {r.name}</span>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{d >= 0 ? `J-${d}` : '—'}</span>
                </div>
                <div style={{ marginTop: 4 }}><MiniBar pct={pct} /></div>
              </div>
            );
          })}
        </div>
      </div>
      <CarouselDots count={5} active={active} />
    </div>
  );
}

// ---------- Séances: session detail page ----------
function SessionDetailTabs({ active, onChange }) {
  const tabs = [
    { key: 'apercu', label: 'Aperçu', icon: Sparkles },
    { key: 'deroule', label: 'Déroulé', icon: Timer },
    { key: 'analyse', label: 'Analyse', icon: BarChart3 },
    { key: 'notes', label: 'Notes', icon: MessageSquare },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, background: '#0D1015', borderRadius: 14, padding: 4 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: active === t.key ? CARD : 'transparent',
          color: active === t.key ? TEXT : TEXT_SOFT, fontSize: 11.5, fontWeight: 700,
        }}>
          <t.icon size={13} /> {t.label}
        </button>
      ))}
    </div>
  );
}

function exerciseVisual(nom) {
  const n = (nom || '').toLowerCase();
  if (/tracti|pull|dead hang|suspension|farmer|grip|pinch|gripper|corde|rope|monkey|rampe|mur|wall|spear|porté|carry/.test(n)) return { icon: Shield, color: CAT_SPARTAN, variant: 'obstacle' };
  if (/couché|développé|presse|squat|leg|fente|soulevé|hip thrust|rowing|tirage|curl|extension|dips|push|élévation|arnold|face pull|split|step-up|adduct|abduct|mollet|tibial/.test(n)) return { icon: Dumbbell, color: CAT_MUSCU, variant: 'gym' };
  if (/burpee|box jump|saut|explosif|sprint/.test(n)) return { icon: Zap, color: CAT_SPARTAN, variant: 'track' };
  if (/planche|gainage|abdo|crunch|bird dog|pallof|russian|mountain climber|bicycle/.test(n)) return { icon: Flame, color: CAT_SPARTAN, variant: 'obstacle' };
  if (/étirement|mobilité|rotation|respiration|stretching/.test(n)) return { icon: Sparkles, color: CAT_MOBILITE, variant: 'calm' };
  if (/pompe/.test(n)) return { icon: Dumbbell, color: CAT_MUSCU, variant: 'gym' };
  return { icon: Footprints, color: CAT_RECUP, variant: 'sunrise' };
}

// Thumbnail slot for a single exercise. Architecture note: pass `exercise.image` (photo/GIF/video
// poster URL) once real media exists — the component swaps to it automatically, no redesign needed.
function ExerciseThumb({ exercise, size = 34 }) {
  const v = exerciseVisual(exercise.nom);
  const seed = hashSeed(exercise.nom || 'x');
  if (exercise.image) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', flexShrink: 0 }}>
        <img src={exercise.image} alt={exercise.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: size * 0.3, overflow: 'hidden', flexShrink: 0, background: `linear-gradient(150deg, ${v.color}2A, #0B0D11)` }}>
      <SceneComposition variant={v.variant} seed={seed} color={v.color} height={size} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,6,7,0.22)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <v.icon size={size * 0.4} color={v.color} strokeWidth={1.4} />
      </div>
    </div>
  );
}

function TimelineStep({ icon: Icon, color, title, minutes, items }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 12, background: color + '1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ flex: 1, width: 2, background: CARD_BORDER, marginTop: 4, marginBottom: 4 }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: TEXT, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT_SOFT }}>{minutes} min</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            typeof it === 'string' ? (
              <div key={i} style={{ fontSize: 13, color: '#D6D9DD' }}>• {it.replace(/^[^:]+:\s*/, '')}</div>
            ) : (
              <div key={i} style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <ExerciseThumb exercise={it} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{it.nom}</span>
                    <span style={{ fontSize: 12.5, color: ACCENT, fontWeight: 700 }}>{it.series}×{it.reps}</span>
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_SOFT, marginTop: 2 }}>{it.cible} · repos {it.repos}{it.rpe ? ` · RPE ${it.rpe}` : ''}</div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

const RECORD_CATALOG = {
  muscu: [
    { key: 'record-bench', label: 'Développé couché' },
    { key: 'record-squat', label: 'Squat' },
    { key: 'record-pullups', label: 'Tractions' },
  ],
  spartan: [
    { key: 'record-deadhang', label: 'Dead Hang' },
    { key: 'record-pullups', label: 'Tractions' },
    { key: 'record-pushups', label: 'Pompes' },
  ],
  course: [
    { key: 'record-fractionne', label: 'Fractionné (allure)' },
    { key: 'record-5km', label: '5 km' },
    { key: 'record-10km', label: '10 km' },
  ],
};

function RecordTile({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  return (
    <div onClick={() => !editing && setEditing(true)} className="spartan-tap" style={{
      background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: '12px 13px',
      cursor: editing ? 'default' : 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Trophy size={13} color={ACCENT} />
        <span style={{ fontSize: 10.5, color: TEXT_SOFT }}>{label}</span>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }} onClick={e => e.stopPropagation()}>
          <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus placeholder="—"
            style={{ width: '100%', background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 7, padding: '5px 8px', color: TEXT, fontSize: 12.5, fontFamily: FONT, outline: 'none' }} />
          <button onClick={() => { onSave(draft); setEditing(false); }} style={{ background: ACCENT, border: 'none', borderRadius: 7, padding: '0 9px', cursor: 'pointer', flexShrink: 0 }}>
            <Send size={11} color="#0A0C0E" />
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 15, fontWeight: 800, color: value ? TEXT : TEXT_FAINT, marginTop: 5 }}>{value || 'Ajouter'}</div>
      )}
    </div>
  );
}

function RecordsGrid({ category, records, setRecord }) {
  const items = RECORD_CATALOG[category];
  if (!items) return null;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Tes records</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {items.map(it => (
          <RecordTile key={it.key} label={it.label} value={records[it.key]} onSave={(v) => setRecord(it.key, v)} />
        ))}
      </div>
    </div>
  );
}

// Architecture note: once real clips exist, pass session.videoUrl and session.videoDurationText —
// this card renders a <video poster> instead of the generated scene the moment they're present.
function VideoPreviewCard({ session }) {
  const cat = CATEGORY_META[session.category];
  return (
    <div className="spartan-tap" style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, overflow: 'hidden', cursor: 'default' }}>
      <div style={{ position: 'relative' }}>
        <SessionCoverArt session={session} height={120} rounded={0} showLabel={false} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(5,6,7,0.55)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={18} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
          </div>
        </div>
        <div style={{ position: 'absolute', right: 10, top: 10, background: 'rgba(5,6,7,0.6)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#C7CAD1' }}>
          Disponible prochainement
        </div>
      </div>
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT }}>Démonstration · {session.name}</div>
          <div style={{ fontSize: 11, color: TEXT_SOFT, marginTop: 2 }}>Technique complète, étape par étape</div>
        </div>
        <span style={{ fontSize: 11, color: TEXT_FAINT, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Timer size={11} /> ~{Math.min(3, Math.max(1, Math.round(session.duration / 20)))} min</span>
      </div>
    </div>
  );
}

function SessionApercuTab({ session, record, setRecord, allRecords, setGlobalRecord }) {
  const cat = CATEGORY_META[session.category];
  const [editingRecord, setEditingRecord] = useState(false);
  const [draft, setDraft] = useState(record || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Bénéfices</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cat.benefitLabels.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#D6D9DD' }}>{label}</span>
              <StarRating value={session.benefits[i] || 0} color={cat.color} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Objectif principal</div>
        <div style={{ fontSize: 14, color: TEXT, background: '#0D1015', borderRadius: 12, padding: '12px 14px' }}>{session.objectif}</div>
      </div>

      <div>
        <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Matériel conseillé</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {session.equipment.map((e, i) => {
            const [emoji, ...rest] = e.split(' ');
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 12, padding: '9px 11px' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: cat.color + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                  {emoji}
                </div>
                <span style={{ fontSize: 12, color: '#D6D9DD', lineHeight: 1.25 }}>{rest.join(' ')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#0D1015', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: ACCENT + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trophy size={17} color={ACCENT} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: TEXT_SOFT }}>Ton record sur cette séance</div>
          {editingRecord ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ex : 4'18/km" autoFocus
                style={{ flex: 1, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 8, padding: '6px 10px', color: TEXT, fontSize: 13, fontFamily: FONT, outline: 'none' }} />
              <button onClick={() => { setRecord(draft); setEditingRecord(false); }} style={{ background: ACCENT, border: 'none', borderRadius: 8, padding: '0 12px', cursor: 'pointer' }}>
                <Send size={13} color="#0A0C0E" />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 14.5, fontWeight: 800, color: TEXT, marginTop: 1 }}>{record || '—'}</div>
          )}
        </div>
        {!editingRecord && (
          <button onClick={() => setEditingRecord(true)} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            {record ? 'Modifier' : 'Ajouter'}
          </button>
        )}
      </div>

      <RecordsGrid category={session.category} records={allRecords} setRecord={setGlobalRecord} />

      <VideoPreviewCard session={session} />
    </div>
  );
}

function SessionDerouleTab({ session }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TimelineStep icon={Footprints} color={CAT_RECUP} title="Échauffement" minutes={Math.max(5, Math.round(session.duration * 0.2))} items={session.warmup} />
      <TimelineStep icon={Flame} color={CATEGORY_META[session.category].color} title="Corps de séance" minutes={Math.max(10, Math.round(session.duration * 0.65))} items={session.main} />
      {session.interval && (
        <div style={{ marginLeft: 46, marginBottom: 20, marginTop: -8 }}>
          <IntervalChart interval={session.interval} />
        </div>
      )}
      <TimelineStep icon={HeartPulse} color={CAT_RECUP} title="Retour au calme" minutes={Math.max(3, Math.round(session.duration * 0.15))} items={session.cooldown} />
    </div>
  );
}

function SessionAnalyseTab({ session, logs }) {
  const sessionLogs = logs.filter(l => l.sessionId === session.id);
  const cat = CATEGORY_META[session.category];
  if (sessionLogs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: TEXT_SOFT, fontSize: 13.5 }}>
        Pas encore de données pour cette séance.<br />Termine-la pour commencer à suivre ta progression.
      </div>
    );
  }
  const avg = (key) => Math.round((sessionLogs.reduce((s, l) => s + (l[key] || 0), 0) / sessionLogs.length) * 10) / 10;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sur tes {sessionLogs.length} dernière{sessionLogs.length > 1 ? 's' : ''} séance{sessionLogs.length > 1 ? 's' : ''}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#0D1015', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 10.5, color: TEXT_SOFT, textTransform: 'uppercase' }}>Énergie moyenne</div>
          <div style={{ marginTop: 8 }}><StarRating value={Math.round(avg('energy'))} color={cat.color} size={14} /></div>
        </div>
        <div style={{ background: '#0D1015', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 10.5, color: TEXT_SOFT, textTransform: 'uppercase' }}>Motivation moyenne</div>
          <div style={{ marginTop: 8 }}><StarRating value={Math.round(avg('motivation'))} color={cat.color} size={14} /></div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Historique</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessionLogs.slice(0, 5).map(l => (
          <div key={l.ts} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0D1015', borderRadius: 12, padding: '10px 14px' }}>
            <span style={{ fontSize: 12.5, color: TEXT_SOFT }}>{formatDateMedium(l.date).split(' ').slice(0, 2).join(' ')}</span>
            <span style={{ fontSize: 15 }}>{l.feeling}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionNotesTab({ session, note, setNote }) {
  const [draft, setDraft] = useState(note || '');
  const [savedFlash, setSavedFlash] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 11.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Tes notes personnelles</div>
      <textarea
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => { setNote(draft); setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500); }}
        placeholder="Sensations, ajustements, points à retenir pour la prochaine fois…"
        rows={8}
        style={{
          width: '100%', background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 14,
          padding: '14px 16px', color: TEXT, fontSize: 13.5, fontFamily: FONT, outline: 'none', resize: 'vertical',
        }}
      />
      <div style={{ fontSize: 11, color: savedFlash ? ACCENT : TEXT_FAINT, marginTop: 8, height: 14 }}>{savedFlash ? '✓ Enregistré' : ''}</div>
    </div>
  );
}

function CoachSignatureCard({ tip }) {
  if (!tip) return null;
  return (
    <div style={{
      position: 'relative', marginTop: 18, borderRadius: 20, padding: '18px 18px', overflow: 'hidden',
      background: `linear-gradient(135deg, #1A1F14 0%, #0D1015 60%)`, border: `1px solid ${ACCENT}33`,
    }}>
      <div style={{ position: 'absolute', right: -14, top: -14, opacity: 0.14 }}>
        <Shield size={110} color={ACCENT} strokeWidth={1} />
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: ACCENT + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={17} color={ACCENT} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conseil du Coach Spartan</div>
          <div style={{ fontSize: 13, color: '#D6D9DD', marginTop: 6, lineHeight: 1.5 }}>{tip}</div>
        </div>
      </div>
    </div>
  );
}

function SessionDetailPage({ session, today, onClose, onStart, records, setRecord, allRecords, setGlobalRecord, notes, setNote, logs }) {
  const [tab, setTab] = useState('apercu');
  const cat = CATEGORY_META[session.category];

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 60, overflowY: 'auto' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
        {/* Immersive hero */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="spartan-kenburns">
            <SessionCoverArt session={session} height={280} rounded={0} showLabel={false} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,6,7,0.15) 0%, rgba(5,6,7,0.15) 40%, rgba(5,6,7,0.92) 100%)' }} />

          <div style={{ position: 'absolute', top: 16, left: 20, right: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{ background: 'rgba(5,6,7,0.55)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={17} color="#fff" />
            </button>
            <button style={{ background: 'rgba(5,6,7,0.55)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: 12, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <MoreHorizontal size={17} color="#fff" />
            </button>
          </div>

          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 4, textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>{session.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: '#E4E6EA', display: 'flex', alignItems: 'center', gap: 5 }}><Timer size={13} /> {session.durationText || `${session.duration} min`}</span>
              <DifficultyBadge level={session.difficulty} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 0 20px' }}>
          <div className="spartan-fade-in">
            <WhySessionCard day={today} session={session} />
          </div>

          <div style={{ marginTop: 18 }}>
            <SessionDetailTabs active={tab} onChange={setTab} />
          </div>
          <div style={{ marginTop: 18 }} className="spartan-fade-in" key={tab}>
            {tab === 'apercu' && (
              <SessionApercuTab
                session={session} record={records[session.id]} setRecord={(v) => setRecord(session.id, v)}
                allRecords={allRecords} setGlobalRecord={setGlobalRecord}
              />
            )}
            {tab === 'deroule' && <SessionDerouleTab session={session} />}
            {tab === 'analyse' && <SessionAnalyseTab session={session} logs={logs} />}
            {tab === 'notes' && <SessionNotesTab session={session} note={notes[session.id]} setNote={(v) => setNote(session.id, v)} />}
          </div>

          <CoachSignatureCard tip={session.coachTip} />

          <button onClick={onStart} className="spartan-tap" style={{
            width: '100%', marginTop: 20, padding: '16px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
            background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 14.5, fontWeight: 800, color: '#0A0C0E', boxShadow: `0 10px 30px ${ACCENT}22`,
          }}>
            <Play size={17} /> Démarrer la séance
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveSessionScreen({ session, onFinish, onCancel }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const cat = CATEGORY_META[session.category];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div style={{ position: 'fixed', inset: 0, background: BG, zIndex: 65, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat.label} en cours</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TEXT, marginTop: 8 }}>{session.name}</div>
      <div style={{ fontSize: 56, fontWeight: 800, color: TEXT, marginTop: 30, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</div>
      <div style={{ fontSize: 13, color: TEXT_SOFT, marginTop: 6 }}>Chrono de séance</div>

      <button onClick={() => onFinish(seconds)} style={{
        width: '100%', maxWidth: 340, marginTop: 50, padding: '17px 0', borderRadius: 18, border: 'none', cursor: 'pointer',
        background: ACCENT, fontSize: 15, fontWeight: 800, color: '#0A0C0E',
      }}>
        Terminer la séance
      </button>
      <button onClick={onCancel} style={{ marginTop: 14, background: 'none', border: 'none', color: TEXT_FAINT, fontSize: 13, cursor: 'pointer' }}>
        Annuler
      </button>
    </div>
  );
}

const FEELING_OPTIONS = [
  { emoji: '😀', label: 'Très facile' },
  { emoji: '🙂', label: 'Facile' },
  { emoji: '😐', label: 'Correct' },
  { emoji: '😵', label: 'Difficile' },
  { emoji: '🥵', label: 'Très difficile' },
];

function EndOfSessionModal({ session, durationSec, onClose, onSubmit }) {
  const [feeling, setFeeling] = useState(null);
  const [energy, setEnergy] = useState(0);
  const [motivation, setMotivation] = useState(0);
  const [comment, setComment] = useState('');
  const cat = CATEGORY_META[session.category];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,3,4,0.8)', zIndex: 70, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto', background: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '10px 22px 30px 22px', border: `1px solid ${CARD_BORDER}`, borderBottom: 'none', maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#2A313B', margin: '6px auto 18px auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={22} color={ACCENT} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Séance terminée</div>
            <div style={{ fontSize: 12, color: TEXT_SOFT }}>{session.name} · {Math.round(durationSec / 60)} min</div>
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Comment t’es-tu senti ?</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {FEELING_OPTIONS.map(f => (
            <button key={f.label} onClick={() => setFeeling(f.emoji)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 2px',
              borderRadius: 14, cursor: 'pointer', background: feeling === f.emoji ? cat.color + '1F' : '#0D1015',
              border: `1px solid ${feeling === f.emoji ? cat.color : CARD_BORDER}`,
            }}>
              <span style={{ fontSize: 22 }}>{f.emoji}</span>
              <span style={{ fontSize: 8.5, color: TEXT_SOFT, textAlign: 'center' }}>{f.label}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Énergie</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setEnergy(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star size={26} color={n <= energy ? ACCENT : '#2A313B'} fill={n <= energy ? ACCENT : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivation</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setMotivation(n)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star size={26} color={n <= motivation ? ACCENT : '#2A313B'} fill={n <= motivation ? ACCENT : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18, fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Commentaires (optionnel)</div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Ton ressenti, tes points forts, tes difficultés…"
          style={{ width: '100%', background: '#0D1015', border: `1px solid ${CARD_BORDER}`, borderRadius: 14, padding: '12px 14px', color: TEXT, fontSize: 13, fontFamily: FONT, outline: 'none', resize: 'vertical' }} />

        <button
          disabled={!feeling || !energy || !motivation}
          onClick={() => onSubmit({ feeling, energy, motivation, comment })}
          style={{
            width: '100%', marginTop: 20, padding: '15px 0', borderRadius: 16, border: 'none',
            cursor: (!feeling || !energy || !motivation) ? 'default' : 'pointer',
            background: (!feeling || !energy || !motivation) ? '#1B2129' : ACCENT,
            color: (!feeling || !energy || !motivation) ? TEXT_FAINT : '#0A0C0E',
            fontSize: 14.5, fontWeight: 800,
          }}
        >
          Valider
        </button>
      </div>
    </div>
  );
}


// ---------- Séances: library screen ----------
function SessionsScreen({ completions, favorites, toggleFavorite, weeklyRecapDismissed, setWeeklyRecapDismissed, onOpenSession }) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('course');

  const todayIdx = Math.max(0, Math.min(getDayIndex(), DAYS.length - 1));
  const today = DAYS[todayIdx];
  const recommendation = useMemo(() => computeRecommendation(today), [today.date]);

  const isSunday = dateFromISO(todayISO()).getDay() === 0;
  const weekKey = 'week-' + today.semaine;
  const showRecap = isSunday && weeklyRecapDismissed !== weekKey;

  const recentLogDates = useMemo(() => {
    return DAYS.filter(d => d.date <= todayISO() && completions[d.date] && completions[d.date].fait)
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  }, [completions]);

  const recentSessions = recentLogDates.map(d => {
    const s = findSessionForDay(d, 'course') || findSessionForDay(d, 'muscu');
    return s ? { session: s, day: d } : null;
  }).filter(Boolean);

  const filtered = useMemo(() => {
    return SESSION_LIBRARY.filter(s => s.category === activeCat).filter(s => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.objectif || '').toLowerCase().includes(q);
    });
  }, [activeCat, query]);

  const catCounts = useMemo(() => {
    const counts = {};
    SESSION_LIBRARY.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 110px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 23, fontWeight: 800 }}>Bibliothèque</div>
          <div style={{ fontSize: 13.5, color: TEXT_SOFT, marginTop: 3 }}>Tous tes entraînements. À toi de choisir.</div>
        </div>
        <button style={{ width: 38, height: 38, borderRadius: 19, background: CARD, border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Bell size={16} color={TEXT_SOFT} />
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '12px 14px' }}>
          <Search size={16} color={TEXT_SOFT} />
          <input
            value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher une séance, un exercice…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT, fontSize: 13.5, fontFamily: FONT }}
          />
        </div>
        <button style={{ width: 46, height: 46, borderRadius: 16, background: CARD, border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <SlidersHorizontal size={16} color={TEXT_SOFT} />
        </button>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {Object.values(CATEGORY_META).map(cat => {
          const active = cat.id === activeCat;
          return (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} className="spartan-tap" style={{
              flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '12px 16px', borderRadius: 16, cursor: 'pointer',
              background: active ? cat.color + '1F' : CARD,
              border: `1px solid ${active ? cat.color : CARD_BORDER}`,
            }}>
              <cat.icon size={18} color={active ? cat.color : TEXT_SOFT} />
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? cat.color : TEXT_SOFT, whiteSpace: 'nowrap' }}>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Weekly recap (Sundays) */}
      {showRecap && (
        <div style={{ marginTop: 20 }}>
          <WeeklyRecapCard completions={completions} onDismiss={() => setWeeklyRecapDismissed(weekKey)} />
        </div>
      )}

      {/* Coach recommendation */}
      <div style={{ marginTop: 20 }}>
        <CoachRecommendCard session={recommendation.session} reason={recommendation.reason} onOpen={() => onOpenSession(recommendation.session)} />
      </div>

      {/* Recently used */}
      {recentSessions.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Dernières séances utilisées</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {recentSessions.map(({ session, day }) => {
              const cat = CATEGORY_META[session.category];
              return (
                <button key={day.date + session.id} onClick={() => onOpenSession(session)} style={{
                  flexShrink: 0, width: 130, textAlign: 'left', cursor: 'pointer', background: CARD,
                  border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '12px 12px',
                }}>
                  <cat.icon size={16} color={cat.color} />
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: TEXT, marginTop: 8, lineHeight: 1.25 }}>{session.name}</div>
                  <div style={{ fontSize: 10.5, color: TEXT_SOFT, marginTop: 4 }}>{formatDateMedium(day.date).split(' ').slice(0, 2).join(' ')}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Session list */}
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toutes les séances</span>
        <span style={{ fontSize: 11, color: TEXT_FAINT }}>{catCounts[activeCat] || 0} séances</span>
      </div>
      <div key={activeCat} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: TEXT_FAINT, textAlign: 'center', padding: '30px 0' }}>Aucune séance ne correspond à ta recherche.</div>
        )}
        {filtered.map((s, i) => (
          <div key={s.id} className="spartan-fade-in" style={{ animationDelay: `${Math.min(i, 6) * 35}ms` }}>
            <SessionCard session={s} favorite={!!favorites[s.id]} onToggleFavorite={toggleFavorite} onClick={() => onOpenSession(s)} />
          </div>
        ))}
      </div>
    </div>
  );
}


export default function App() {
  // Runs once per load: stamps a fresh install with the current schema version, or upgrades
  // existing local data through MIGRATIONS if it was written by an older app version.
  useEffect(() => { ensureDataMigrated(); }, []);

  const { completions, toggleDay, loaded } = useCompletions();
  const [tab, setTab] = useState('today');
  const [openDetail, setOpenDetail] = useState(null); // 'routine' | 'muscu' | 'course' | null

  // Séances tab state
  const [favorites, setFavorites, favLoaded] = useKeyValueStore('session-favorites', {});
  const [records, setRecords] = useKeyValueStore('session-records', {});
  const [notes, setNotes] = useKeyValueStore('session-notes', {});
  const [sessionLogs, setSessionLogs] = useKeyValueStore('session-logs', []);
  const [weeklyRecapDismissed, setWeeklyRecapDismissed] = useKeyValueStore('weekly-recap-dismissed', '');
  const [selectedSession, setSelectedSession] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [finishedSession, setFinishedSession] = useState(null); // { session, durationSec }

  // Profil tab state
  const [weeklyPlan, setWeeklyPlan] = useKeyValueStore('profile-weekly-plan', {});
  const [trainingPrefs, setTrainingPrefs] = useKeyValueStore('profile-prefs', {});
  const [notifPrefs, setNotifPrefs] = useKeyValueStore('profile-notifications', {});
  const [appearance, setAppearance] = useKeyValueStore('profile-appearance', {});
  const [profileInfo, setProfileInfo] = useKeyValueStore('profile-info', {});
  const [equipment, setEquipment] = useKeyValueStore('profile-equipment', []);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  }, [setFavorites]);
  const setRecordFor = useCallback((id, value) => {
    setRecords(prev => ({ ...prev, [id]: value }));
  }, [setRecords]);
  const setNoteFor = useCallback((id, value) => {
    setNotes(prev => ({ ...prev, [id]: value }));
  }, [setNotes]);
  const logSession = useCallback((entry) => {
    setSessionLogs(prev => [{ ...entry, ts: Date.now() }, ...prev]);
  }, [setSessionLogs]);

  const dayIndex = Math.max(0, Math.min(getDayIndex(), DAYS.length - 1));
  const day = DAYS[dayIndex];
  const dayCompletion = completions[day.date];
  const isDone = !!(dayCompletion && dayCompletion.fait);
  const stats = useMemo(() => computeStats(completions), [completions]);
  const level = useMemo(() => computeLevel(totalPointsEarned(completions)), [completions]);
  const est = useMemo(() => estimateSession(day), [day]);

  const hasMuscu = day.seanceMuscu && day.seanceMuscu !== '—';
  const muscuExercises = hasMuscu ? MUSCULATION[day.seanceMuscu] : null;
  const courseMatch = matchCourseType(day.course);

  const fatigue = FATIGUE_INFO[day.indicateur] || FATIGUE_INFO['🟢 Faible'];
  const chargeLabel = CHARGE_LABEL[day.indicateur] || CHARGE_LABEL['🟢 Faible'];

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, color: TEXT, paddingBottom: 90 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .spartan-tap { transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .spartan-tap:active { transform: scale(0.97); }
        .spartan-fade-in { animation: spartanFadeIn 0.35s ease both; }
        @keyframes spartanFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .spartan-kenburns { animation: spartanKenBurns 1.1s ease-out both; }
        @keyframes spartanKenBurns { from { transform: scale(1.09); filter: brightness(0.85); } to { transform: scale(1); filter: brightness(1); } }
        .spartan-shimmer { background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%); background-size: 200% 100%; animation: spartanShimmer 2.4s ease-in-out infinite; }
        @keyframes spartanShimmer { 0% { background-position: 160% 0; } 100% { background-position: -60% 0; } }
        @media (prefers-reduced-motion: reduce) {
          .spartan-tap, .spartan-fade-in, .spartan-kenburns, .spartan-shimmer { animation: none !important; transition: none !important; }
        }
      `}</style>

      {tab === 'today' && (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 20px 0 20px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: '#1B2129', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color={ACCENT} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.06em' }}>SPARTAN 365</span>
            </div>
            <button style={{ width: 36, height: 36, borderRadius: 18, background: CARD, border: `1px solid ${CARD_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={15} color={TEXT_SOFT} />
            </button>
          </div>

          {/* Greeting */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 23, fontWeight: 800 }}>Bonjour Marc 👋</div>
            <div style={{ fontSize: 13.5, color: TEXT_SOFT, marginTop: 3 }}>Aujourd’hui est un excellent jour pour devenir plus fort.</div>
          </div>

          {/* Top carousel */}
          <div style={{ marginTop: 18 }}>
            <TopCarousel day={day} completions={completions} level={level} />
          </div>

          {/* Programme du jour */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aujourd’hui</span>
            <span style={{ fontSize: 11, color: fatigue.color, background: fatigue.color + '1A', padding: '4px 10px', borderRadius: 10, fontWeight: 700 }}>{chargeLabel}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {day.course && (
              <ProgramCard
                icon={PersonStanding} iconBg={CAT_COURSE + '1F'} iconColor={CAT_COURSE}
                kicker="Course" title={day.course.replace(/^[^\s]+\s/, '')}
                minutes={est.items.find(i => i.type === 'course')?.min}
                tag=""
                onClick={() => setOpenDetail('course')}
              />
            )}
            {hasMuscu && (
              <ProgramCard
                icon={Dumbbell} iconBg={CAT_MUSCU + '1F'} iconColor={CAT_MUSCU}
                kicker="Musculation" title={day.seanceMuscu.replace(/^[^\s]+\s/, '')}
                minutes={est.items.find(i => i.type === 'muscu')?.min}
                tag=""
                onClick={() => setOpenDetail('muscu')}
              />
            )}
            <ProgramCard
              icon={Shield} iconBg={CAT_SPARTAN + '1F'} iconColor={CAT_SPARTAN}
              kicker="Routine Spartan" title={`${est.routineCount} exercices`}
              minutes={est.items.find(i => i.type === 'routine')?.min}
              tag=""
              onClick={() => setOpenDetail('routine')}
            />
          </div>

          {/* Forme du jour */}
          <div style={{ marginTop: 18, background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '18px 20px' }}>
            <div style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Forme du jour</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(${fatigue.color} ${fatigue.score * 3.6}deg, #1B2129 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: CARD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{fatigue.score}</span>
                  <span style={{ fontSize: 8.5, color: TEXT_SOFT }}>/100</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: fatigue.color }}>{fatigue.label}</div>
                <div style={{ fontSize: 12.5, color: TEXT_SOFT, marginTop: 3, lineHeight: 1.4 }}>{fatigue.desc}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}` }}>
              <div>
                <div style={{ fontSize: 10.5, color: TEXT_SOFT, display: 'flex', alignItems: 'center', gap: 4 }}><Moon size={11} /> Sommeil</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>7h45</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: TEXT_SOFT, display: 'flex', alignItems: 'center', gap: 4 }}><Battery size={11} /> Récup.</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>82%</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: TEXT_SOFT, display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={11} /> Charge</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3, color: fatigue.color }}>{chargeLabel.replace('Charge ', '')}</div>
              </div>
            </div>
          </div>

          {/* Aperçu des objectifs */}
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, color: TEXT_SOFT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aperçu de tes objectifs</span>
            <button onClick={() => setTab('progression')} style={{ background: 'none', border: 'none', color: TEXT_FAINT, fontSize: 11.5, cursor: 'pointer' }}>Voir tout</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {RACES.map(r => {
              const d = daysBetween(todayISO(), r.date);
              const pct = raceProgress(r);
              return (
                <div key={r.name} style={{ background: CARD, border: `1px solid ${CARD_BORDER}`, borderRadius: 16, padding: '12px 12px' }}>
                  <div style={{ fontSize: 11, color: TEXT_SOFT, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{RACE_SHORT[r.name] || r.name}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: ACCENT }}>{d >= 0 ? `J-${d}` : '—'}</div>
                  <div style={{ marginTop: 8 }}><MiniBar pct={pct} /></div>
                  <div style={{ fontSize: 10, color: TEXT_FAINT, marginTop: 4 }}>{pct}%</div>
                </div>
              );
            })}
          </div>

          {/* Main CTA */}
          <button onClick={() => toggleDay(day.date)} disabled={!loaded} style={{
            width: '100%', marginTop: 20, padding: '20px 0', borderRadius: 22, border: 'none',
            cursor: loaded ? 'pointer' : 'default',
            background: isDone ? '#1B2129' : ACCENT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: isDone ? ACCENT : '#0A0C0E', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDone ? <><CheckCircle2 size={19} /> Journée terminée</> : <><Rocket size={18} /> Démarrer ma journée</>}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: isDone ? TEXT_SOFT : '#2B3418' }}>
              {isDone ? 'Bravo, Spartan.' : 'On y va, Spartan !'}
            </span>
          </button>
        </div>
      )}

      {tab === 'progression' && <ProgressionScreen completions={completions} level={level} records={records} setRecordFor={setRecordFor} />}
      {tab === 'planning' && <PlanningScreen completions={completions} toggleDay={toggleDay} level={level} setTab={setTab} />}
      {tab === 'bibliotheque' && (
        <SessionsScreen
          completions={completions}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          weeklyRecapDismissed={weeklyRecapDismissed}
          setWeeklyRecapDismissed={setWeeklyRecapDismissed}
          onOpenSession={setSelectedSession}
        />
      )}
      {tab === 'profil' && (
        <ProfileScreen
          completions={completions} level={level} records={records} setRecordFor={setRecordFor}
          weeklyPlan={weeklyPlan} setWeeklyPlan={setWeeklyPlan}
          trainingPrefs={trainingPrefs} setTrainingPrefs={setTrainingPrefs}
          notifPrefs={notifPrefs} setNotifPrefs={setNotifPrefs}
          appearance={appearance} setAppearance={setAppearance}
          profileInfo={profileInfo} setProfileInfo={setProfileInfo}
          equipment={equipment} setEquipment={setEquipment}
        />
      )}

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(5,6,7,0.92)',
        backdropFilter: 'blur(12px)', borderTop: `1px solid ${CARD_BORDER}`,
        display: 'flex', justifyContent: 'space-around', padding: '10px 6px 18px 6px', zIndex: 40,
      }}>
        {[
          ['today', 'Aujourd\u2019hui', CalendarDays],
          ['planning', 'Planning', CalendarDays],
          ['bibliotheque', 'Séances', BookOpen],
          ['progression', 'Progression', TrendingUp],
          ['profil', 'Profil', User],
        ].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 4, padding: '4px 8px', color: tab === k ? ACCENT : TEXT_FAINT,
          }}>
            <Icon size={20} color={tab === k ? ACCENT : TEXT_FAINT} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Detail modals */}
      {openDetail === 'routine' && (
        <DetailModal onClose={() => setOpenDetail(null)} kicker="Routine Spartan" title={`${est.routineCount} exercices — ${est.items.find(i => i.type==='routine')?.min} min`}>
          <RoutineDetail day={day} />
        </DetailModal>
      )}
      {openDetail === 'muscu' && hasMuscu && (
        <DetailModal onClose={() => setOpenDetail(null)} kicker="Musculation" title={day.seanceMuscu.replace(/^[^\s]+\s/, '')}>
          <MuscuDetail exercises={muscuExercises} />
        </DetailModal>
      )}
      {openDetail === 'course' && day.course && (
        <DetailModal onClose={() => setOpenDetail(null)} kicker="Course à pied" title={day.course.replace(/^[^\s]+\s/, '')}>
          <CourseDetail match={courseMatch} />
        </DetailModal>
      )}

      {/* Séances: session detail / active / end-of-session */}
      {selectedSession && !activeSession && (
        <SessionDetailPage
          session={selectedSession}
          today={day}
          onClose={() => setSelectedSession(null)}
          onStart={() => setActiveSession(selectedSession)}
          records={records}
          setRecord={setRecordFor}
          allRecords={records}
          setGlobalRecord={setRecordFor}
          notes={notes}
          setNote={setNoteFor}
          logs={sessionLogs}
        />
      )}
      {activeSession && !finishedSession && (
        <ActiveSessionScreen
          session={activeSession}
          onCancel={() => setActiveSession(null)}
          onFinish={(seconds) => setFinishedSession({ session: activeSession, durationSec: seconds })}
        />
      )}
      {finishedSession && (
        <EndOfSessionModal
          session={finishedSession.session}
          durationSec={finishedSession.durationSec}
          onClose={() => { setFinishedSession(null); setActiveSession(null); setSelectedSession(null); }}
          onSubmit={(entry) => {
            logSession({ sessionId: finishedSession.session.id, date: todayISO(), durationSec: finishedSession.durationSec, ...entry });
            setFinishedSession(null);
            setActiveSession(null);
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}
