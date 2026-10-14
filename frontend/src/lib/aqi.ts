export type AQICategory = 
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export type IndianCPCBCategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export type RiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Severe Risk';
export type TrendDirection = 'Increasing' | 'Decreasing' | 'Stable';

export interface CategoryDefinition {
  category: AQICategory;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  healthStatement: string;
  cautionaryStatement: string;
}

export const US_EPA_CATEGORIES: CategoryDefinition[] = [
  {
    category: 'Good',
    min: 0,
    max: 50,
    color: '#10B981', // emerald-500
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-800',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    description: 'Air quality is satisfactory and poses minimal or no health risk.',
    healthStatement: 'Clean air conditions. Outdoor air quality is safe for all individuals.',
    cautionaryStatement: 'Ideal for all physical and outdoor activities.'
  },
  {
    category: 'Moderate',
    min: 51,
    max: 100,
    color: '#F59E0B', // amber-500
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    description: 'Air quality is acceptable; slight concern for very sensitive individuals.',
    healthStatement: 'Generally acceptable air quality, though unusually sensitive individuals may notice symptoms.',
    cautionaryStatement: 'Unusually sensitive individuals should consider limiting prolonged outdoor exertion.'
  },
  {
    category: 'Unhealthy for Sensitive Groups',
    min: 101,
    max: 150,
    color: '#F97316', // orange-500
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    description: 'Sensitive groups may experience health effects; general public is less affected.',
    healthStatement: 'Increased likelihood of respiratory symptoms in children, the elderly, and individuals with asthma.',
    cautionaryStatement: 'Children, older adults, and individuals with heart/lung disease should reduce heavy exertion.'
  },
  {
    category: 'Unhealthy',
    min: 151,
    max: 200,
    color: '#EF4444', // red-500
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    description: 'Everyone may begin to experience health effects; sensitive groups more serious effects.',
    healthStatement: 'Noticeable respiratory irritation, aggravated heart and lung symptoms across general population.',
    cautionaryStatement: 'Avoid prolonged outdoor exertion. Wear N95 masks in high traffic areas.'
  },
  {
    category: 'Very Unhealthy',
    min: 201,
    max: 300,
    color: '#8B5CF6', // violet-500
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-800',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-800',
    description: 'Health alert: significant health risk for everyone in the area.',
    healthStatement: 'Triggers emergency health alerts. Significant respiratory and cardiovascular stress.',
    cautionaryStatement: 'Remain indoors, keep windows closed, run HEPA air purifiers, and eliminate outdoor sports.'
  },
  {
    category: 'Hazardous',
    min: 301,
    max: 500,
    color: '#881337', // rose-900 / maroon
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-950',
    badgeBg: 'bg-rose-200',
    badgeText: 'text-rose-950',
    description: 'Emergency health warning: serious adverse symptoms across whole population.',
    healthStatement: 'Severe toxic exposure risk. Acute physiological degradation possible for all persons.',
    cautionaryStatement: 'Stay indoors completely, seal doors/windows, suspend non-essential travel.'
  }
];

export const CPCB_CATEGORIES = [
  { category: 'Good', min: 0, max: 50, color: '#10B981', desc: 'Minimal impact' },
  { category: 'Satisfactory', min: 51, max: 100, color: '#34D399', desc: 'Minor breathing discomfort to sensitive people' },
  { category: 'Moderate', min: 101, max: 200, color: '#F59E0B', desc: 'Breathing discomfort to people with asthma and heart disease' },
  { category: 'Poor', min: 201, max: 300, color: '#F97316', desc: 'Breathing discomfort to most people on prolonged exposure' },
  { category: 'Very Poor', min: 301, max: 400, color: '#EF4444', desc: 'Respiratory illness to the people on prolonged exposure' },
  { category: 'Severe', min: 401, max: 500, color: '#881337', desc: 'Affects healthy people and seriously impacts those with existing diseases' },
];

