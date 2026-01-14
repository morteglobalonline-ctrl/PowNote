import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  pets: 'pets',
  currentPetId: 'currentPetId',

  reminders: 'reminders',
  checklists: 'checklists',
  vetVisits: 'vetVisits',

  // legacy keys (older builds)
  legacyCurrentPet: 'currentPet',
  legacyChatSessionId: 'chatSessionId',
} as const;

type ID = string;

export type Pet = {
  id: ID;
  name: string;
  birth_date: string;
  pet_type: string;
  custom_pet_type?: string | null;
  breed?: string | null;
  weight?: number | null;
  gender?: string | null;
  photo?: string | null;
  created_at: number;
  updated_at: number;
};

export type Reminder = {
  id: ID;
  pet_id: ID;
  title: string;
  time: string; // "HH:MM"
  is_active: boolean;
  sound_id?: string | null;
  notification_id?: string | null;
  created_at: number;
  updated_at: number;
};

export type ChecklistItem = { id: ID; text: string; completed: boolean };

export type Checklist = {
  id: ID;
  pet_id: ID;
  title: string;
  items: ChecklistItem[];
  created_at: number;
  updated_at: number;
};

export type VetVisit = {
  id: ID;
  pet_id: ID;
  title: string;
  date: string;
  notes?: string | null;
  created_at: number;
  updated_at: number;
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * One-time migration:
 * If legacy `currentPet` exists, ensure it is stored inside `pets` and set `currentPetId`.
 */
export async function migrateIfNeeded(): Promise<void> {
  const [pets, legacyPetRaw, currentPetId] = await Promise.all([
    readJson<Pet[]>(KEYS.pets, []),
    AsyncStorage.getItem(KEYS.legacyCurrentPet),
    AsyncStorage.getItem(KEYS.currentPetId),
  ]);

  if (currentPetId) return;
  if (!legacyPetRaw) return;

  let legacyPet: any = null;
  try {
    legacyPet = JSON.parse(legacyPetRaw);
  } catch {
    legacyPet = null;
  }
  if (!legacyPet?.id) return;

  const now = Date.now();
  const normalized: Pet = {
    id: String(legacyPet.id),
    name: legacyPet.name ?? 'My Pet',
    birth_date: legacyPet.birth_date ?? '',
    pet_type: legacyPet.pet_type ?? 'dog',
    custom_pet_type: legacyPet.custom_pet_type ?? null,
    breed: legacyPet.breed ?? null,
    weight: legacyPet.weight ?? null,
    gender: legacyPet.gender ?? null,
    photo: legacyPet.photo ?? null,
    created_at: legacyPet.created_at ?? now,
    updated_at: now,
  };

  const exists = pets.some((p) => p.id === normalized.id);
  const newPets = exists
    ? pets.map((p) => (p.id === normalized.id ? normalized : p))
    : [normalized, ...pets];

  await Promise.all([
    writeJson(KEYS.pets, newPets),
    AsyncStorage.setItem(KEYS.currentPetId, normalized.id),
  ]);
}

export async function getPets(): Promise<Pet[]> {
  return readJson<Pet[]>(KEYS.pets, []);
}

export async function addPet(
  input: Omit<Pet, 'id' | 'created_at' | 'updated_at'>
): Promise<Pet> {
  const pets = await getPets();
  const now = Date.now();
  const pet: Pet = {
    ...input,
    id: makeId('pet'),
    created_at: now,
    updated_at: now,
  };
  const next = [pet, ...pets];
  await writeJson(KEYS.pets, next);
  await AsyncStorage.setItem(KEYS.currentPetId, pet.id);
  return pet;
}

export async function updatePet(petId: ID, patch: Partial<Pet>): Promise<Pet | null> {
  const pets = await getPets();
  const idx = pets.findIndex((p) => p.id === petId);
  if (idx < 0) return null;

  const updated: Pet = { ...pets[idx], ...patch, updated_at: Date.now() };
  const next = [...pets];
  next[idx] = updated;
  await writeJson(KEYS.pets, next);
  return updated;
}

export async function deletePet(petId: ID): Promise<void> {
  const pets = await getPets();
  const next = pets.filter((p) => p.id !== petId);
  await writeJson(KEYS.pets, next);

  const currentId = await AsyncStorage.getItem(KEYS.currentPetId);
  if (currentId === petId) {
    await AsyncStorage.removeItem(KEYS.currentPetId);
  }

  // Cascade delete pet-scoped data
  const [reminders, checklists, vetVisits] = await Promise.all([
    getReminders(),
    getChecklists(),
    getVetVisits(),
  ]);

  await Promise.all([
    saveReminders(reminders.filter((r) => r.pet_id !== petId)),
    saveChecklists(checklists.filter((c) => c.pet_id !== petId)),
    saveVetVisits(vetVisits.filter((v) => v.pet_id !== petId)),
  ]);
}

export async function getCurrentPet(): Promise<Pet | null> {
  const [pets, id] = await Promise.all([
    getPets(),
    AsyncStorage.getItem(KEYS.currentPetId),
  ]);
  if (!id) return null;
  return pets.find((p) => p.id === id) ?? null;
}

export async function setCurrentPetId(petId: ID): Promise<void> {
  await AsyncStorage.setItem(KEYS.currentPetId, petId);
}

// ---- Reminders ----
export async function getReminders(): Promise<Reminder[]> {
  return readJson<Reminder[]>(KEYS.reminders, []);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await writeJson(KEYS.reminders, reminders);
}

export async function addReminder(
  input: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>
): Promise<Reminder> {
  const list = await getReminders();
  const now = Date.now();
  const r: Reminder = { ...input, id: makeId('rem'), created_at: now, updated_at: now };
  await saveReminders([r, ...list]);
  return r;
}

export async function updateReminder(
  reminderId: ID,
  patch: Partial<Reminder>
): Promise<Reminder | null> {
  const list = await getReminders();
  const idx = list.findIndex((r) => r.id === reminderId);
  if (idx < 0) return null;

  const next = [...list];
  next[idx] = { ...next[idx], ...patch, updated_at: Date.now() };
  await saveReminders(next);
  return next[idx];
}

export async function deleteReminder(reminderId: ID): Promise<void> {
  const list = await getReminders();
  await saveReminders(list.filter((r) => r.id !== reminderId));
}

// ---- Checklists ----
export async function getChecklists(): Promise<Checklist[]> {
  return readJson<Checklist[]>(KEYS.checklists, []);
}

export async function saveChecklists(checklists: Checklist[]): Promise<void> {
  await writeJson(KEYS.checklists, checklists);
}

// ---- Vet visits ----
export async function getVetVisits(): Promise<VetVisit[]> {
  return readJson<VetVisit[]>(KEYS.vetVisits, []);
}

export async function saveVetVisits(vetVisits: VetVisit[]): Promise<void> {
  await writeJson(KEYS.vetVisits, vetVisits);
}

// Optional cleanup for privacy (AI legacy)
export async function clearLegacyChatSession(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.legacyChatSessionId);
}
