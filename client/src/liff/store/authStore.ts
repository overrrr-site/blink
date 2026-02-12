import { create } from 'zustand';
import type { RecordType } from '../../types/record';

const SELECTED_BUSINESS_TYPE_KEY = 'liff_selected_business_type';
const DEFAULT_BUSINESS_TYPE: RecordType = 'daycare';
const VALID_BUSINESS_TYPES: RecordType[] = ['daycare', 'grooming', 'hotel'];

function normalizeBusinessTypes(value: unknown, fallback?: RecordType): RecordType[] {
  if (Array.isArray(value)) {
    const unique = Array.from(
      new Set(value.filter((item): item is RecordType => VALID_BUSINESS_TYPES.includes(item as RecordType)))
    );
    if (unique.length > 0) return unique;
  }
  if (fallback && VALID_BUSINESS_TYPES.includes(fallback)) return [fallback];
  return [DEFAULT_BUSINESS_TYPE];
}

function resolveSelectedBusinessType(
  candidate: unknown,
  availableBusinessTypes: RecordType[]
): RecordType {
  if (typeof candidate === 'string' && availableBusinessTypes.includes(candidate as RecordType)) {
    return candidate as RecordType;
  }
  return availableBusinessTypes[0] || DEFAULT_BUSINESS_TYPE;
}

interface Owner {
  id: number;
  name: string;
  storeId: number;
  storeName: string;
  storeAddress: string;
  lineUserId: string;
  primaryBusinessType?: RecordType;
  availableBusinessTypes?: RecordType[];
}

interface AuthState {
  token: string | null;
  owner: Owner | null;
  selectedBusinessType: RecordType;
  isAuthenticated: boolean;
  setAuth: (token: string, owner: Owner) => void;
  setSelectedBusinessType: (businessType: RecordType) => void;
  clearAuth: () => void;
  initialize: () => void;
}

export const useLiffAuthStore = create<AuthState>((set) => ({
  token: null,
  owner: null,
  selectedBusinessType: DEFAULT_BUSINESS_TYPE,
  isAuthenticated: false,
  setAuth: (token: string, owner: Owner) => {
    const availableBusinessTypes = normalizeBusinessTypes(
      owner.availableBusinessTypes,
      owner.primaryBusinessType
    );
    const primaryBusinessType = resolveSelectedBusinessType(owner.primaryBusinessType, availableBusinessTypes);
    const savedSelected = localStorage.getItem(SELECTED_BUSINESS_TYPE_KEY);
    set((state) => {
      const preferredSelection = state.owner
        ? state.selectedBusinessType
        : savedSelected || primaryBusinessType;
      const selectedBusinessType = resolveSelectedBusinessType(
        preferredSelection,
        availableBusinessTypes
      );
      const normalizedOwner: Owner = {
        ...owner,
        primaryBusinessType,
        availableBusinessTypes,
      };
      localStorage.setItem(SELECTED_BUSINESS_TYPE_KEY, selectedBusinessType);
      localStorage.setItem('liff_token', token);
      localStorage.setItem('liff_user', JSON.stringify(normalizedOwner));
      return { token, owner: normalizedOwner, selectedBusinessType, isAuthenticated: true };
    });
  },
  setSelectedBusinessType: (businessType: RecordType) => {
    set((state) => {
      const availableBusinessTypes = state.owner?.availableBusinessTypes || [DEFAULT_BUSINESS_TYPE];
      const selectedBusinessType = resolveSelectedBusinessType(businessType, availableBusinessTypes);
      localStorage.setItem(SELECTED_BUSINESS_TYPE_KEY, selectedBusinessType);
      return { selectedBusinessType };
    });
  },
  clearAuth: () => {
    localStorage.removeItem('liff_token');
    localStorage.removeItem('liff_user');
    localStorage.removeItem(SELECTED_BUSINESS_TYPE_KEY);
    set({
      token: null,
      owner: null,
      selectedBusinessType: DEFAULT_BUSINESS_TYPE,
      isAuthenticated: false,
    });
  },
  initialize: () => {
    const token = localStorage.getItem('liff_token');
    const ownerStr = localStorage.getItem('liff_user');
    if (token && ownerStr) {
      const owner = JSON.parse(ownerStr);
      const availableBusinessTypes = normalizeBusinessTypes(
        owner.availableBusinessTypes,
        owner.primaryBusinessType
      );
      const primaryBusinessType = resolveSelectedBusinessType(owner.primaryBusinessType, availableBusinessTypes);
      const savedSelected = localStorage.getItem(SELECTED_BUSINESS_TYPE_KEY);
      const selectedBusinessType = resolveSelectedBusinessType(savedSelected || primaryBusinessType, availableBusinessTypes);
      const normalizedOwner: Owner = {
        ...owner,
        primaryBusinessType,
        availableBusinessTypes,
      };
      localStorage.setItem(SELECTED_BUSINESS_TYPE_KEY, selectedBusinessType);
      set({ token, owner: normalizedOwner, selectedBusinessType, isAuthenticated: true });
    }
  },
}));
