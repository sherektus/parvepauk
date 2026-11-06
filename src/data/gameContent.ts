export interface PlayerColorOption {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  flag: string;
  text: string;
}

export interface WheelOutcome {
  id: 'double_shot' | 'shield' | 'wind_reverse' | 'counter_sip' | 'bad_luck' | 'escape';
  title: string;
  shortDesc: string;
  color: string;
}

export type BrainrotId =
  | 'tralalero'
  | 'bombardiro'
  | 'tungtung'
  | 'lirili'
  | 'patapim'
  | 'cappuccino';

export interface BrainrotCharacter {
  id: BrainrotId;
  name: string;
  tagline: string;
  chaosTitle: string;
  chaosText: string;
  chaosEffect: 'bomb_crew' | 'tsunami_wind' | 'steal_shield' | 'drink_tax' | 'swap_luck' | 'ninja_slice';
  extraSips: number;
  target: 'shooter' | 'opponent' | 'both';
  accentColor: string;
}

export const BRAINROT_CHARACTERS: BrainrotCharacter[] = [
  {
    id: 'tralalero',
    name: 'Tralalero Tralala',
    tagline: 'Siniste Nike tossudega kolmejalgne hai!',
    chaosTitle: 'TRALALERO TRALALA RÜNDAB!',
    chaosText: 'Hai jooksis Nike tossudes üle vee, keeras tormituule põhja ja käsib mõlemal mängijal kohe 2 lonksu võtta!',
    chaosEffect: 'tsunami_wind',
    extraSips: 2,
    target: 'both',
    accentColor: '#38bdf8',
  },
  {
    id: 'bombardiro',
    name: 'Bombardiro Crocodilo',
    tagline: 'Lendav krokodill-pommitaja!',
    chaosTitle: 'BOMBARDIRO CROCODILO POMMITAB!',
    chaosText: 'Krokodill-lennuk viskas suvalise pommi parvele! Üks madrus lendab õhku ja laskja joob 3 trahvilonksu!',
    chaosEffect: 'bomb_crew',
    extraSips: 3,
    target: 'shooter',
    accentColor: '#4ade80',
  },
  {
    id: 'tungtung',
    name: 'Tung Tung Tung Sahur',
    tagline: 'Pesapallikurikaga puust öine koll!',
    chaosTitle: 'TUNG TUNG TUNG SAHUR!',
    chaosText: 'Puust elukas tagus kurikaga vastu parve, lõhkus kõik kilbid ja nõuab vastaselt 3 lonksu!',
    chaosEffect: 'steal_shield',
    extraSips: 3,
    target: 'opponent',
    accentColor: '#f59e0b',
  },
  {
    id: 'lirili',
    name: 'Lirili Larila',
    tagline: 'Sandaalidega kaktus-elevant kõrbest!',
    chaosTitle: 'LIRILI LARILA AJAB SEGI!',
    chaosText: 'Kaktus-elevant trampis sandaalidega lained sassi ja sunnib mõlemat kaptenit võtma 2 suurt lonksu!',
    chaosEffect: 'drink_tax',
    extraSips: 2,
    target: 'both',
    accentColor: '#10b981',
  },
  {
    id: 'patapim',
    name: 'Brr Brr Patapim',
    tagline: 'Hiiglaslike jalgadega metsa-ninaahv!',
    chaosTitle: 'BRR BRR PATAPIM HÜPPAS PARVELE!',
    chaosText: 'Patapim raputas parve nii kõvasti, et madrused hüppasid õhku ja laskja peab võtma 2 lisalonksu!',
    chaosEffect: 'swap_luck',
    extraSips: 2,
    target: 'shooter',
    accentColor: '#a855f7',
  },
  {
    id: 'cappuccino',
    name: 'Cappuccino Assassino',
    tagline: 'Kahe katanaga vahune ninja-kohvitops!',
    chaosTitle: 'CAPPUCCINO ASSASSINO LÕIKAB!',
    chaosText: 'Ninja-kohvitops lükkas ühe vastase madruse vette ja käsib vastasel võtta 3 lonksu!',
    chaosEffect: 'ninja_slice',
    extraSips: 3,
    target: 'opponent',
    accentColor: '#f43f5e',
  },
];

export const YO_MAMA_JOKES: string[] = [
  'Su ema on nii paks, et kui ta parvele astub, läheb meri teisele poole maakera!',
  'Su ema on nii kehv sihtija, et ta laseks isegi vee sees merest mööda!',
  'Su ema on nii vana, et tema esimesel parvel sõitis veel Noa!',
  'Su ema on nii aeglane, et isegi tuulevaikuses sõidab parv temast mööda!',
  'Su ema on nii lühinägelik, et ta pidas kahurikuuli mustikaks!',
  'Su ema on nii paks, et tema päästevestiks on vaja kolme kuumaõhupalli!',
  'Su ema teeb nii jubedat grokki, et isegi Tralalero Tralala jooksis kuivale maale!',
  'Su ema on nii valju häälega, et kahuripauku pole tema kõrval kuuldagi!',
  'Su ema on nii kohmakas, et ta kukkus parvelt vette juba enne mängu algust!',
  'Su ema on nii suur, et Bombardiro Crocodilo pidas teda terveks saareks!',
];

