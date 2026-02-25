import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Analytics } from "@vercel/analytics/react";
import "./index.css";

// Custom Dropdown Component
function CustomDropdown({ value, onChange, options, placeholder, disabled }: { value: string, onChange: (val: string) => void, options: any[], placeholder: string, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = value ? options.find(o => o.value === value)?.label || value : placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#111111] border border-neutral-800 text-left text-base rounded-2xl p-4 outline-none transition-all focus:ring-1 focus:ring-red-600 focus:border-red-600 flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1a1a1a] text-white'}`}
      >
        <span className={value ? "text-white" : "text-neutral-500"}>{disabled ? 'Loading...' : selectedLabel}</span>
        <svg className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#161616] border border-neutral-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50 max-h-[250px] overflow-y-auto animate-fade-in-up">
            <div className="py-2">
              {options.map((opt, i) => opt.isHeader ? (
                <div key={i} className="px-5 py-2 mt-1 text-xs font-bold text-red-500 uppercase tracking-widest bg-[#111111]">{opt.label}</div>
              ) : (
                <button
                  key={i}
                  type="button"
                  className={`w-full text-left px-5 py-3 hover:bg-[#222222] transition-colors ${value === opt.value ? 'text-red-500 font-medium bg-[#222222]' : 'text-neutral-300'}`}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Custom Multi-Select Dropdown
function CustomMultiSelectDropdown({ values, onChange, options, placeholder, disabled }: { values: string[], onChange: (val: string[]) => void, options: any[], placeholder: string, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSelection = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const getLabel = () => {
    if (disabled) return "Loading...";
    if (values.length === 0) return placeholder;
    if (values.length === 1) return options.find(o => o.value === values[0])?.label || values[0];
    if (values.length <= 3) return values.map(v => options.find(o => o.value === v)?.label || v).join(', ');
    return `${values.length} selections`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#111111] border border-neutral-800 text-left text-base rounded-2xl p-4 outline-none transition-all focus:ring-1 focus:ring-red-600 focus:border-red-600 flex justify-between items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1a1a1a] text-white'}`}
      >
        <span className={values.length > 0 && !disabled ? "text-white truncate pr-4" : "text-neutral-500"}>{getLabel()}</span>
        <svg className={`w-5 h-5 flex-shrink-0 text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-red-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#161616] border border-neutral-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50 max-h-[250px] overflow-y-auto animate-fade-in-up">
            <div className="py-2">
              {options.map((opt, i) => {
                const isSelected = values.includes(opt.value);
                return (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-5 py-3 hover:bg-[#222222] transition-colors flex items-center space-x-3"
                    onClick={() => toggleSelection(opt.value)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-neutral-600 bg-transparent'}`}>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={isSelected ? 'text-red-400 font-medium' : 'text-neutral-300'}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            {values.length > 0 && (
              <div className="sticky bottom-0 bg-[#161616] border-t border-neutral-800 p-3">
                <button
                  onClick={() => onChange([])}
                  className="w-full py-2 text-sm text-neutral-400 hover:text-white transition-colors uppercase font-bold tracking-wider"
                >
                  Clear Selections ({values.length})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [preferences, setPreferences] = useState({
    place: "",
    cuisines: [] as string[],
    price_range: "",
    min_rating: "0.0",
  });

  const [filters, setFilters] = useState({
    places: [] as string[],
    cuisines: [] as string[],
    prices: [] as number[]
  });

  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/filters")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFilters({
            places: data.places || [],
            cuisines: data.cuisines || [],
            prices: data.prices || []
          });
        }
      })
      .catch(err => console.error("Failed to load filters", err))
      .finally(() => setLoadingFilters(false));
  }, []);

  const getRecommendation = async () => {
    setLoading(true);
    setError(null);
    setRecommendation(null);

    if (!preferences.place && preferences.cuisines.length === 0) {
      setError("Please provide at least a 'place' or select a 'cuisine' to get a recommendation.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch recommendation.");
      } else {
        setRecommendation(data.recommendation);
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      setError("Cannot connect to backend server. Please verify it is running.");
    } finally {
      setLoading(false);
    }
  };

  const placeOptions = filters.places.map(p => ({ label: p, value: p }));
  const cuisineOptions = filters.cuisines.map(c => ({ label: c, value: c }));
  const priceOptions = [
    { label: 'Budget: < ₹500', value: '500' },
    { label: 'Standard: ₹500 - ₹1500', value: '1500' },
    { label: 'Luxury: > ₹1500', value: '99999' },
  ];

  return (
    <main className="min-h-screen bg-[#000000] text-neutral-200 font-sans relative flex flex-col items-center py-6 px-6 sm:px-12 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* Sleek Gradient Mesh Background - Deep Crimson / Zomato Vibe */}
      <div className="fixed top-0 inset-x-0 h-[400px] pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-[#000000] to-[#000000] opacity-70 z-0"></div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center mt-2">

        {/* Header Section */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-neutral-900/80 border border-neutral-800 px-4 py-2 rounded-full mb-2 backdrop-blur-sm shadow-[0_0_15px_rgba(220,38,38,0.15)]">
            <span className={`w-2 h-2 rounded-full ${loadingFilters ? 'bg-amber-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]'} animate-pulse`}></span>
            <span className="text-xs font-semibold tracking-wide text-neutral-300 uppercase">
              {loadingFilters ? 'Initializing Databanks...' : 'Start your dining journey'}
            </span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter text-white">
            Zomato <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">Gen-AI</span>
          </h1>
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Discover your next dining experience. Tell us what you're craving, and our AI will handpick the ideal dining destinations based on your unique tastes.
          </p>
          <div className="flex justify-center items-center space-x-6 text-sm font-medium text-neutral-500 pt-3">
            <span className="flex items-center space-x-2 bg-[#0a0a0a] border border-neutral-800 px-3 py-1.5 rounded-lg">
              <span className="text-lg">📍</span><span className="text-red-100">{loadingFilters ? '...' : filters.places.length} Localities</span>
            </span>
            <span className="h-6 w-[1px] bg-neutral-800"></span>
            <span className="flex items-center space-x-2 bg-[#0a0a0a] border border-neutral-800 px-3 py-1.5 rounded-lg">
              <span className="text-lg">🍴</span><span className="text-rose-100">{loadingFilters ? '...' : filters.cuisines.length} Cuisines</span>
            </span>
          </div>
        </div>

        {/* Central UI Form Container */}
        <div className="w-full bg-[#0a0a0a]/90 backdrop-blur-xl border border-neutral-800/80 rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

            <div className="space-y-3">
              <label className="text-sm font-semibold tracking-wide text-neutral-300 uppercase flex items-center justify-between">
                <span>Where are you heading? <span className="text-red-500">*</span></span>
              </label>
              <CustomDropdown
                value={preferences.place}
                onChange={(val) => setPreferences({ ...preferences, place: val })}
                options={placeOptions}
                placeholder="Choose a neighborhood"
                disabled={loadingFilters}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold tracking-wide text-neutral-300 uppercase flex items-center justify-between">
                <span>Select favorite cuisines</span>
              </label>
              <CustomMultiSelectDropdown
                values={preferences.cuisines}
                onChange={(vals) => setPreferences({ ...preferences, cuisines: vals })}
                options={cuisineOptions}
                placeholder="Select cuisines... (Multi-Select)"
                disabled={loadingFilters}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold tracking-wide text-neutral-300 uppercase flex items-center justify-between">
                <span>Choose your budget <span className="text-red-500">*</span></span>
              </label>
              <CustomDropdown
                value={preferences.price_range}
                onChange={(val) => setPreferences({ ...preferences, price_range: val })}
                options={priceOptions}
                placeholder="Select your budget"
                disabled={loadingFilters}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold tracking-wide text-neutral-300 uppercase flex items-center justify-between">
                <span>Minimum rating</span>
                <span className="text-neutral-500 font-normal normal-case text-xs">Out of 5.0</span>
              </label>
              <div className={`flex items-center w-full bg-[#111111] border border-neutral-800 rounded-2xl overflow-hidden transition-all focus-within:ring-1 focus-within:ring-red-600 focus-within:border-red-600 h-[58px] ${loadingFilters ? 'opacity-50 pointer-events-none' : 'hover:bg-[#1a1a1a]'}`}>
                <button
                  onClick={() => setPreferences({ ...preferences, min_rating: Math.max(0, parseFloat(preferences.min_rating) - 0.5).toFixed(1) })}
                  className="px-6 h-full bg-neutral-900/50 hover:bg-neutral-800 text-neutral-300 hover:text-red-500 font-medium transition-colors cursor-pointer text-xl border-r border-neutral-800"
                  type="button"
                >-</button>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={preferences.min_rating}
                  onChange={(e) => setPreferences({ ...preferences, min_rating: e.target.value })}
                  className="w-full h-full bg-transparent text-white text-lg font-semibold px-4 text-center outline-none selection:bg-blue-600"
                  disabled={loadingFilters}
                />
                <button
                  onClick={() => setPreferences({ ...preferences, min_rating: Math.min(5, parseFloat(preferences.min_rating) + 0.5).toFixed(1) })}
                  className="px-6 h-full bg-neutral-900/50 hover:bg-neutral-800 text-neutral-300 hover:text-emerald-500 font-medium transition-colors cursor-pointer text-xl border-l border-neutral-800"
                  type="button"
                >+</button>
              </div>
            </div>

          </div>

          <div className="mt-10">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center font-medium shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                {error}
              </div>
            )}

            <button
              onClick={getRecommendation}
              disabled={loading || loadingFilters}
              className="w-full py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all rounded-2xl font-bold tracking-wide text-lg flex justify-center items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating Results...</span>
                </>
              ) : (
                <span>Discover Best Dining Spots</span>
              )}
            </button>
          </div>
        </div>

        {recommendation && (
          <div ref={resultsRef} className="scroll-mt-6 mt-12 w-full animate-fade-in-up mb-24">

            <div className="flex flex-col items-center justify-center space-y-6 mb-8">
              <h2 className="text-3xl font-bold text-neutral-100 flex items-center justify-center space-x-3">
                <span>🍽️</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-rose-200">Your Curated Itinerary</span>
              </h2>
            </div>

            <div className="w-full overflow-x-auto transition-all duration-300 bg-[#0a0a0a]/80 p-6 sm:p-10 rounded-3xl border border-neutral-800/50">

              {/* Dynamic Theme Wrapping */}
              <article className={`prose prose-invert prose-neutral max-w-none 
                prose-h3:hidden
                [&_table]:block [&_table]:w-full
                [&_thead]:hidden
                [&_tbody]:grid [&_tbody]:grid-cols-1 md:[&_tbody]:grid-cols-2 lg:[&_tbody]:grid-cols-3 [&_tbody]:gap-6
                
                [&_tr]:flex [&_tr]:flex-col [&_tr]:bg-white [&_tr]:rounded-2xl [&_tr]:overflow-hidden [&_tr]:shadow-[0_8px_24px_rgba(0,0,0,0.5)] [&_tr]:transition-all hover:[&_tr]:shadow-[0_12px_32px_rgba(0,0,0,0.8)] hover:[&_tr]:-translate-y-1 [&_tr]:relative [&_tr]:border [&_tr]:border-neutral-800

                /* Top Image & Overlay Area */
                [&_td]:block [&_td]:border-0 [&_td]:px-4 [&_td]:py-1 [&_td]:text-left
                [&_td:nth-child(1)]:relative [&_td:nth-child(1)]:h-48 [&_td:nth-child(1)]:w-full [&_td:nth-child(1)]:px-4 [&_td:nth-child(1)]:pt-32 [&_td:nth-child(1)]:pb-4 [&_td:nth-child(1)]:bg-cover [&_td:nth-child(1)]:bg-center [&_td:nth-child(1)]:bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000&auto=format&fit=crop')] [&_td:nth-child(1)]:before:absolute [&_td:nth-child(1)]:before:inset-0 [&_td:nth-child(1)]:before:bg-gradient-to-t [&_td:nth-child(1)]:before:from-black/90 [&_td:nth-child(1)]:before:to-transparent [&_td:nth-child(1)]:before:content-['']
                [&_td:nth-child(1)]:!text-2xl [&_td:nth-child(1)]:!font-extrabold [&_td:nth-child(1)]:!text-white [&_td:nth-child(1)_*]:!text-white [&_td:nth-child(1)_*]:relative [&_td:nth-child(1)_*]:z-10 [&_td:nth-child(1)]:leading-tight [&_td:nth-child(1)]:tracking-tight [&_td:nth-child(1)]:drop-shadow-md

                /* Info Context Body */
                [&_td:nth-child(2)]:mt-4 [&_td:nth-child(2)]:mb-2 [&_td:nth-child(2)]:text-[15px] [&_td:nth-child(2)]:!text-neutral-500 [&_td:nth-child(2)]:font-medium [&_td:nth-child(2)]:leading-relaxed [&_td:nth-child(2)]:line-clamp-2
                
                /* Rating Pill */
                [&_td:nth-child(3)]:flex [&_td:nth-child(3)]:items-center [&_td:nth-child(3)]:space-x-1 [&_td:nth-child(3)]:text-sm [&_td:nth-child(3)]:!font-bold [&_td:nth-child(3)]:mt-1 [&_td:nth-child(3)]:!text-emerald-700
                [&_td:nth-child(3)]:before:content-['★'] [&_td:nth-child(3)]:before:mr-1 [&_td:nth-child(3)]:before:text-[10px] [&_td:nth-child(3)]:before:text-white [&_td:nth-child(3)]:before:bg-emerald-600 [&_td:nth-child(3)]:before:rounded-full [&_td:nth-child(3)]:before:px-1.5 [&_td:nth-child(3)]:before:py-0.5
                
                /* Cost */
                [&_td:nth-child(4)]:!text-neutral-900 [&_td:nth-child(4)]:!font-extrabold [&_td:nth-child(4)]:text-base [&_td:nth-child(4)]:pb-20 [&_td:nth-child(4)]:pt-2
                [&_td:nth-child(4)]:after:content-['_for_two'] [&_td:nth-child(4)]:after:text-sm [&_td:nth-child(4)]:after:!text-neutral-500 [&_td:nth-child(4)]:after:font-medium

                /* Cost Banner on TR */
                [&_tr]:after:content-['FLAT_20%_OFF_ON_ALL_ORDERS'] [&_tr]:after:absolute [&_tr]:after:bottom-4 [&_tr]:after:left-4 [&_tr]:after:right-4 [&_tr]:after:bg-gradient-to-r [&_tr]:after:from-[#118c4f] [&_tr]:after:to-[#0e703f] [&_tr]:after:text-white [&_tr]:after:font-bold [&_tr]:after:text-sm [&_tr]:after:px-3 [&_tr]:after:py-3 [&_tr]:after:rounded-xl [&_tr]:after:text-center [&_tr]:after:shadow-lg
              `}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{recommendation}</ReactMarkdown>
              </article>
            </div>
          </div>
        )}

      </div>
      <Analytics />
    </main>
  );
}
