export interface DogFormData {
  name: string
  breed: string
  birth_date: string
  gender: string
  weight: string
  color: string
  neutered: string
  photo_url: string
}

export interface DogHealthData {
  mixed_vaccine_date: string
  mixed_vaccine_cert_url: string
  rabies_vaccine_date: string
  rabies_vaccine_cert_url: string
  flea_tick_date: string
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