export function getCategoryDefinition(aqi: number): CategoryDefinition {
  const rounded = Math.max(0, Math.round(aqi));
  const found = US_EPA_CATEGORIES.find(cat => rounded >= cat.min && rounded <= cat.max);
  return found || US_EPA_CATEGORIES[US_EPA_CATEGORIES.length - 1];
}

export function getRiskAssessment(aqi: number): {
  level: RiskLevel;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  title: string;
  summary: string;
  advice: string[];
} {
  const val = Math.max(0, Math.round(aqi));
  if (val <= 50) {
    return {
      level: 'Low Risk',
      color: '#10B981',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      title: 'Optimal Ambient Conditions',
      summary: 'Air quality levels pose no significant health threats to the general populace.',
      advice: [
        'Safe for all outdoor recreation, sports, and athletic training.',
        'Ventilate indoor spaces with fresh outdoor air.',
        'No personal protective equipment required.'
      ]
    };
  } else if (val <= 100) {
    return {
      level: 'Moderate Risk',
      color: '#F59E0B',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      title: 'Acceptable Air Quality — Minor Sensitivity Alert',
      summary: 'Particulate matter concentrations are elevated but acceptable for most individuals.',
      advice: [
        'Unusually sensitive individuals should monitor outdoor exertion duration.',
        'Keep windows closed during early morning rush hour hours.',
        'General public may continue normal outdoor routines.'
      ]
    };
  } else if (val <= 200) {
    return {
      level: 'High Risk',
      color: '#EF4444',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      title: 'Significant Health Hazard — Widespread Exposure Warning',
      summary: 'Elevated fine particulates (PM2.5/PM10) pose imminent respiratory irritation.',
      advice: [
        'Vulnerable groups (asthmatics, seniors, toddlers) must avoid outdoor exposure.',
        'Wear certified N95 or KN95 respirators if traveling through congested corridors.',
        'Run indoor HEPA filtration units continuously on moderate fan speeds.',
        'Avoid strenuous outdoor workouts and heavy cardio exercise.'
      ]
    };
  } else {
    return {
      level: 'Severe Risk',
      color: '#881337',
      bgColor: 'bg-rose-100',
      borderColor: 'border-rose-300',
      textColor: 'text-rose-950',
      title: 'Emergency Pollution Episode — Severe Public Health Advisory',
      summary: 'Toxic particulate accumulation requires protective containment measures.',
      advice: [
        'Remain entirely indoors; seal windows, vents, and draft gaps.',
        'Run commercial-grade particulate air filtration at maximum capacity.',
        'Suspension of all outdoor activities, school recess, and outdoor events.',
        'Seek medical evaluation immediately if experiencing tightness of chest or wheezing.'
      ]
    };
  }
}

export function determineTrendDirection(currentAqi: number, futureAqi: number, threshold: number = 3): {
  direction: TrendDirection;
  delta: number;
  percentageChange: number;
  explanation: string;
} {
  const delta = futureAqi - currentAqi;
  const percentageChange = currentAqi > 0 ? (delta / currentAqi) * 100 : 0;
  
  if (Math.abs(delta) < threshold) {
    return {
      direction: 'Stable',
      delta,
      percentageChange,
      explanation: `Projected variance (${delta > 0 ? '+' : ''}${delta.toFixed(1)} AQI) is within the stability threshold (±${threshold} AQI). Trend is classified as Stable.`
    };
  } else if (delta > 0) {
    return {
      direction: 'Increasing',
      delta,
      percentageChange,
      explanation: `Forecast values project an increase of +${delta.toFixed(1)} AQI (+${percentageChange.toFixed(1)}%) across the horizon. The system classifies this trajectory as Increasing.`
    };
  } else {
    return {
      direction: 'Decreasing',
      delta,
      percentageChange,
      explanation: `Forecast values project a decrease of ${delta.toFixed(1)} AQI (${percentageChange.toFixed(1)}%) across the horizon. The system classifies this trajectory as Decreasing.`
    };
  }
}