export const PLAYER_COLORS: PlayerColorOption[] = [
  {
    id: 'crimson',
    name: 'Kariibi Punane',
    primary: '#ef4444',
    secondary: '#991b1b',
    flag: '#f87171',
    text: '#fecaca',
  },
  {
    id: 'azure',
    name: 'Tormisinine',
    primary: '#3b82f6',
    secondary: '#1e40af',
    flag: '#60a5fa',
    text: '#bfdbfe',
  },
  {
    id: 'emerald',
    name: 'Merevetika Roheline',
    primary: '#10b981',
    secondary: '#065f46',
    flag: '#34d399',
    text: '#a7f399',
  },
  {
    id: 'amber',
    name: 'Kuldne Dubloon',
    primary: '#f59e0b',
    secondary: '#92400e',
    flag: '#fbbf24',
    text: '#fde68a',
  },
  {
    id: 'violet',
    name: 'Krakeni Lilla',
    primary: '#8b5cf6',
    secondary: '#5b21b6',
    flag: '#a78bfa',
    text: '#ddd6fe',
  },
  {
    id: 'pink',
    name: 'Flamingo Roosa',
    primary: '#ec4899',
    secondary: '#9d174d',
    flag: '#f472b6',
    text: '#fbcfe8',
  },
];

export const WHEEL_OUTCOMES: WheelOutcome[] = [
  {
    id: 'double_shot',
    title: 'Topeltlask',
    shortDesc: 'Laskja saab kohe teha ühe lisalasu!',
    color: '#f59e0b',
  },
  {
    id: 'shield',
    title: 'Kilp',
    shortDesc: 'Sinu parv blokeerib järgmise tabamuse!',
    color: '#3b82f6',
  },
  {
    id: 'wind_reverse',
    title: 'Tuulepööre',
    shortDesc: 'Järgmise lasu tuul pöördub ja sihtimine on tagurpidi (inverted)!',
    color: '#06b6d4',
  },
  {
    id: 'counter_sip',
    title: 'Vastulöök',
    shortDesc: 'Vastulöök! Ründaja (laskja) võtab ise 1 lisalonksu!',
    color: '#ef4444',
  },
  {
    id: 'bad_luck',
    title: 'Halb õnn',
    shortDesc: 'Laskja võtab ühe väikese lonksu ja jätab järgmise korra vahele!',
    color: '#8b5cf6',
  },
  {
    id: 'escape',
    title: 'Pääsemine',
    shortDesc: 'Midagi ei juhtu – meri püsib rahulik.',
    color: '#10b981',
  },
];

export const CREW_NAMES = [
  'Pootsman Peeter',
  'Kokk Kalle',
  'Tüürimees Tõnu',
  'Jung Juss',
  'Kahurväelane Kati',
  'Vaatleja Vello',
];

export const CAPTAIN_HIT_REACTIONS = [
  'Ai kurja! Otse pihta!',
  'Mu parukas lendas peaaegu vette!',
  'Kesse sihib kaptenit?!',
  'Auht! See võttis vuntsi värisema!',
];

export const GAME_RULES = [
  {
    title: 'Eesmärk ja võitmine',
    text: 'Kaks mängijat lasevad kordamööda kahurist. Võidad, kui vastase kapten kaotab kõik 5 elu või kõik 6 vastase meeskonnaliiget kukuvad parvelt vette.',
  },
  {
    title: 'Italian Brainrot kaos',
    text: 'Vali oma kapteniks mõni Italian Brainrot legend või tee pilt arvuti veebikaameraga! Brainrot-tegelased võivad keset kuuli lendu paadi eest ära puhuda või lisalonkse nõuda.',
  },
  {
    title: 'Muutuvad panused ja ULTRA ALL IN',
    text: 'Lonksupanused muutuvad igal käigul ja lonksu vahele jätta ei saa! Suurema panuse (2+ lonksu või ULTRA ALL IN) valimisel liiguvad paadid kaugemale ja sihtimine muutub raskemaks.',
  },
  {
    title: 'Riskiratas ja „Su ema“ naljad',
    text: 'Pihtasaamisel joob panuse vastane, möödalasul laskja ise. Pärast põhilasku keerleb riskiratas ning kaptenid loobivad kordamööda „Su ema“ nalju!',
  },
];
