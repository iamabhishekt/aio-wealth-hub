import React, { useState, useEffect } from 'react';
import { 
  CategoryGroupWithCategories, 
  Category, 
  Currency 
} from '../types';
import {
  FolderTree,
  Plus,
  Check,
  X,
  TrendingUp,
  RotateCcw,
  Wallet,
  Coins,
  Home,
  Zap,
  Wifi,
  Shield,
  ShoppingCart,
  Utensils,
  Coffee,
  Package,
  Tv,
  Plane,
  Fuel,
  Building,
  Car,
  PiggyBank,
  ShieldCheck,
  CreditCard,
  Globe,
  ArrowRightLeft,
  Tag,
  Pencil,
  Sparkles,
  Trash2,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

export interface MerchantRule {
  id: string;
  pattern: string;
  match_type: string;
  clean_merchant: string;
  category_name: string;
  created_at: string;
}

interface Props {
  currency: Currency;
  fxRate: number;
}

export const CategoryHierarchyManager: React.FC<Props> = ({ currency, fxRate }) => {
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'rules'>('taxonomy');
  const [hierarchy, setHierarchy] = useState<CategoryGroupWithCategories[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editBudgetAmount, setEditBudgetAmount] = useState<string>('');
  
  // Merchant Rules state
  const [rules, setRules] = useState<MerchantRule[]>([]);
  const [isApplyingRules, setIsApplyingRules] = useState<boolean>(false);
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const [showAddRuleModal, setShowAddRuleModal] = useState<boolean>(false);
  const [newRulePattern, setNewRulePattern] = useState<string>('');
  const [newRuleClean, setNewRuleClean] = useState<string>('');
  const [newRuleCategory, setNewRuleCategory] = useState<string>('Groceries');
  
  // New category creation state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [targetGroupId, setTargetGroupId] = useState<string>('grp_lifestyle');
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatBudget, setNewCatBudget] = useState<string>('');

  const fetchRules = async () => {
    try {
      const res = await fetch('http://localhost:8088/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to load merchant rules:', err);
    }
  };

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8088/api/categories');
      if (res.ok) {
        const data = await res.json();
        setHierarchy(data);
      }
    } catch (err) {
      console.error('Failed to load category hierarchy:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
    fetchRules();
  }, []);

  const handleApplyAllRules = async () => {
    try {
      setIsApplyingRules(true);
      nativeBridge.triggerHaptic('medium');
      const res = await fetch('http://localhost:8088/api/rules/apply', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        nativeBridge.triggerHaptic('success');
        setRuleMessage(`Successfully cleansed & updated ${data.transactions_updated} transactions across the ledger!`);
        setTimeout(() => setRuleMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to apply rules:', err);
    } finally {
      setIsApplyingRules(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      nativeBridge.triggerHaptic('medium');
      const res = await fetch(`http://localhost:8088/api/rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        nativeBridge.triggerHaptic('success');
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRulePattern.trim() || !newRuleClean.trim()) return;

    try {
      const res = await fetch('http://localhost:8088/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern: newRulePattern.trim(),
          match_type: 'contains',
          clean_merchant: newRuleClean.trim(),
          category_name: newRuleCategory,
          apply_to_existing: true,
        }),
      });
      if (res.ok) {
        nativeBridge.triggerHaptic('success');
        setShowAddRuleModal(false);
        setNewRulePattern('');
        setNewRuleClean('');
        fetchRules();
        setRuleMessage(`Rule created and applied across past & future transactions!`);
        setTimeout(() => setRuleMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to create rule:', err);
    }
  };

  const formatMoney = (valUsd: number) => {
    const isUSD = currency === 'USD';
    const amount = isUSD ? valUsd : valUsd * fxRate;
    return new Intl.NumberFormat(isUSD ? 'en-US' : 'en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'wallet': return <Wallet className="w-4 h-4" />;
      case 'trendingup': return <TrendingUp className="w-4 h-4" />;
      case 'rotateccw': return <RotateCcw className="w-4 h-4" />;
      case 'coins': return <Coins className="w-4 h-4" />;
      case 'home': return <Home className="w-4 h-4" />;
      case 'zap': return <Zap className="w-4 h-4" />;
      case 'wifi': return <Wifi className="w-4 h-4" />;
      case 'shield': return <Shield className="w-4 h-4" />;
      case 'shoppingcart': return <ShoppingCart className="w-4 h-4" />;
      case 'utensils': return <Utensils className="w-4 h-4" />;
      case 'coffee': return <Coffee className="w-4 h-4" />;
      case 'package': return <Package className="w-4 h-4" />;
      case 'tv': return <Tv className="w-4 h-4" />;
      case 'plane': return <Plane className="w-4 h-4" />;
      case 'fuel': return <Fuel className="w-4 h-4" />;
      case 'building': return <Building className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      case 'piggybank': return <PiggyBank className="w-4 h-4" />;
      case 'shieldcheck': return <ShieldCheck className="w-4 h-4" />;
      case 'creditcard': return <CreditCard className="w-4 h-4" />;
      case 'globe': return <Globe className="w-4 h-4" />;
      case 'arrowrightleft': return <ArrowRightLeft className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const handleSaveBudget = async (cat: Category) => {
    const budgetNum = parseFloat(editBudgetAmount);
    const updated: Category = {
      ...cat,
      budget_amount: isNaN(budgetNum) ? null : budgetNum,
    };

    try {
      const res = await fetch('http://localhost:8088/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        nativeBridge.triggerHaptic('success');
        setEditingCategoryId(null);
        fetchHierarchy();
      }
    } catch (err) {
      console.error('Failed to update category budget:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: `cat_custom_${Date.now()}`,
      group_id: targetGroupId,
      name: newCatName.trim(),
      icon: 'Tag',
      is_system: false,
      budget_amount: newCatBudget ? parseFloat(newCatBudget) : null,
    };

    try {
      const res = await fetch('http://localhost:8088/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      });
      if (res.ok) {
        nativeBridge.triggerHaptic('success');
        setShowAddModal(false);
        setNewCatName('');
        setNewCatBudget('');
        fetchHierarchy();
      }
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl sm:rounded-4xl bg-gradient-to-br from-vault-900 via-vault-850 to-vault-900 border border-slate-800/80 card-glow shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-400/30">
            <FolderTree className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Monarch 3-Tier Category Hierarchy
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
                GAAP-Structured
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Parent Category Groups $\rightarrow$ Subcategories $\rightarrow$ Auto-Categorized Transactions.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Category</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-vault-800 pb-3">
        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('taxonomy');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'taxonomy'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-vault-900/50 border border-transparent'
          }`}
        >
          <FolderTree className="w-4 h-4 text-purple-400" />
          <span>Category Taxonomy & Budgets ({hierarchy.reduce((acc, g) => acc + g.categories.length, 0)})</span>
        </button>

        <button
          onClick={() => {
            nativeBridge.triggerHaptic('light');
            setActiveTab('rules');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-vault-900/50 border border-transparent'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Merchant Rules & Cleanser ({rules.length} Rules Active)</span>
        </button>
      </div>

      {ruleMessage && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{ruleMessage}</span>
          </div>
          <button onClick={() => setRuleMessage(null)} className="text-cyan-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: Groups & Subcategories List */}
      {activeTab === 'taxonomy' && (
        <>
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading 3-tier category taxonomy...
            </div>
          ) : (
            <div className="space-y-5">
          {hierarchy.map(({ group, categories }) => {
            const groupBudgetSum = categories.reduce(
              (acc, c) => acc + (c.budget_amount || 0),
              0
            );

            return (
              <div
                key={group.id}
                className="p-5 sm:p-6 rounded-3xl bg-vault-900/80 border border-slate-800/80 shadow-md space-y-4"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {group.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono uppercase">
                        {group.group_type} group • {categories.length} categories
                      </span>
                    </div>
                  </div>

                  {group.group_type === 'expense' && groupBudgetSum > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">
                        Planned Monthly Cap
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-200">
                        {formatMoney(groupBudgetSum)}/mo
                      </span>
                    </div>
                  )}
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const isEditing = editingCategoryId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className="p-3.5 rounded-2xl bg-vault-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="p-2 rounded-xl border flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${group.color}15`,
                              borderColor: `${group.color}35`,
                              color: group.color,
                            }}
                          >
                            {getCategoryIcon(cat.icon)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {cat.name}
                            </h4>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {cat.is_system ? 'Standard' : 'Custom'}
                            </span>
                          </div>
                        </div>

                        {/* Budget Allocation or Edit Form */}
                        <div className="text-right shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editBudgetAmount}
                                onChange={(e) => setEditBudgetAmount(e.target.value)}
                                placeholder="0"
                                className="w-16 px-1.5 py-1 rounded bg-vault-900 border border-purple-500 text-xs font-mono text-white text-right focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveBudget(cat)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditBudgetAmount(
                                  cat.budget_amount ? cat.budget_amount.toString() : ''
                                );
                              }}
                              className="cursor-pointer flex items-center gap-1.5 text-slate-400 hover:text-purple-300 transition-colors"
                              title="Click to edit planned monthly target"
                            >
                              <span className="text-xs font-mono font-bold text-slate-300">
                                {cat.budget_amount
                                  ? formatMoney(cat.budget_amount)
                                  : '—'}
                              </span>
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}

  {/* VIEW 2: Merchant Cleansing & Auto-Categorization Rules */}
  {activeTab === 'rules' && (
    <div className="space-y-6">
      {/* Rules Action Banner */}
      <div className="p-6 rounded-3xl bg-vault-900/60 border border-white/[0.06] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Merchant Cleansing & Auto-Categorization Engine
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              {rules.length} Rules Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Normalizes raw bank strings into clean brand names and automatically assigns standard categories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleApplyAllRules}
            disabled={isApplyingRules}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isApplyingRules ? 'animate-spin' : ''}`} />
            <span>{isApplyingRules ? 'Cleansing Ledger...' : 'Re-apply All Rules'}</span>
          </button>

          <button
            onClick={() => setShowAddRuleModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-1 rounded-2xl bg-vault-900/40 border border-white/[0.06] hover:border-cyan-500/30 transition-all"
          >
            <div className="p-4 rounded-[14px] bg-[#0d1424]/90 border border-white/[0.04] space-y-3 shadow-inner">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Pattern (Contains)</span>
                  <code className="text-xs font-mono font-bold text-cyan-300 bg-vault-950 px-2 py-0.5 rounded border border-cyan-900/50">
                    {rule.pattern}
                  </code>
                </div>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">$\rightarrow$</span>
                <span className="font-bold text-white truncate">{rule.clean_merchant}</span>
              </div>

              <div className="pt-2 border-t border-vault-800/80 flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                  {rule.category_name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">Auto-Tagged</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Add Rule Modal */}
  {showAddRuleModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-vault-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Create Merchant Rule</h3>
          </div>
          <button
            onClick={() => setShowAddRuleModal(false)}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Raw Text Pattern to Match
            </label>
            <input
              type="text"
              placeholder="e.g. NETFLIX, UBER *EATS, SHELL OIL"
              value={newRulePattern}
              onChange={(e) => setNewRulePattern(e.target.value)}
              className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Clean Display Merchant Name
            </label>
            <input
              type="text"
              placeholder="e.g. Netflix, Uber Eats, Shell"
              value={newRuleClean}
              onChange={(e) => setNewRuleClean(e.target.value)}
              className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Auto-Assign Category
            </label>
            <select
              value={newRuleCategory}
              onChange={(e) => setNewRuleCategory(e.target.value)}
              className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              {hierarchy.flatMap((g) => g.categories).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddRuleModal(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-md shadow-cyan-600/20"
            >
              Save & Apply Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Add Custom Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-vault-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Custom Category</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Parent Category Group
                </label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {hierarchy.map(({ group }) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.group_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Category Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pet Care, EV Charging, Freelance Side Gig"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Planned Monthly Budget ($ USD)
                </label>
                <input
                  type="number"
                  placeholder="Optional monthly cap e.g. 150"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  className="w-full bg-vault-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-md shadow-purple-600/20"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
