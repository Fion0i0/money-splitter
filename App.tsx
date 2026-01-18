import React, { useState, useEffect, useMemo } from 'react';
import { Participant, Expense, Debt, BankAccount, Trip } from './types';
import { parseExpenseWithAI } from './geminiService';
import { GoogleGenAI } from "@google/genai";
import { VIPMember, loadVIPList, saveVIPList } from './VIP/vipList';
import { subscribeToTrips, addTrip as firebaseAddTrip, updateTrip as firebaseUpdateTrip, deleteTrip as firebaseDeleteTrip } from './firebaseService';

// --- Constants ---
const CURRENCIES = [
  { code: 'TWD', symbol: '$', rate: 0.24 },
  { code: 'HKD', symbol: '$', rate: 1 },
  { code: 'JPY', symbol: '¥', rate: 0.052 },
  { code: 'USD', symbol: '$', rate: 7.8 },
  { code: 'EUR', symbol: '€', rate: 8.5 },
  { code: 'GBP', symbol: '£', rate: 9.8 },
  { code: 'CNY', symbol: '¥', rate: 1.08 },
  { code: 'KRW', symbol: '₩', rate: 0.0058 },
  { code: 'THB', symbol: '฿', rate: 0.22 },
];

const TRIP_ICONS = [
  'Ding.png', 'jack.png', 'Leng1.png', 'Leng2.png', 'mushroom.png',
  'Nana.png', 'Nien.png', 'Nien2.png', 'omega.png', 'omega2.png',
  'princes.png', 'stupid.png', 'Taco.png', 'Taco2.png'
];

const getRandomTripIcon = () => TRIP_ICONS[Math.floor(Math.random() * TRIP_ICONS.length)];

// --- Helper Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }> = ({ children, className = "", onClick, style }) => (
  <div
    className={`bg-[#1A1D23] rounded-xl shadow-lg border border-[#2A2D33] p-3 ${className}`}
    onClick={onClick}
    style={style}
  >
    {children}
  </div>
);

// Fix: Added 'title' prop to Button component to resolve TypeScript error when passing title attribute
const Button: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline'; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}> = ({ onClick, children, variant = 'primary', className = "", disabled, type = "button", title }) => {
  const variants = {
    primary: "bg-[#3df2bc] text-[#0B0E14] hover:bg-[#00D4E0] font-bold",
    secondary: "bg-[#1A1D23] text-[#E0E6ED] hover:bg-[#2A2D33] border border-[#2A2D33]",
    danger: "bg-[#FF3131] text-white hover:bg-[#E02020]",
    ghost: "bg-transparent text-[#3df2bc] hover:bg-[#1A1D23]",
    success: "bg-[#3df2bc] text-[#0B0E14] hover:bg-[#00D4E0] font-bold",
    outline: "bg-transparent border border-[#2A2D33] text-[#707A8A] hover:bg-[#1A1D23] hover:text-[#E0E6ED]",
  };
  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick} 
      title={title}
      className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const TableInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="w-full bg-[#0B0E14] border border-[#2A2D33] text-[#E0E6ED] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#3df2bc] outline-none transition-all placeholder:text-[#707A8A]"
  />
);

const TableSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <div className="relative group flex-1">
    <select
      {...props}
      className="w-full bg-[#0B0E14] border border-[#2A2D33] text-[#E0E6ED] rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-[#3df2bc] outline-none transition-all appearance-none pr-6 cursor-pointer"
    />
    <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#707A8A] pointer-events-none group-hover:text-[#E0E6ED] transition-colors"></i>
  </div>
);

const copyToClipboard = (text: string) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Copied: ${text}`);
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
};

const fallbackCopy = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    alert(`Copied: ${text}`);
  } catch (err) {
    alert(`Copy failed. Value: ${text}`);
  }
  document.body.removeChild(textArea);
};

const PaymentChip: React.FC<{ label: string; value: string; icon: string; bgColor: string; sublabel?: string }> = ({ label, value, icon, bgColor, sublabel }) => (
  <div className={`${bgColor} border border-[#2A2D33] rounded-lg p-2 flex flex-col gap-0.5 shadow-sm group relative cursor-pointer active:scale-95 transition-transform`}
       onClick={(e) => {
         e.stopPropagation();
         copyToClipboard(value);
       }}>
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-black uppercase opacity-70 flex items-center gap-1">
        <i className={`fa-solid ${icon}`}></i> {label}
      </span>
      <i className="fa-solid fa-copy text-[12px] opacity-40 group-hover:opacity-100"></i>
    </div>
    <div className="text-[13px] font-bold truncate max-w-full">{value}</div>
    {sublabel && <div className="text-[13px] uppercase font-black opacity-50 truncate">{sublabel}</div>}
  </div>
);

// --- Main App ---

