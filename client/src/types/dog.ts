/**
 * Minimal dog representation used in LIFF (owner-facing) components.
 */
export interface LiffDog {
  id: number
  name: string
  photo_url: string
}

export interface DogFormData {
  name: string
  name_kana: string
  breed: string
  birth_date: string
  gender: string
  weight: string
  color: string
  neutered: string
  photo_url: string
  dog_tag_number: string
  microchip_number: string
}

export interface DogHealthData {
  mixed_vaccine_date: string
  mixed_vaccine_cert_url: string
  mixed_vaccine_cert_access_url?: string
  mixed_vaccine_cert_private?: boolean
  rabies_vaccine_date: string
  rabies_vaccine_cert_url: string
  rabies_vaccine_cert_access_url?: string
  rabies_vaccine_cert_private?: boolean
  flea_tick_date: string
  flea_tick_prevention: boolean | null
  heartworm_prevention: boolean | null
  heartworm_prevention_date: string
  easily_upset_stomach: boolean
  easily_hurts_legs: boolean
  allergies: string
  medical_history: string
}

export interface DogPersonalityData {
  personality_description: string
  dog_compatibility: string
  human_reaction: string
  likes: string
  dislikes: string
  toilet_status: string
  crate_training: string
}

export type RestEnvironment = 'circle' | 'bed_only' | 'crate' | 'none'
export type ToiletEnvironment = 'sheet_only' | 'tray_with_mesh' | 'tray_no_mesh' | 'outside'
export type ToiletTraining = 'voluntary' | 'on_command' | 'many_failures'
export type PraiseWord = 'iiko' | 'good' | 'other'
export type ToiletSignal = 'wantsu' | 'toilet' | 'other'
export type TreatExperience = 'kong_paste' | 'churu' | 'k9_natural' | 'cheese' | 'other' | 'none'

export interface DogLifestyleData {
  praise_words: PraiseWord[]
  praise_words_other: string
  toilet_signal: ToiletSignal[]
  toilet_signal_other: string
  rest_environments: RestEnvironment[]
  toilet_environment: ToiletEnvironment | ''
  toilet_training: ToiletTraining[]
  urination_count_per_day: string
  defecation_count_per_day: string
  toilet_timing_notes: string
  has_lunch: boolean
  lunch_time: string
  treat_experience: TreatExperience[]
  treat_other_notes: string
}

export const DEFAULT_DOG_LIFESTYLE: DogLifestyleData = {
  praise_words: [],
  praise_words_other: '',
  toilet_signal: [],
  toilet_signal_other: '',
  rest_environments: [],
  toilet_environment: '',
  toilet_training: [],
  urination_count_per_day: '',
  defecation_count_per_day: '',
  toilet_timing_notes: '',
  has_lunch: false,
  lunch_time: '',
  treat_experience: [],
  treat_other_notes: '',
}
