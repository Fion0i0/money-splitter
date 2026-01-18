// VIP List - Frequently used participants for quick selection
// Each VIP member corresponds to an image file in the VIP folder

export interface VIPMember {
  name: string;
  image?: string; // Path to avatar image
}

// Default VIP members - based on image files in the VIP folder
export const DEFAULT_VIP_LIST: VIPMember[] = [
  { name: 'Fion', image: '/VIP/Fion.png' },
  { name: 'Sally', image: '/VIP/Sally.png' },
  { name: 'Eun', image: '/VIP/Eun.png' },
  { name: 'Vennie', image: '/VIP/Vennie.png' },
  { name: 'Jake', image: '/VIP/Jake.png' },
  { name: 'Long', image: '/VIP/Long.png' },
  { name: 'Han', image: '/VIP/Han.png' },
  { name: 'Kaka', image: '/VIP/Kaka.png' },  
  { name: 'Rex', image: '/VIP/Rex.png' },
];

// LocalStorage key for VIP list
export const VIP_STORAGE_KEY = 'hk-vip-list';

// Load VIP list from localStorage or use defaults
export const loadVIPList = (): VIPMember[] => {
  try {
    const saved = localStorage.getItem(VIP_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load VIP list:', e);
  }
  return DEFAULT_VIP_LIST;
};

// Save VIP list to localStorage
export const saveVIPList = (list: VIPMember[]): void => {
  try {
    localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save VIP list:', e);
  }
};