const App: React.FC = () => {
  // Trips state - now synced with Firebase
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to Firebase real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToTrips((firebaseTrips) => {
      setTrips(firebaseTrips);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Always start at trip selection page (activeTripId = null)
  // User must select a trip to proceed
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Current Trip helper
  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId) || null, [trips, activeTripId]);

  // Derived data for active trip
  const participants = useMemo(() => activeTrip?.participants || [], [activeTrip]);
  const expenses = useMemo(() => activeTrip?.expenses || [], [activeTrip]);

  const updateActiveTrip = (updates: Partial<Trip>) => {
    if (!activeTrip) return;
    const updatedTrip = { ...activeTrip, ...updates };
    firebaseUpdateTrip(updatedTrip);
  };

  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripParticipants, setNewTripParticipants] = useState<Participant[]>([]);

  // VIP List State
  const [vipList, setVipList] = useState<VIPMember[]>(() => loadVIPList());
  const [showVipManager, setShowVipManager] = useState(false);
  const [newVipName, setNewVipName] = useState('');

  // UI State
  const [activeTab, setActiveTab] = useState<'expenses' | 'summary' | 'individual' | 'members'>('expenses');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  // Dynamic Bank/Toggle State (for editing)
  const [twBanks, setTwBanks] = useState<BankAccount[]>([]);
  const [twLinePay, setTwLinePay] = useState<boolean>(false);
  const [twIpass, setTwIpass] = useState<boolean>(false);
  const [hkBanks, setHkBanks] = useState<BankAccount[]>([]);
  const [otherBanks, setOtherBanks] = useState<BankAccount[]>([]);

  // Track selected payment method per debt (key: "fromId-toId")
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Record<string, string>>({});

  // Settlement currency (default TWD)
  const [settlementCurrency, setSettlementCurrency] = useState('TWD');

  // Manual Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    item: '',
    amount: '',
    currency: 'TWD',
    exchangeRate: '0.24',
    payerId: '',
    shareMode: 'all' as 'all' | 'specific' | 'loan',
    selectedParticipants: [] as string[]
  });

  // Sync activeTripId to localStorage
  useEffect(() => {
    if (activeTripId) {
      localStorage.setItem('hk-active-trip-id', activeTripId);
    } else {
      localStorage.removeItem('hk-active-trip-id');
    }
  }, [activeTripId]);

  // Sync payerId and selectedParticipants with available members
  useEffect(() => {
    if (participants.length > 0) {
      if (!formData.payerId || !participants.some(p => p.id === formData.payerId)) {
        const first = participants[0]?.id || '';
        setFormData(prev => ({ ...prev, payerId: first }));
      }
      if (formData.selectedParticipants.length === 0 || !formData.selectedParticipants.every(id => participants.some(p => p.id === id))) {
        setFormData(prev => ({ ...prev, selectedParticipants: participants.map(p => p.id) }));
      }
    }
  }, [participants, formData.payerId, formData.selectedParticipants.length]);

  // Handle currency change - auto set rate if known
  const handleCurrencyChange = (newCurrency: string) => {
    const found = CURRENCIES.find(c => c.code === newCurrency);
    setFormData(prev => ({
      ...prev,
      currency: newCurrency,
      exchangeRate: found ? found.rate.toString() : '1.0'
    }));
  };

  // Automatic Rate Calculation via AI
  const fetchRateViaAI = async () => {
    if (formData.currency === 'HKD') return;
    setIsRateLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `What is the current exchange rate from 1 ${formData.currency} to HKD? Return ONLY the number.`,
      });
      const rateStr = response.text?.trim();
      const rate = parseFloat(rateStr || '');
      if (!isNaN(rate)) {
        setFormData(prev => ({ ...prev, exchangeRate: rate.toString() }));
      }
    } catch (e) {
      console.error("Failed to fetch rate", e);
    } finally {
      setIsRateLoading(false);
    }
  };

  // Actions
  const createTrip = async () => {
    if (!newTripName.trim()) return alert("Please enter a trip name");
    if (newTripParticipants.length < 2) return alert("Please add at least two participants");

    const newTrip: Trip = {
      id: Date.now().toString(),
      name: newTripName.trim(),
      icon: getRandomTripIcon(),
      participants: newTripParticipants,
      expenses: [],
      createdAt: Date.now()
    };

    // Add to Firebase - the real-time listener will update our state
    const newId = await firebaseAddTrip(newTrip);
    setActiveTripId(newId);
    setIsCreatingTrip(false);
    setNewTripName('');
    setNewTripParticipants([]);
    setActiveTab('expenses'); // Navigate to Bills page after creating trip
  };

  const deleteTrip = async (id: string) => {
    if (confirm("Delete this trip and all its data?")) {
      await firebaseDeleteTrip(id);
      if (activeTripId === id) {
        setActiveTripId(null);
      }
    }
  };

  const addParticipant = (name: string) => {
    if (!name.trim()) return;
    const newId = Date.now().toString();
    const newP = { id: newId, name: name.trim() };
    
    // If no active trip or explicitly creating, add to draft
    if (isCreatingTrip || !activeTripId) {
      setNewTripParticipants(prev => [...prev, newP]);
    } else {
      updateActiveTrip({ participants: [...participants, newP] });
    }
  };

  const updateParticipant = (id: string, updates: Partial<Participant>) => {
    const nextParticipants = participants.map(p => p.id === id ? { ...p, ...updates } : p);
    updateActiveTrip({ participants: nextParticipants });
  };

  const removeParticipant = (id: string) => {
    if (confirm("Remove this member? This will clear their expenses too.")) {
      if (isCreatingTrip || !activeTripId) {
        setNewTripParticipants(prev => prev.filter(p => p.id !== id));
      } else {
        const nextParticipants = participants.filter(p => p.id !== id);
        const nextExpenses = expenses.filter(e => e.payerId !== id);
        updateActiveTrip({ participants: nextParticipants, expenses: nextExpenses });
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item || !formData.amount || !formData.payerId) return alert("Fill all fields");
    
    let targetParticipants: string[] = [];
    if (formData.shareMode === 'all') {
      targetParticipants = participants.map(p => p.id);
    } else if (formData.shareMode === 'loan') {
      targetParticipants = formData.selectedParticipants.length > 0 ? [formData.selectedParticipants[0]] : [];
    } else {
      targetParticipants = formData.selectedParticipants;
    }

    if (targetParticipants.length === 0) return alert("Select who is sharing");

    const amount = parseFloat(formData.amount);
    const rate = parseFloat(formData.exchangeRate) || 1.0;
    const amountInBase = amount * rate;

    const newExpense: Expense = {
      id: editingExpenseId || Date.now().toString(),
      description: formData.item,
      amount: amount,
      currency: formData.currency,
      exchangeRate: rate,
      amountInBase: amountInBase,
      payerId: formData.payerId,
      participants: targetParticipants.map(uid => ({ userId: uid, hasPaidBack: uid === formData.payerId })),
      date: new Date(formData.date).getTime(),
    };

    let nextExpenses;
    if (editingExpenseId) {
      nextExpenses = expenses.map(exp => exp.id === editingExpenseId ? newExpense : exp);
    } else {
      nextExpenses = [newExpense, ...expenses];
    }
    updateActiveTrip({ expenses: nextExpenses });

    setIsAddingExpense(false);
    setEditingExpenseId(null);
    setFormData(prev => ({ 
      ...prev, 
      item: '', 
      amount: '', 
      shareMode: 'all', 
      selectedParticipants: participants.map(p => p.id) 
    }));
  };

  const startEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setIsAddingExpense(true);
    setAiMode(false);
    setFormData({
      date: new Date(expense.date).toISOString().split('T')[0],
      item: expense.description,
      amount: expense.amount.toString(),
      currency: expense.currency,
      exchangeRate: expense.exchangeRate.toString(),
      payerId: expense.payerId,
      shareMode: expense.participants.length === participants.length ? 'all' : (expense.participants.length === 1 ? 'loan' : 'specific'),
      selectedParticipants: expense.participants.map(p => p.userId)
    });
  };

  const handleSmartSplit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    const participantNames = participants.map(p => p.name);
    const result = await parseExpenseWithAI(aiPrompt, participantNames);
    setIsAiLoading(false);
    
    if (result) {
      let updatedParticipants = [...participants];
      const getOrCreateParticipant = (name: string) => {
        let found = updatedParticipants.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (!found) {
          found = { id: Date.now().toString() + Math.random(), name };
          updatedParticipants.push(found);
        }
        return found;
      };

      const payer = getOrCreateParticipant(result.payerName);
      const participantObjs = result.participantNames.map(getOrCreateParticipant);

      // Ensure payer is included in participants (they share the cost too)
      const allParticipants = participantObjs.some(p => p.id === payer.id)
        ? participantObjs
        : [payer, ...participantObjs];

      const newExpense: Expense = {
        id: Date.now().toString(),
        description: result.description,
        amount: result.amount,
        currency: 'TWD',
        exchangeRate: 0.24,
        amountInBase: result.amount * 0.24,
        payerId: payer.id,
        participants: allParticipants.map(p => ({ userId: p.id, hasPaidBack: p.id === payer.id })),
        date: Date.now(),
      };
      
      updateActiveTrip({ 
        participants: updatedParticipants, 
        expenses: [newExpense, ...expenses] 
      });
      setAiPrompt('');
      setIsAddingExpense(false);
    } else {
      alert("AI failed to parse. Try manual mode.");
    }
  };

  const toggleSettlement = (expenseId: string, userId: string) => {
    const nextExpenses = expenses.map(exp => {
      if (exp.id === expenseId) {
        return {
          ...exp,
          participants: exp.participants.map(p => 
            p.userId === userId ? { ...p, hasPaidBack: !p.hasPaidBack } : p
          )
        };
      }
      return exp;
    });
    updateActiveTrip({ expenses: nextExpenses });
  };

  const settleAllForParticipant = (userId: string) => {
    if (confirm(`Mark all debts for ${participants.find(p => p.id === userId)?.name} as paid?`)) {
      const nextExpenses = expenses.map(exp => ({
        ...exp,
        participants: exp.participants.map(p => 
          p.userId === userId ? { ...p, hasPaidBack: true } : p
        )
      }));
      updateActiveTrip({ expenses: nextExpenses });
    }
  };

  const settleBetween = (fromId: string, toId: string, paymentMethod?: string) => {
    const fromName = participants.find(p => p.id === fromId)?.name;
    const toName = participants.find(p => p.id === toId)?.name;
    if (confirm(`Mark all debts from ${fromName} to ${toName} as paid?`)) {
      const nextExpenses = expenses.map(exp => {
        if (exp.payerId === toId) {
          return {
            ...exp,
            participants: exp.participants.map(p =>
              p.userId === fromId ? { ...p, hasPaidBack: true, selectedPaymentMethod: paymentMethod } : p
            )
          };
        }
        return exp;
      });
      updateActiveTrip({ expenses: nextExpenses });
    }
  };

  const unsettleBetween = (fromId: string, toId: string) => {
    const fromName = participants.find(p => p.id === fromId)?.name;
    const toName = participants.find(p => p.id === toId)?.name;
    if (confirm(`Undo payment from ${fromName} to ${toName}?`)) {
      const nextExpenses = expenses.map(exp => {
        if (exp.payerId === toId) {
          return {
            ...exp,
            participants: exp.participants.map(p =>
              p.userId === fromId ? { ...p, hasPaidBack: false, selectedPaymentMethod: null } : p
            )
          };
        }
        return exp;
      });
      updateActiveTrip({ expenses: nextExpenses });
    }
  };

  const deleteExpense = (id: string) => {
    if (confirm("Delete this expense?")) {
      updateActiveTrip({ expenses: expenses.filter(e => e.id !== id) });
    }
  };

  // Calculations
  const debts = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    const participantIds = new Set(participants.map(p => p.id));
    participants.forEach(p => balanceMap[p.id] = 0);

    expenses.forEach(exp => {
      // Only count participants who still exist in the trip
      const validParticipants = exp.participants.filter(part => participantIds.has(part.userId));
      if (validParticipants.length === 0) return;

      const share = exp.amountInBase / validParticipants.length;
      validParticipants.forEach(part => {
        if (!part.hasPaidBack && part.userId !== exp.payerId) {
          if (balanceMap[exp.payerId] !== undefined) balanceMap[exp.payerId] += share;
          if (balanceMap[part.userId] !== undefined) balanceMap[part.userId] -= share;
        }
      });
    });

    const results: Debt[] = [];
    // Get all debtors (negative balance = owes money) and creditors (positive balance = owed money)
    const debtors = participants
      .map(p => ({ id: p.id, bal: balanceMap[p.id] }))
      .filter(p => p.bal < -0.01)
      .sort((a, b) => a.bal - b.bal); // Most negative first
    const creditors = participants
      .map(p => ({ id: p.id, bal: balanceMap[p.id] }))
      .filter(p => p.bal > 0.01)
      .sort((a, b) => b.bal - a.bal); // Most positive first

    // Create working copies
    const tempDebtors = debtors.map(x => ({...x}));
    const tempCreditors = creditors.map(x => ({...x}));

    // Match debtors to creditors
    for (const debtor of tempDebtors) {
      for (const creditor of tempCreditors) {
        if (debtor.bal >= -0.01) break; // Debtor has paid all
        if (creditor.bal <= 0.01) continue; // Creditor fully paid

        const amount = Math.min(-debtor.bal, creditor.bal);
        if (amount > 0.01) {
          results.push({ from: debtor.id, to: creditor.id, amount });
          debtor.bal += amount;
          creditor.bal -= amount;
        }
      }
    }
    return results;
  }, [expenses, participants]);

  // Calculate settled debts (debts that have been paid back)
  const settledDebts = useMemo(() => {
    const settledMap: Record<string, { amount: number; paymentMethod?: string }> = {};
    const participantIds = new Set(participants.map(p => p.id));

    expenses.forEach(exp => {
      // Only count participants who still exist in the trip
      const validParticipants = exp.participants.filter(part => participantIds.has(part.userId));
      if (validParticipants.length === 0) return;

      const share = exp.amountInBase / validParticipants.length;
      validParticipants.forEach(part => {
        if (part.hasPaidBack && part.userId !== exp.payerId) {
          const key = `${part.userId}-${exp.payerId}`;
          if (!settledMap[key]) {
            settledMap[key] = { amount: 0, paymentMethod: part.selectedPaymentMethod };
          }
          settledMap[key].amount += share;
          // Keep the most recent payment method
          if (part.selectedPaymentMethod) {
            settledMap[key].paymentMethod = part.selectedPaymentMethod;
          }
        }
      });
    });

    return Object.entries(settledMap)
      .filter(([_, data]) => data.amount > 0.01)
      .map(([key, data]) => {
        const [from, to] = key.split('-');
        return { from, to, amount: data.amount, paymentMethod: data.paymentMethod };
      });
  }, [expenses, participants]);

  const participantBalances = useMemo(() => {
    const map: Record<string, { paid: number, share: number, net: number }> = {};
    const participantIds = new Set(participants.map(p => p.id));
    participants.forEach(p => map[p.id] = { paid: 0, share: 0, net: 0 });

    expenses.forEach(exp => {
      if (map[exp.payerId]) {
        map[exp.payerId].paid += exp.amountInBase;
      }
      // Only count participants who still exist in the trip
      const validParticipants = exp.participants.filter(part => participantIds.has(part.userId));
      if (validParticipants.length === 0) return;

      const share = exp.amountInBase / validParticipants.length;
      validParticipants.forEach(part => {
        if (map[part.userId]) {
          map[part.userId].share += share;
        }
      });
    });

    // Net balance considering WHO HAS PAID ALREADY
    const netMap: Record<string, number> = {};
    participants.forEach(p => netMap[p.id] = 0);
    expenses.forEach(exp => {
      // Only count participants who still exist in the trip
      const validParticipants = exp.participants.filter(part => participantIds.has(part.userId));
      if (validParticipants.length === 0) return;

      const share = exp.amountInBase / validParticipants.length;
      validParticipants.forEach(part => {
        if (!part.hasPaidBack && part.userId !== exp.payerId) {
          if (netMap[exp.payerId] !== undefined) netMap[exp.payerId] += share;
          if (netMap[part.userId] !== undefined) netMap[part.userId] -= share;
        }
      });
    });

    return participants.map(p => ({
      ...p,
      paid: map[p.id].paid,
      share: map[p.id].share,
      net: netMap[p.id],
      isClear: Math.abs(netMap[p.id]) < 0.01
    }));
  }, [expenses, participants]);

  const startEditPayment = (p: Participant) => {
    setEditingPaymentId(p.id);
    // TWD first
    const currentTwBanks = p.paymentDetails?.twd?.banks || [];
    setTwBanks(currentTwBanks.length > 0 ? currentTwBanks : [{ bankName: '', accountNo: '' }]);
    setTwLinePay(p.paymentDetails?.twd?.linePay || false);
    setTwIpass(p.paymentDetails?.twd?.ipass || false);
    // HKD second
    const currentHkBanks = p.paymentDetails?.hkd?.banks || [];
    setHkBanks(currentHkBanks.length > 0 ? currentHkBanks : [{ bankName: '', accountNo: '' }]);
    // OTHER third
    const currentOtherBanks = p.paymentDetails?.other?.banks || [];
    setOtherBanks(currentOtherBanks.length > 0 ? currentOtherBanks : [{ bankName: '', accountNo: '' }]);
  };

  const handleAddBank = (region: 'tw' | 'hk' | 'other') => {
    if (region === 'tw') setTwBanks([...twBanks, { bankName: '', accountNo: '' }]);
    else if (region === 'hk') setHkBanks([...hkBanks, { bankName: '', accountNo: '' }]);
    else setOtherBanks([...otherBanks, { bankName: '', accountNo: '' }]);
  };

  const handleRemoveBank = (region: 'tw' | 'hk' | 'other', index: number) => {
    if (region === 'tw') setTwBanks(twBanks.filter((_, i) => i !== index));
    else if (region === 'hk') setHkBanks(hkBanks.filter((_, i) => i !== index));
    else setOtherBanks(otherBanks.filter((_, i) => i !== index));
  };

  const handleBankChange = (region: 'tw' | 'hk' | 'other', index: number, field: keyof BankAccount, value: string) => {
    if (region === 'tw') {
      const next = [...twBanks];
      next[index] = { ...next[index], [field]: value };
      setTwBanks(next);
    } else if (region === 'hk') {
      const next = [...hkBanks];
      next[index] = { ...next[index], [field]: value };
      setHkBanks(next);
    } else {
      const next = [...otherBanks];
      next[index] = { ...next[index], [field]: value };
      setOtherBanks(next);
    }
  };

  // Data Management Functions
  const exportAllTrips = () => {
    const data = JSON.stringify(trips, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitter_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAllTrips = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const importedTrips = JSON.parse(content);
          if (Array.isArray(importedTrips)) {
            if (confirm(`Import ${importedTrips.length} trips? This will ADD to your existing data.`)) {
              // Add each trip to Firebase
              for (const trip of importedTrips) {
                await firebaseAddTrip(trip);
              }
              alert("Data imported successfully!");
            }
          } else {
            alert("Invalid file format. Must be a JSON array of trips.");
          }
        } catch (err) {
          alert("Error parsing JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const generateMarkdownReport = () => {
    if (!activeTrip) return;
    
    let md = `# Trip Report: ${activeTrip.name}\n\n`;
    md += `Generated on: ${new Date().toLocaleString()}\n\n`;
    
    md += `## Members\n`;
    participants.forEach(p => md += `- ${p.name}\n`);
    md += `\n`;

    md += `## Settlement Plan\n`;
    if (debts.length === 0) {
      md += `*Everyone is even!*\n`;
    } else {
      debts.forEach(d => {
        const from = participants.find(p => p.id === d.from)?.name;
        const to = participants.find(p => p.id === d.to)?.name;
        md += `- **${from}** owes **${to}**: HK$${d.amount.toFixed(2)}\n`;
      });
    }
    md += `\n`;

    md += `## Expenses List\n`;
    md += `| Date | Description | Payer | Amount | Currency | HKD Equiv. |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    expenses.forEach(e => {
      const payerName = participants.find(p => p.id === e.payerId)?.name;
      md += `| ${new Date(e.date).toLocaleDateString()} | ${e.description} | ${payerName} | ${e.amount.toFixed(2)} | ${e.currency} | ${e.amountInBase.toFixed(2)} |\n`;
    });

    navigator.clipboard.writeText(md);
    alert("Markdown report copied to clipboard! You can now paste it into GitHub or a message.");
  };

  // Show loading screen while Firebase is connecting
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1A1D23] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#3df2bc]/30 animate-pulse">
            <i className="fa-solid fa-circle-notch animate-spin text-[#3df2bc] text-3xl"></i>
          </div>
          <p className="text-[#707A8A]">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!activeTrip || isCreatingTrip) {
    return (
      <div className="w-full min-h-screen bg-[#0B0E14] flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-6 animate-in fade-in zoom-in duration-500 py-8">
          <div className="text-center mb-8">
            <div className="w-40 h-40 bg-[#1A1D23] backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#3df2bc]/30 shadow-[0_0_20px_rgba(0,242,255,0.2)] overflow-hidden">
              <img src="/icon.png" alt="Logo" className="w-30 h-30 object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-[#E0E6ED] tracking-tight">漢奸燃混帳App</h1>
            {trips.length > 0 && !isCreatingTrip ? (
              <p className="text-[#707A8A] mt-2 text-lg">想睇邊條數</p>
            ) : (
              <p className="text-[#707A8A] mt-2 text-lg">開個新行程，開始計數啦</p>
            )}
          </div>
          
          {isCreatingTrip || (trips.length === 0) ? (
            <Card className="space-y-3 shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-[#E0E6ED]">新帳</h2>
                {trips.length > 0 && (
                  <button onClick={() => setIsCreatingTrip(false)} className="text-[#707A8A] hover:text-[#E0E6ED]">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
              <div>
                <label className="block text-lg font-semibold text-[#E0E6ED] mb-1.5 ml-1">今次又係乜嘢局？</label>
                <input
                  placeholder="e.g. 嚦咕嚦咕新年財"
                  className="w-full px-3 py-2 bg-[#0B0E14] border border-[#2A2D33] rounded-lg outline-none focus:ring-2 focus:ring-[#3df2bc] text-[#E0E6ED] placeholder:text-[#707A8A]"
                  value={newTripName}
                  onChange={(e) => setNewTripName(e.target.value)}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5 ml-1">
                  <label className="block text-lg font-semibold text-[#E0E6ED]">有邊條漢奸？</label>
                  <button
                    onClick={() => setShowVipManager(!showVipManager)}
                    className="text-[12px] font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-[#FFD700]/20"
                  >
                    <i className="fa-solid fa-star"></i> {showVipManager ? 'Hide VIP' : 'VIP List'}
                  </button>
                </div>

                {/* VIP Quick Add Section */}
                {vipList.length > 0 && (
                  <div className="mb-3 p-2 bg-[#FFD700]/10 rounded-lg border border-[#FFD700]/20">
                    <div className="text-[13px] font-bold text-[#FFD700] uppercase mb-2 flex items-center gap-1">
                      <i className="fa-solid fa-star"></i> 老Best 快速加
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vipList.map((vip, idx) => {
                        const isAlreadyAdded = newTripParticipants.some(p => p.name.toLowerCase() === vip.name.toLowerCase());
                        return (
                          <button
                            key={idx}
                            onClick={() => !isAlreadyAdded && addParticipant(vip.name)}
                            disabled={isAlreadyAdded}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-lg font-medium transition-all min-w-[60px] ${
                              isAlreadyAdded
                                ? 'bg-[#3df2bc]/10 border-2 border-[#3df2bc]/50 cursor-default'
                                : 'bg-[#0B0E14] border-2 border-[#2A2D33] hover:border-[#3df2bc]/50 hover:bg-[#3df2bc]/5'
                            }`}
                          >
                            <div className="relative">
                              {vip.image ? (
                                <img
                                  src={vip.image}
                                  alt={vip.name}
                                  className={`w-10 h-10 rounded-full object-cover ${isAlreadyAdded ? 'ring-2 ring-[#3df2bc]' : ''}`}
                                />
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                                  isAlreadyAdded ? 'bg-[#3df2bc]/20 text-[#3df2bc]' : 'bg-[#1A1D23] text-[#707A8A]'
                                }`}>
                                  {vip.name.charAt(0)}
                                </div>
                              )}
                              {isAlreadyAdded && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#3df2bc] rounded-full flex items-center justify-center">
                                  <i className="fa-solid fa-check text-[#0B0E14] text-[12px]"></i>
                                </div>
                              )}
                            </div>
                            <span className={`text-[12px] font-bold ${isAlreadyAdded ? 'text-[#3df2bc]' : 'text-[#E0E6ED]'}`}>
                              {vip.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* VIP Manager */}
                {showVipManager && (
                  <div className="mb-3 p-3 bg-[#0B0E14] rounded-lg border border-[#2A2D33]">
                    <div className="text-[12px] font-bold text-[#707A8A] uppercase mb-2">Manage VIP List</div>
                    <div className="space-y-1.5 mb-2">
                      {vipList.map((vip, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-[#1A1D23] rounded border border-[#2A2D33]">
                          <span className="text-lg text-[#E0E6ED]">{vip.name}</span>
                          <button
                            onClick={() => {
                              const newList = vipList.filter((_, i) => i !== idx);
                              setVipList(newList);
                              saveVIPList(newList);
                            }}
                            className="text-[#FF3131]/60 hover:text-[#FF3131] text-lg"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}
                      {vipList.length === 0 && (
                        <div className="text-center py-2 text-[#707A8A] text-lg italic">No VIP members yet</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        placeholder="Add VIP name..."
                        value={newVipName}
                        onChange={(e) => setNewVipName(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-[#1A1D23] border border-[#2A2D33] rounded text-lg text-[#E0E6ED] outline-none focus:ring-2 focus:ring-[#FFD700] placeholder:text-[#707A8A]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newVipName.trim()) {
                            const newList = [...vipList, { name: newVipName.trim() }];
                            setVipList(newList);
                            saveVIPList(newList);
                            setNewVipName('');
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newVipName.trim()) {
                            const newList = [...vipList, { name: newVipName.trim() }];
                            setVipList(newList);
                            saveVIPList(newList);
                            setNewVipName('');
                          }
                        }}
                        className="px-3 py-1.5 bg-[#FFD700] text-[#0B0E14] rounded text-lg font-bold hover:bg-[#E6C200]"
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Current participants list */}
                <div className="space-y-2 mb-3">
                  {newTripParticipants.length === 0 ? (
                    <div className="text-center py-4 text-[#707A8A] text-lg italic bg-[#0B0E14] rounded-lg border border-dashed border-[#2A2D33]">
                      仲未有人入場
                    </div>
                  ) : (
                    newTripParticipants.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 bg-[#0B0E14] rounded-xl border border-[#2A2D33]">
                        <span className="font-medium text-[#E0E6ED]">{p.name}</span>
                        <button onClick={() => removeParticipant(p.id)} className="text-[#FF3131]/60 hover:text-[#FF3131] transition-colors">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <input
                  placeholder="Type name & hit Enter"
                  className="w-full px-3 py-2 bg-[#0B0E14] border border-[#2A2D33] rounded-lg outline-none focus:ring-2 focus:ring-[#3df2bc] text-[#E0E6ED] placeholder:text-[#707A8A]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addParticipant(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              <Button onClick={createTrip} className="w-full h-12 text-lg mt-4" variant="primary" disabled={newTripParticipants.length < 2 || !newTripName.trim()}>
                Let's start
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {trips.map(trip => (
                <Card
                  key={trip.id}
                  onClick={() => { setActiveTripId(trip.id); setActiveTab('expenses'); }}
                  className="!p-0 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 hover:border-[#3df2bc]/30"
                >
                  <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden">
                        {trip.icon ? (
                          <img src={`/TripIcon/${trip.icon}`} alt="" className="w-12 h-12 object-contain" />
                        ) : (
                          <i className="fa-solid fa-plane-departure text-[#3df2bc] text-lg"></i>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#E0E6ED] text-lg">{trip.name}</h3>
                        <p className="text-[12px] text-[#707A8A] font-bold uppercase tracking-tight">
                          {trip.participants?.length || 0} 漢奸 • {trip.expenses?.length || 0} Bills
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTrip(trip.id); }}
                      className="w-10 h-10 rounded-full text-[#707A8A] hover:text-[#FF3131] hover:bg-[#FF3131]/10 transition-colors flex items-center justify-center"
                    >
                      <i className="fa-solid fa-trash-can text-xl"></i>
                    </button>
                  </div>
                </Card>
              ))}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => setIsCreatingTrip(true)}
                  variant="outline"
                  className="w-full border-[#3df2bc]/30 bg-[#3df2bc]/10 text-[#3df2bc] hover:bg-[#3df2bc]/20 h-12"
                >
                  <i className="fa-solid fa-plus"></i> New 混帳
                </Button>
                <div className="flex gap-2">
                  <Button onClick={exportAllTrips} variant="outline" className="flex-1 bg-[#1A1D23]/50 border-[#2A2D33] text-[12px] text-[#707A8A] hover:bg-[#1A1D23]">
                    <i className="fa-solid fa-download"></i> Backup All
                  </Button>
                  <Button onClick={importAllTrips} variant="outline" className="flex-1 bg-[#1A1D23]/50 border-[#2A2D33] text-[12px] text-[#707A8A] hover:bg-[#1A1D23]">
                    <i className="fa-solid fa-upload"></i> Restore All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0B0E14]">
      <div className="w-full max-w-6xl mx-auto flex flex-col pb-24">
      <header className="bg-[#1A1D23] px-6 pt-8 pb-4 border-b border-[#2A2D33] sticky top-0 z-30 shadow-lg">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTripId(null)}
              className="w-8 h-8 bg-[#0B0E14] rounded-lg flex items-center justify-center text-[#707A8A] hover:text-[#3df2bc] hover:bg-[#3df2bc]/10 transition-colors"
            >
              <i className="fa-solid fa-chevron-left text-lg"></i>
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#E0E6ED] flex items-center gap-2">
                {activeTrip.name}
              </h1>
              <p className="text-[#707A8A] text-[12px] font-bold uppercase tracking-widest -mt-0.5">漢奸燃分帳 • {participants.length} 條漢奸</p>
            </div>
          </div>
          <div className="bg-[#3df2bc]/10 text-[#3df2bc] px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase">
            {expenses.length} 條數
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            {!isAddingExpense ? (
              <Button onClick={() => setIsAddingExpense(true)} className="w-full h-12 text-lg"><i className="fa-solid fa-plus"></i> 加新帳 </Button>
            ) : (
              <Card className="animate-in fade-in slide-in-from-top-4 duration-300 !p-0 overflow-hidden shadow-lg border-2 border-[#3df2bc]/20">
                <div className="flex justify-between items-center p-4 bg-[#0B0E14] border-b border-[#2A2D33]">
                  <h3 className="font-bold text-[#E0E6ED] text-lg uppercase tracking-wider">
                    {editingExpenseId ? "Edit Bill" : (aiMode ? "Smart Bill (AI)" : "Bill Entry")}
                  </h3>
                  <div className="flex items-center gap-3">
                    {!editingExpenseId && (
                      <button onClick={() => setAiMode(!aiMode)} className="text-[12px] font-bold text-[#3df2bc] uppercase bg-[#3df2bc]/10 border border-[#3df2bc]/20 px-2 py-1 rounded shadow-sm">
                        {aiMode ? "Manual Mode" : "AI Mode"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsAddingExpense(false);
                        setEditingExpenseId(null);
                        setFormData(prev => ({ ...prev, item: '', amount: '' }));
                      }}
                      className="text-[#707A8A] hover:text-[#E0E6ED]"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                </div>

                {aiMode && !editingExpenseId ? (
                  <div className="p-4 space-y-3">
                    <textarea
                      className="w-full p-3 bg-[#0B0E14] border border-[#2A2D33] rounded-xl h-20 text-sm focus:ring-2 focus:ring-[#3df2bc] outline-none text-[#E0E6ED] placeholder:text-[#707A8A]"
                      placeholder="e.g. Sushi 12000 JPY, Alan paid, shared by all"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <Button onClick={handleSmartSplit} className="w-full" disabled={isAiLoading || !aiPrompt.trim()}>
                      {isAiLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : "Process with Gemini"}
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleManualSubmit} className="p-3">
                    <div className="grid grid-cols-12 gap-y-2 gap-x-2">
                      <div className="col-span-4">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Date</label>
                        <TableInput type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                      </div>
                      <div className="col-span-8">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Item</label>
                        <TableInput placeholder="Description..." value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
                      </div>

                      <div className="col-span-4">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Amount</label>
                        <TableInput type="number" step="any" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                      </div>
                      <div className="col-span-8">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Currency</label>
                        <TableSelect value={formData.currency} onChange={e => handleCurrencyChange(e.target.value)}>
                          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </TableSelect>
                      </div>

                      <div className="col-span-6 mt-1">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Payer</label>
                        <TableSelect value={formData.payerId} onChange={e => setFormData({...formData, payerId: e.target.value})}>
                          {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </TableSelect>
                      </div>
                      <div className="col-span-6 mt-1">
                        <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">Share Type</label>
                        <TableSelect value={formData.shareMode} onChange={e => setFormData({...formData, shareMode: e.target.value as any})}>
                          <option value="all">全部人平分</option>
                          <option value="specific">得嗰幾條友分</option>
                          <option value="loan">幫你墊</option>
                        </TableSelect>
                      </div>

                      {(formData.shareMode === 'specific' || formData.shareMode === 'loan') && (
                        <div className="col-span-12 py-2 border-t border-[#2A2D33] mt-1 animate-in fade-in duration-200">
                          <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-1.5">
                            {formData.shareMode === 'loan' ? "Select Borrower" : "Select Participants"}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {participants.map(p => {
                              const isSelected = formData.selectedParticipants.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    if (formData.shareMode === 'loan') {
                                      setFormData({...formData, selectedParticipants: [p.id]});
                                    } else {
                                      const next = isSelected
                                        ? formData.selectedParticipants.filter(id => id !== p.id)
                                        : [...formData.selectedParticipants, p.id];
                                      setFormData({...formData, selectedParticipants: next});
                                    }
                                  }}
                                  className={`text-[13px] px-2 py-1 rounded-md font-bold transition-all border ${isSelected ? 'bg-[#3df2bc] text-[#0B0E14] border-[#3df2bc]' : 'bg-[#0B0E14] text-[#707A8A] border-[#2A2D33]'}`}
                                >
                                  {p.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#2A2D33] flex items-center justify-between">
                      <div className="text-[12px] text-[#707A8A] font-bold uppercase">
                        Total: <span className="text-[#3df2bc]">HK${(parseFloat(formData.amount || '0') * parseFloat(formData.exchangeRate || '1')).toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2">
                        {editingExpenseId && (
                           <Button onClick={() => { setIsAddingExpense(false); setEditingExpenseId(null); }} variant="secondary" className="px-4 text-lg">Cancel</Button>
                        )}
                        <Button type="submit" variant="success" className="px-8 text-lg">{editingExpenseId ? "Update Bill" : "Save Bill"}</Button>
                      </div>
                    </div>
                  </form>
                )}
              </Card>
            )}

            <div className="space-y-3">
              {expenses.length === 0 ? (
                <div className="text-center py-20 text-[#707A8A]">
                  <i className="fa-solid fa-receipt text-6xl mb-4 opacity-30"></i>
                  <p>No bills yet. Tap "Add New Bill"!</p>
                </div>
              ) : (
                expenses.map(exp => (
                  <ExpenseItem 
                    key={exp.id} 
                    expense={exp} 
                    participants={participants} 
                    onToggleSettlement={toggleSettlement} 
                    onDelete={deleteExpense} 
                    onEdit={startEdit}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Optimized Settlement Plan - Top Section */}
            <div className="space-y-3 pt-4">
              <h3 className="font-bold text-[#E0E6ED] px-1 text-lg uppercase tracking-widest flex justify-between items-center">
                <span>速速磅，咪兩頭望</span>
                <div className="flex items-center gap-2">
                  <select
                    value={settlementCurrency}
                    onChange={(e) => setSettlementCurrency(e.target.value)}
                    className="text-[12px] bg-[#0B0E14] border border-[#2A2D33] text-[#E0E6ED] px-2 py-1 rounded font-bold outline-none focus:ring-2 focus:ring-[#3df2bc]"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </h3>
              <div className="space-y-3">
                {debts.length === 0 ? (
                  <Card className="!p-2 text-center py-10">
                    <div className="w-16 h-16 bg-[#3df2bc]/10 text-[#3df2bc] rounded-full flex items-center justify-center mx-auto mb-3 text-lg">
                      <i className="fa-solid fa-check-double"></i>
                    </div>
                    <p className="text-[#E0E6ED] font-bold">大家都冇拖冇欠!</p>
                  </Card>
                ) : (
                  debts.map((debt, idx) => {
                    const creditor = participants.find(p => p.id === debt.to);
                    const debtor = participants.find(p => p.id === debt.from);
                    
                    // Collect methods for the "Pay via" roll-down list (TWD first, HKD second, OTHER third)
                    const methods: { label: string; value: string }[] = [];
                    // TWD methods first
                    if (creditor?.paymentDetails?.twd?.linePay) {
                        methods.push({ label: "Line Pay", value: "Line Pay" });
                    }
                    if (creditor?.paymentDetails?.twd?.ipass) {
                        methods.push({ label: "iPASS MONEY", value: "iPASS MONEY" });
                    }
                    creditor?.paymentDetails?.twd?.banks?.forEach(b => {
                        if (b.accountNo) methods.push({ label: `BANK: ${b.bankName || 'TW'} - ${b.accountNo}`, value: b.bankName || 'TW Bank' });
                    });
                    // HKD methods second
                    if (creditor?.paymentDetails?.hkd?.fpsTel) {
                        methods.push({ label: "FPS", value: "FPS" });
                    }
                    if (creditor?.paymentDetails?.hkd?.paymeTel) {
                        methods.push({ label: "PayMe", value: "PayMe" });
                    }
                    creditor?.paymentDetails?.hkd?.banks?.forEach(b => {
                        if (b.accountNo) methods.push({ label: `BANK: ${b.bankName || 'HK'} - ${b.accountNo}`, value: b.bankName });
                    });
                    // OTHER methods third
                    creditor?.paymentDetails?.other?.banks?.forEach(b => {
                        if (b.accountNo) methods.push({ label: `BANK: ${b.bankName || 'Other'} - ${b.accountNo}`, value: b.bankName });
                    });

                    return (
                      <Card key={idx} className="!p-0 overflow-hidden hover:shadow-md transition-shadow border-2 border-[#2A2D33] hover:border-[#FF3131]/30">
                        <div className="p-4 flex items-center justify-between bg-[#0B0E14]">
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#E0E6ED] text-lg whitespace-nowrap">{debtor?.name}</span>
                              <i className="fa-solid fa-arrow-right text-[#F78181] text-[12px]"></i>
                              <span className="font-bold text-[#E0E6ED] text-lg whitespace-nowrap">{creditor?.name}</span>
                            </div>
                          </div>
                          <div className="text-[#F78181] font-black text-lg tabular-nums">
                            {(() => {
                              const currency = CURRENCIES.find(c => c.code === settlementCurrency);
                              const convertedAmount = currency ? debt.amount / currency.rate : debt.amount;
                              return `${currency?.symbol || '$'}${convertedAmount.toFixed(2)} ${settlementCurrency}`;
                            })()}
                          </div>
                        </div>

                        {/* Dropdown with Settle Button on the right */}
                        {creditor?.paymentDetails && (
                          <div className="p-3 border-t border-[#2A2D33] space-y-3">
                             <div className="space-y-2">
                               <div className="text-[13px] font-black text-[#707A8A] uppercase tracking-widest px-1">點結帳:</div>
                               <div className="px-1 flex items-center gap-2">
                                 <TableSelect
                                   value={selectedPaymentMethods[`${debt.from}-${debt.to}`] || ""}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     if (val) {
                                       setSelectedPaymentMethods(prev => ({
                                         ...prev,
                                         [`${debt.from}-${debt.to}`]: val
                                       }));
                                     }
                                   }}
                                 >
                                   <option value="" disabled>-- Select method --</option>
                                   {methods.length === 0 ? (
                                       <option disabled>No payment methods set</option>
                                   ) : (
                                       methods.map((m, mIdx) => (
                                           <option key={mIdx} value={m.value}>{m.label}</option>
                                       ))
                                   )}
                                 </TableSelect>

                                 {/* Paid button */}
                                 <Button
                                    onClick={() => {
                                      const selectedMethod = selectedPaymentMethods[`${debt.from}-${debt.to}`];
                                      settleBetween(debt.from, debt.to, selectedMethod);
                                    }}
                                    variant="success"
                                    className="h-8 px-3 rounded-xl text-[12px] flex-shrink-0 shadow-sm font-bold"
                                    title="Mark as Paid"
                                  >
                                    Paid
                                  </Button>

                                 {/* Undo button */}
                                 <Button
                                    onClick={() => unsettleBetween(debt.from, debt.to)}
                                    variant="outline"
                                    className="h-8 px-2 rounded-xl text-[12px] flex-shrink-0 shadow-sm text-[#707A8A] hover:text-[#FF3131] hover:border-[#FF3131]/30"
                                    title="Undo Payment"
                                  >
                                    <i className="fa-solid fa-rotate-left"></i>
                                  </Button>
                               </div>
                             </div>

                             {/* Detailed payment information section */}
                             <div className="space-y-2 pt-1 border-t border-[#2A2D33] mt-2">
                                <div className="text-[13px] font-black text-[#707A8A] uppercase tracking-widest px-1">
                                    <span>點收帳:</span>
                                </div>
                                {/* Payment methods with icons */}
                                <div className="flex flex-wrap gap-2 px-1">
                                    {creditor.paymentDetails.twd?.linePay && (
                                        <div className="flex items-center gap-1.5 bg-[#00C300]/10 border border-[#00C300]/30 rounded-lg px-2 py-1">
                                            <img src="/payment/linepay.png" alt="Line Pay" className="w-5 h-5 object-contain" />
                                            <span className="text-[12px] font-bold text-[#00C300]">Line Pay</span>
                                        </div>
                                    )}
                                    {creditor.paymentDetails.twd?.ipass && (
                                        <div className="flex items-center gap-1.5 bg-[#00C300]/10 border border-[#00C300]/30 rounded-lg px-2 py-1">
                                            <img src="/payment/IPASSMoney.png" alt="iPASS MONEY" className="w-5 h-5 object-contain" />
                                            <span className="text-[12px] font-bold text-[#00C300]">iPASS MONEY</span>
                                        </div>
                                    )}
                                    {creditor.paymentDetails.hkd?.fpsTel && (
                                        <div
                                            className="flex items-center gap-1.5 bg-[#4096F7]/10 border border-[#3df2bc]/30 rounded-lg px-2 py-1 cursor-pointer hover:bg-[#3df2bc]/20 active:scale-95 transition-all"
                                            onClick={() => { navigator.clipboard.writeText(creditor.paymentDetails!.hkd!.fpsTel!); alert(`Copied: ${creditor.paymentDetails!.hkd!.fpsTel}`); }}
                                        >
                                            <img src="/payment/fps.png" alt="FPS" className="w-5 h-5 object-contain" />
                                            <span className="text-[12px] font-bold text-[#4096F7]">FPS: {creditor.paymentDetails.hkd.fpsTel}</span>
                                        </div>
                                    )}
                                    {creditor.paymentDetails.hkd?.paymeTel && (
                                        <div
                                            className="flex items-center gap-1.5 bg-[#FF3131]/10 border border-[#FF3131]/30 rounded-lg px-2 py-1 cursor-pointer hover:bg-[#FF3131]/20 active:scale-95 transition-all"
                                            onClick={() => { navigator.clipboard.writeText(creditor.paymentDetails!.hkd!.paymeTel!); alert(`Copied: ${creditor.paymentDetails!.hkd!.paymeTel}`); }}
                                        >
                                            <img src="/payment/payMe.png" alt="PayMe" className="w-5 h-5 object-contain" />
                                            <span className="text-[12px] font-bold text-[#FF3131]">PayMe: {creditor.paymentDetails.hkd.paymeTel}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Bank accounts - keep original style */}
                                <div className="grid grid-cols-2 gap-2 px-1">
                                    {creditor.paymentDetails.twd?.banks?.map((bank, bIdx) => bank.accountNo && (
                                        <PaymentChip key={`tw-bank-${bIdx}`} label={bank.bankName || "TW Bank"} value={bank.accountNo} icon="fa-building-columns" bgColor="bg-[#1A1D23] text-[#E0E6ED]" />
                                    ))}
                                    {creditor.paymentDetails.hkd?.banks?.map((bank, bIdx) => bank.accountNo && (
                                        <PaymentChip key={`hk-bank-${bIdx}`} label={bank.bankName || "HK Bank"} value={bank.accountNo} icon="fa-building-columns" bgColor="bg-[#1A1D23] text-[#E0E6ED]" />
                                    ))}
                                    {creditor.paymentDetails.other?.banks?.map((bank, bIdx) => bank.accountNo && (
                                        <PaymentChip key={`other-bank-${bIdx}`} label={bank.bankName || "Other Bank"} value={bank.accountNo} icon="fa-building-columns" bgColor="bg-[#1A1D23] text-[#E0E6ED]" />
                                    ))}
                                </div>
                             </div>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Settled Payments Section - Show paid debts with undo option */}
            {settledDebts.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="font-bold text-[#E0E6ED] px-1 text-lg uppercase tracking-widest flex justify-between items-center">
                  <span>良心區</span>
                  <span className="text-[12px] bg-[#3df2bc]/10 text-[#3df2bc] px-2 py-0.5 rounded font-black uppercase">{settledDebts.length} Paid</span>
                </h3>
                <div className="space-y-2">
                  {settledDebts.map((settled, idx) => {
                    const creditor = participants.find(p => p.id === settled.to);
                    const debtor = participants.find(p => p.id === settled.from);
                    return (
                      <Card key={idx} className="!p-3 bg-[#3df2bc]/5 border border-[#3df2bc]/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#3df2bc] text-[#0B0E14] rounded-full flex items-center justify-center">
                              <i className="fa-solid fa-check text-lg"></i>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#E0E6ED] text-lg">{debtor?.name}</span>
                                <i className="fa-solid fa-arrow-right text-[#3df2bc] text-[12px]"></i>
                                <span className="font-bold text-[#E0E6ED] text-lg">{creditor?.name}</span>
                              </div>
                              <div className="text-[12px] text-[#3df2bc] font-medium">
                                {settled.paymentMethod ? `via ${settled.paymentMethod}` : 'Payment completed'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#3df2bc] font-black text-lg">
                              {(() => {
                                const currency = CURRENCIES.find(c => c.code === settlementCurrency);
                                const convertedAmount = currency ? settled.amount / currency.rate : settled.amount;
                                return `${currency?.symbol || '$'}${convertedAmount.toFixed(2)}`;
                              })()}
                            </span>
                            <Button
                              onClick={() => unsettleBetween(settled.from, settled.to)}
                              variant="outline"
                              className="h-7 px-2 rounded-lg text-[12px] text-[#707A8A] hover:text-[#FF3131] hover:border-[#FF3131]/30 border-[#2A2D33]"
                              title="Undo Payment"
                            >
                              <i className="fa-solid fa-rotate-left"></i> Undo
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Net Status Section */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-[#E0E6ED] px-1 text-lg uppercase tracking-widest flex justify-between items-center">
                <span>欠債不還榜</span>
                <span className="text-[12px] text-[#707A8A] normal-case font-medium">{participantBalances.filter(p => p.isClear).length} / {participants.length} Cleared</span>
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {participantBalances.map(p => (
                  <Card key={p.id} className="!p-3 border-l-4 overflow-hidden relative" style={{ borderLeftColor: p.isClear ? '#383b38' : (p.net < 0 ? '#f76b6b' : '#f2dd3d') }}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${p.isClear ? 'bg-[#3df2bc]/10 text-[#3df2bc]' : (p.net < 0 ? 'bg-[#f76b6b]/10 text-[#f76b6b]' : 'bg-[#f2dd3d]/10 text-[#f2dd3d]')}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#E0E6ED] text-lg">{p.name}</div>
                          <div className={`text-[12px] font-black uppercase ${p.isClear ? 'text-[#7F8A70]' : 'text-[#707A8A]'}`}>
                            {p.isClear ? (
                              <span className="flex items-center gap-1"><i className="fa-solid fa-circle-check"></i> 今次算你有良心</span>
                            ) : (
                              p.net < 0 ? `欠債還錢` : `錢未收齊`
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'individual' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-200">
            <h3 className="font-bold text-[#E0E6ED] px-1 text-lg uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-wallet text-[#3df2bc]"></i> 你想點收錢?
            </h3>
            <p className="text-[12px] text-[#707A8A] px-1 -mt-4">Set 好收錢途徑</p>

            <div className="space-y-3">
              {participants.map(p => (
                <Card key={p.id} className="relative group overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-[#3df2bc]/10 text-[#3df2bc] rounded-2xl flex items-center justify-center font-black text-lg">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-[#E0E6ED] text-lg">{p.name}</h4>
                      <div className="flex gap-2">
                         {p.paymentDetails?.hkd && <span className="text-[12px] font-black uppercase text-[#707A8A] bg-[#707A8A]/10 px-1 rounded">HKD Active</span>}
                         {p.paymentDetails?.twd && <span className="text-[12px] font-black uppercase text-[#707A8A] bg-[#707A8A]/10 px-1 rounded">TWD Active</span>}
                      </div>
                    </div>
                  </div>

                  {editingPaymentId === p.id ? (
                    <div className="space-y-5 animate-in fade-in duration-200 bg-[#0B0E14] -mx-4 -mb-4 p-4 border-t border-[#2A2D33]">
                      {/* TWD Section - First */}
                      <div className="space-y-3">
                        <div className="text-[11px] font-black text-[#DEE0E3] uppercase flex items-center gap-2">
                          <i className="fa-solid fa-piggy-bank"></i> Taiwan (TWD)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-1">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-1">Line Pay</label>
                            <div className="flex bg-[#1A1D23] rounded-lg border border-[#2A2D33] overflow-hidden p-1 gap-1">
                               <button
                                onClick={() => setTwLinePay(true)}
                                className={`flex-1 py-0.5 text-[11px] font-black rounded ${twLinePay ? 'bg-[#3df2bc] text-[#0B0E14]' : 'bg-transparent text-[#707A8A]'}`}
                               >YES</button>
                               <button
                                onClick={() => setTwLinePay(false)}
                                className={`flex-1 py-0.5 text-[11px] font-black rounded ${!twLinePay ? 'bg-[#2A2D33] text-[#E0E6ED]' : 'bg-transparent text-[#707A8A]'}`}
                               >NO</button>
                            </div>
                          </div>
                          <div className="col-span-1">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-1">iPass MONEY</label>
                            <div className="flex bg-[#1A1D23] rounded-lg border border-[#2A2D33] overflow-hidden p-1 gap-1">
                               <button
                                onClick={() => setTwIpass(true)}
                                className={`flex-1 py-0.5 text-[11px] font-black rounded ${twIpass ? 'bg-[#FFD700] text-[#0B0E14]' : 'bg-transparent text-[#707A8A]'}`}
                               >YES</button>
                               <button
                                onClick={() => setTwIpass(false)}
                                className={`flex-1 py-0.5 text-[11px] font-black rounded ${!twIpass ? 'bg-[#2A2D33] text-[#E0E6ED]' : 'bg-transparent text-[#707A8A]'}`}
                               >NO</button>
                            </div>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block">Bank Accounts</label>
                            {twBanks.map((bank, idx) => (
                              <div key={idx} className="space-y-1 p-1.5 bg-[#1A1D23] rounded-lg border border-[#2A2D33] shadow-sm relative group">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                    value={bank.bankName}
                                    placeholder="Bank (e.g. 台新銀行)"
                                    onChange={(e) => handleBankChange('tw', idx, 'bankName', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                    value={bank.accountNo}
                                    placeholder="Account Number"
                                    onChange={(e) => handleBankChange('tw', idx, 'accountNo', e.target.value)}
                                  />
                                </div>
                                <button onClick={() => handleRemoveBank('tw', idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF3131] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddBank('tw')} className="text-[11px] font-bold text-[#3DF2BC] bg-[#1A1D23] border border-dashed border-[#3DF2BC]/30 w-full py-2 rounded-lg hover:bg-[#3DF2BC]/10 transition-colors">
                              + Add TW Bank Account
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* HKD Section - Second */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-black text-[#DEE0E3] uppercase flex items-center gap-2">
                          <i className="fa-solid fa-piggy-bank"></i> Hong Kong (HKD)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-1">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">FPS</label>
                            <input
                              type="text"
                              className="w-full bg-[#1A1D23] border border-[#2A2D33] rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                              defaultValue={p.paymentDetails?.hkd?.fpsTel || ''}
                              placeholder="Tel..."
                              id={`fps-tel-${p.id}`}
                            />
                          </div>
                          <div className="col-span-1">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block mb-0.5">PayMe</label>
                            <input
                              type="text"
                              className="w-full bg-[#1A1D23] border border-[#2A2D33] rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                              defaultValue={p.paymentDetails?.hkd?.paymeTel || ''}
                              placeholder="Tel..."
                              id={`payme-tel-${p.id}`}
                            />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <label className="text-[11px] font-bold text-[#707A8A] uppercase block">Bank Accounts</label>
                            {hkBanks.map((bank, idx) => (
                              <div key={idx} className="space-y-1 p-1.5 bg-[#1A1D23] rounded-lg border border-[#2A2D33] shadow-sm relative group">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <input
                                    type="text"
                                    className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                    value={bank.bankName}
                                    placeholder="Bank (e.g. HSBC)"
                                    onChange={(e) => handleBankChange('hk', idx, 'bankName', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                    value={bank.accountNo}
                                    placeholder="Account Number"
                                    onChange={(e) => handleBankChange('hk', idx, 'accountNo', e.target.value)}
                                  />
                                </div>
                                <button onClick={() => handleRemoveBank('hk', idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF3131] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                              </div>
                            ))}
                            <button onClick={() => handleAddBank('hk')} className="text-[11px] font-bold text-[#3df2bc] bg-[#1A1D23] border border-dashed border-[#3df2bc]/30 w-full py-2 rounded-lg hover:bg-[#3df2bc]/10 transition-colors">
                              + Add HK Bank Account
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* OTHER Section - Third */}
                      <div className="space-y-2 pt-2">
                        <div className="text-[11px] font-black text-[#E0E6ED] uppercase flex items-center gap-2">
                          <i className="fa-solid fa-globe"></i> Other Currencies
                        </div>
                        <div className="col-span-2 space-y-2">
                          <label className="text-[11px] font-bold text-[#707A8A] uppercase block">Bank Accounts (JPY, USD, etc.)</label>
                          {otherBanks.map((bank, idx) => (
                            <div key={idx} className="space-y-1 p-1.5 bg-[#1A1D23] rounded-lg border border-[#2A2D33] shadow-sm relative group">
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                  value={bank.bankName}
                                  placeholder="Bank/Currency (e.g. JPY - Rakuten)"
                                  onChange={(e) => handleBankChange('other', idx, 'bankName', e.target.value)}
                                />
                                <input
                                  type="text"
                                  className="w-full bg-[#0B0E14] border-0 rounded-lg px-2 py-1.5 text-sm text-[#E0E6ED] focus:ring-2 focus:ring-[#3df2bc] outline-none placeholder:text-[#707A8A]"
                                  value={bank.accountNo}
                                  placeholder="Account Number"
                                  onChange={(e) => handleBankChange('other', idx, 'accountNo', e.target.value)}
                                />
                              </div>
                              <button onClick={() => handleRemoveBank('other', idx)} className="absolute -top-2 -right-2 w-5 h-5 bg-[#FF3131] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                            </div>
                          ))}
                          <button onClick={() => handleAddBank('other')} className="text-[11px] font-bold text-[#E0E6ED] bg-[#1A1D23] border border-dashed border-[#707A8A]/30 w-full py-2 rounded-lg hover:bg-[#707A8A]/10 transition-colors">
                            + Add Other Bank Account
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                         <Button onClick={() => setEditingPaymentId(null)} variant="secondary" className="flex-1 h-10 text-sm">Cancel</Button>
                         <Button
                          onClick={() => {
                            const twd = {
                              linePay: twLinePay,
                              ipass: twIpass,
                              banks: twBanks.filter(b => b.accountNo.trim() !== ''),
                            };
                            const hkd = {
                              fpsTel: (document.getElementById(`fps-tel-${p.id}`) as HTMLInputElement).value,
                              paymeTel: (document.getElementById(`payme-tel-${p.id}`) as HTMLInputElement).value,
                              banks: hkBanks.filter(b => b.accountNo.trim() !== ''),
                            };
                            const other = {
                              banks: otherBanks.filter(b => b.accountNo.trim() !== ''),
                            };
                            updateParticipant(p.id, { paymentDetails: { twd, hkd, other } });
                            setEditingPaymentId(null);
                          }}
                          variant="success"
                          className="flex-2 h-10 text-lg px-8"
                        >
                          Save Setup
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <div className="text-[12px] font-bold text-[#707A8A] uppercase tracking-widest">Collection Info</div>
                         <button
                          onClick={() => startEditPayment(p)}
                          className="text-[12px] font-black text-[#3df2bc] bg-[#3df2bc]/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 hover:bg-[#3df2bc]/20 transition-colors"
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {(!p.paymentDetails || (
                          Object.keys(p.paymentDetails?.twd || {}).every(k => !p.paymentDetails?.twd?.[k as keyof typeof p.paymentDetails.twd]) &&
                          Object.keys(p.paymentDetails?.hkd || {}).every(k => !p.paymentDetails?.hkd?.[k as keyof typeof p.paymentDetails.hkd]) &&
                          Object.keys(p.paymentDetails?.other || {}).every(k => !p.paymentDetails?.other?.[k as keyof typeof p.paymentDetails.other]) &&
                          !p.paymentDetails.twd?.linePay && !p.paymentDetails.twd?.ipass
                        )) ? (
                          <div className="text-center py-4 bg-[#0B0E14] border border-dashed border-[#2A2D33] rounded-xl text-[#707A8A] text-[12px] italic">
                            No collection methods set. Tap Edit.
                          </div>
                        ) : (
                          <>
                            {p.paymentDetails.twd && (p.paymentDetails.twd.linePay || p.paymentDetails.twd.ipass || (p.paymentDetails.twd.banks && p.paymentDetails.twd.banks.length > 0)) && (
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-[12px] font-black text-[#DEE0E3] uppercase w-full">TWD:</span>
                                {p.paymentDetails.twd.linePay && <span className="text-[13px] font-bold bg-[#5bf23d]/10 text-[#5bf23d] px-2 py-0.5 rounded-full border border-[#5bf23d]/20">Line Pay</span>}
                                {p.paymentDetails.twd.ipass && <span className="text-[13px] font-bold bg-[#5BF23D]/10 text-[#5bf23d] px-2 py-0.5 rounded-full border border-[#5bf23d]/20">iPass</span>}
                                {p.paymentDetails.twd.banks?.map((b, i) => <span key={i} className="text-[13px] font-bold bg-[#1A1D23] text-[#E0E6ED] px-2 py-0.5 rounded-full border border-[#2A2D33]">{b.bankName || 'Bank'}</span>)}
                              </div>
                            )}
                            {p.paymentDetails.hkd && (p.paymentDetails.hkd.fpsTel || p.paymentDetails.hkd.paymeTel || (p.paymentDetails.hkd.banks && p.paymentDetails.hkd.banks.length > 0)) && (
                              <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-[#2A2D33] mt-1">
                                <span className="text-[12px] font-black text-[#DEE0E3] uppercase w-full">HKD:</span>
                                {p.paymentDetails.hkd.fpsTel && <span className="text-[13px] font-bold bg-[#4096F7]/10 text-[#4096F7] px-2 py-0.5 rounded-full border border-[#4096F7]/20">FPS</span>}
                                {p.paymentDetails.hkd.paymeTel && <span className="text-[13px] font-bold bg-[#FF3131]/10 text-[#FF3131] px-2 py-0.5 rounded-full border border-[#FF3131]/20">PayMe</span>}
                                {p.paymentDetails.hkd.banks?.map((b, i) => <span key={i} className="text-[13px] font-bold bg-[#1A1D23] text-[#E0E6ED] px-2 py-0.5 rounded-full border border-[#2A2D33]">{b.bankName || 'Bank'}</span>)}
                              </div>
                            )}
                            {p.paymentDetails.other && (p.paymentDetails.other.banks && p.paymentDetails.other.banks.length > 0) && (
                              <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-[#2A2D33] mt-1">
                                <span className="text-[12px] font-black text-[#9B59B6] uppercase w-full">OTHER:</span>
                                {p.paymentDetails.other.banks?.map((b, i) => <span key={i} className="text-[13px] font-bold bg-[#1A1D23] text-[#E0E6ED] px-2 py-0.5 rounded-full border border-[#2A2D33]">{b.bankName || 'Bank'}</span>)}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <Card>
              <h3 className="font-bold text-[#E0E6ED] mb-4 flex items-center gap-2"><i className="fa-solid fa-user-plus text-[#3df2bc]"></i> Add Member</h3>
              <input
                placeholder="Enter name..."
                className="w-full px-3 py-2 bg-[#0B0E14] border border-[#2A2D33] rounded-lg outline-none focus:ring-2 focus:ring-[#3df2bc] text-[#E0E6ED] placeholder:text-[#707A8A]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addParticipant(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </Card>

            <div className="space-y-3">
              <h3 className="font-bold text-[#E0E6ED] px-1 text-lg uppercase tracking-widest flex justify-between items-center">
                <span>呢單嘢關邊個事</span>
                <span className="text-[12px] text-[#707A8A]">{participants.length} Active</span>
              </h3>
              {participants.length === 0 ? (
                <p className="text-center py-10 text-[#707A8A] text-lg">No members added</p>
              ) : (
                participants.map(p => {
                  const vipMember = vipList.find(v => v.name.toLowerCase() === p.name.toLowerCase());
                  const isVip = !!vipMember;
                  return (
                    <div
                      key={p.id}
                      className="flex justify-between items-center p-4 bg-[#1A1D23] rounded-xl border border-[#2A2D33] shadow-sm overflow-hidden"
                    >
                      <div className="flex items-center gap-3">
                        {vipMember?.image ? (
                          <img src={vipMember.image} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#FFD700]" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${isVip ? 'bg-[#FFD700]/20 text-[#FFD700] border-2 border-[#FFD700]' : 'bg-[#3df2bc]/10 text-[#3df2bc]'}`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-[#E0E6ED] block flex items-center gap-1.5">
                            {p.name}
                            {isVip && <i className="fa-solid fa-star text-[#FFD700] text-[13px]"></i>}
                          </span>
                          <span className={`text-[12px] uppercase font-bold tracking-tighter ${isVip ? 'text-[#FFD700]' : 'text-[#707A8A]'}`}>
                            {isVip ? 'VIP Member' : 'Participant'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeParticipant(p.id)} className="text-[#707A8A] hover:text-[#FF3131] transition-colors px-2 py-1">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-8 border-t border-[#2A2D33]">
              <Button onClick={() => deleteTrip(activeTrip.id)} variant="danger" className="w-full h-12"><i className="fa-solid fa-trash"></i> 安心散水 (Delete)</Button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1A1D23] border-t border-[#2A2D33] z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="w-full max-w-6xl mx-auto px-6 py-4 flex justify-around items-center">
          <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon="fa-receipt" label="Bills" />
          <NavButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon="fa-scale-balanced" label="Status" />
          <NavButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} icon="fa-wallet" label="Wallet" />
          <NavButton active={activeTab === 'members'} onClick={() => setActiveTab('members')} icon="fa-user-group" label="Members" />
        </div>
      </nav>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${active ? 'text-[#3df2bc]' : 'text-[#707A8A]'}`}>
    <div className={`p-2 rounded-xl transition-all ${active ? 'bg-[#3df2bc]/10' : 'bg-transparent'}`}><i className={`fa-solid ${icon} text-lg`}></i></div>
    <span className={`text-[12px] font-black uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const ExpenseItem: React.FC<{ 
  expense: Expense; 
  participants: Participant[]; 
  onToggleSettlement: (eid: string, uid: string) => void;
  onDelete: (id: string) => void;
  onEdit: (exp: Expense) => void;
}> = ({ expense, participants, onToggleSettlement, onDelete, onEdit }) => {
  const payer = participants.find(p => p.id === expense.payerId);
  const perPerson = expense.amount / expense.participants.length;
  const isMultiCurrency = expense.currency !== 'HKD';
  const currencySymbol = expense.currency === 'HKD' ? 'HK$' : expense.currency === 'TWD' ? 'NT$' : expense.currency;

  return (
    <Card className="relative group overflow-hidden border-l-4 border-l-[#3df2bc] !p-3 hover:bg-[#0B0E14] transition-colors cursor-pointer" onClick={() => onEdit(expense)}>
      <div className="pr-8 mb-2">
        <h4 className="font-bold text-[#E0E6ED] leading-tight text-lg flex items-center gap-2">
          {expense.description}
          <i className="fa-solid fa-pen-to-square text-[12px] text-[#707A8A] group-hover:text-[#3df2bc]"></i>
        </h4>
        <p className="text-[13px] text-[#707A8A] mt-1 uppercase font-bold tracking-tighter">
          Payer: <span className="text-[#3df2bc]">{payer?.name || 'Unknown'}</span> • {new Date(expense.date).toLocaleDateString()}
        </p>
        <div className="font-black text-[#E0E6ED] text-lg mt-2">
          {isMultiCurrency ? `${parseFloat(expense.amount.toFixed(2))} ${expense.currency}` : `HK$${parseFloat(expense.amount.toFixed(2))}`}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#2A2D33]">
        {expense.participants.map(ep => {
          const person = participants.find(p => p.id === ep.userId);
          const isPayer = ep.userId === expense.payerId;
          return (
            <button
              key={ep.userId}
              onClick={(e) => { e.stopPropagation(); if (!isPayer) onToggleSettlement(expense.id, ep.userId); }}
              className={`text-[12px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter flex items-center gap-1 transition-all
                ${isPayer ? 'bg-[#3df2bc] text-[#0B0E14] cursor-default' :
                  ep.hasPaidBack ? 'bg-[#3df2bc] text-[#0B0E14]' : 'bg-[#0B0E14] text-[#707A8A] border border-[#2A2D33]'}
              `}
            >
              {person?.name} {ep.hasPaidBack ? <i className="fa-solid fa-check text-[6px]"></i> : !isPayer && <i className="fa-solid fa-clock text-[6px]"></i>}
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-[12px] text-[#707A8A] font-bold uppercase text-right">
        Split: {currencySymbol}{perPerson.toFixed(1)} / pp
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1.5 text-[#707A8A] hover:text-[#FF3131] transition-opacity z-10"
      >
        <i className="fa-solid fa-trash-can text-[12px]"></i>
      </button>
    </Card>
  );
};

export default App;