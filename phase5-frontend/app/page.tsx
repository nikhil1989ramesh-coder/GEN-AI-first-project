"use client";

import { useState, useEffect } from "react";

export default function Home() {
    const [preferences, setPreferences] = useState({
        place: "",
        cuisine: "",
        price_range: "",
        min_rating: "0.0",
    });

    const [filters, setFilters] = useState({
        places: [] as string[],
        cuisines: [] as string[],
        prices: [] as number[]
    });

    const [loading, setLoading] = useState(false);
    const [recommendation, setRecommendation] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("http://localhost:8000/api/v1/filters")
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
            .catch(err => console.error("Failed to load filters", err));
    }, []);

    const getRecommendation = async () => {
        setLoading(true);
        setError(null);
        setRecommendation(null);

        try {
            const res = await fetch("http://localhost:8000/api/v1/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preferences),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to fetch recommendation");
            } else {
                setRecommendation(data.recommendation);
            }
        } catch (err) {
            setError("Cannot connect to backend server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0E1117] text-white font-sans relative flex flex-col items-center py-12 px-4 selection:bg-[#FF2B6D] selection:text-white">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FF2B6D]/20 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-2xl flex flex-col items-center mt-12">

                {/* Headers */}
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-center">
                    Zomato AI <span className="text-[#FF2B6D]">Recommender</span>
                </h1>
                <p className="text-lg text-neutral-300 tracking-wide text-center mb-6">
                    Helping you find the best places to eat in <span className="text-[#FF2B6D]">Bangalore</span> city
                </p>

                {/* Stats Pill */}
                <div className="flex items-center space-x-4 bg-[#262730] px-6 py-2 rounded-full border border-[#3A3B45] text-sm text-neutral-200 mb-12 shadow-lg">
                    <span>📍 {filters.places.length || 30} Localities</span>
                    <span className="text-neutral-500">|</span>
                    <span>🍴 {filters.cuisines.length || 106} Cuisines</span>
                </div>

                {/* Form Container */}
                <div className="w-full space-y-6 bg-[#0E1117]/80 backdrop-blur-sm p-2 rounded-xl">

                    {/* Locality Dropdown */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center space-x-2 text-neutral-200">
                            <span>📍</span>
                            <span>Select locality <span className="text-[#FF2B6D]">*</span></span>
                        </label>
                        <select
                            value={preferences.place}
                            onChange={(e) => setPreferences({ ...preferences, place: e.target.value })}
                            className="w-full bg-[#262730] border border-[#3A3B45] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#FF2B6D] focus:border-[#FF2B6D] block p-3.5 outline-none transition appearance-none hover:bg-[#2C2D38]"
                        >
                            <option value="" disabled hidden>Select locality...</option>
                            <option value="">Any Locality</option>
                            {filters.places.map((place, i) => (
                                <option key={i} value={place}>{place}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {/* Price Range Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center space-x-2 text-neutral-200">
                                <span>💰</span>
                                <span>Price Range <span className="text-[#FF2B6D]">*</span></span>
                            </label>
                            <select
                                value={preferences.price_range}
                                onChange={(e) => setPreferences({ ...preferences, price_range: e.target.value })}
                                className="w-full bg-[#262730] border border-[#3A3B45] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#FF2B6D] focus:border-[#FF2B6D] block p-3.5 outline-none transition appearance-none hover:bg-[#2C2D38]"
                            >
                                <option value="" disabled hidden>Select price range...</option>
                                <option value="">Any Price</option>
                                <option value="500">Budget (₹ &lt; 500)</option>
                                <option value="1500">Mid-range (₹500 - ₹1500)</option>
                                <option value="99999">Premium (₹ &gt; 1500)</option>
                            </select>
                        </div>

                        {/* Min Rating Stepper */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center space-x-2 text-neutral-200">
                                <span>⭐</span>
                                <span>Min Rating</span>
                            </label>
                            <div className="flex items-center w-full bg-[#262730] border border-[#3A3B45] rounded-lg overflow-hidden hover:bg-[#2C2D38] transition focus-within:ring-1 focus-within:ring-[#FF2B6D] focus-within:border-[#FF2B6D]">
                                <button
                                    onClick={() => setPreferences({ ...preferences, min_rating: Math.max(0, parseFloat(preferences.min_rating) - 0.5).toFixed(1) })}
                                    className="px-4 py-3.5 bg-[#3A3B45]/50 hover:bg-[#3A3B45] text-neutral-300 font-bold transition"
                                >-</button>
                                <input
                                    type="number"
                                    min="0"
                                    max="5"
                                    step="0.1"
                                    value={preferences.min_rating}
                                    onChange={(e) => setPreferences({ ...preferences, min_rating: e.target.value })}
                                    className="w-full bg-transparent text-white text-sm p-3.5 text-center outline-none"
                                />
                                <button
                                    onClick={() => setPreferences({ ...preferences, min_rating: Math.min(5, parseFloat(preferences.min_rating) + 0.5).toFixed(1) })}
                                    className="px-4 py-3.5 bg-[#3A3B45]/50 hover:bg-[#3A3B45] text-neutral-300 font-bold transition"
                                >+</button>
                            </div>
                        </div>
                    </div>

                    {/* Cuisines Dropdown */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold flex items-center space-x-2 text-neutral-200">
                            <span>🍴</span>
                            <span>Cuisines</span>
                        </label>
                        <select
                            value={preferences.cuisine}
                            onChange={(e) => setPreferences({ ...preferences, cuisine: e.target.value })}
                            className="w-full bg-[#262730] border border-[#3A3B45] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#FF2B6D] focus:border-[#FF2B6D] block p-3.5 outline-none transition appearance-none hover:bg-[#2C2D38]"
                        >
                            <option value="" disabled hidden>Select cuisines...</option>
                            <option value="">Any Cuisine</option>
                            {filters.cuisines.map((cuisine, i) => (
                                <option key={i} value={cuisine}>{cuisine}</option>
                            ))}
                        </select>
                    </div>

                </div>

                {/* Error Banner */}
                {error && (
                    <div className="w-full mt-6 p-4 bg-red-900/40 border border-red-500/50 text-red-200 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={getRecommendation}
                    disabled={loading}
                    className="w-full mt-10 py-3.5 bg-[#FF2B6D] hover:bg-[#E01E5A] shadow-[0_0_15px_rgba(255,43,109,0.3)] disabled:opacity-70 disabled:hover:bg-[#FF2B6D] transition rounded-lg font-bold text-white text-base flex justify-center items-center space-x-2 cursor-pointer border border-[#FF2B6D]/50"
                >
                    <span>{loading ? "Searching Data..." : "Get Recommendations"}</span>
                    {!loading && <span>✨</span>}
                </button>

                {/* Recommendations Output */}
                {recommendation && (
                    <div className="mt-12 w-full animate-fade-in-up transition-all duration-500">
                        <div className="bg-[#1E1E24] p-8 border border-[#3A3B45] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                            {/* Decorative top border */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-[#FF2B6D] to-orange-500"></div>

                            <h2 className="text-2xl font-bold mb-6 text-white flex items-center space-x-3">
                                <span>🍽️</span> <span>Your Curated Menu</span>
                            </h2>
                            <div className="prose prose-invert prose-p:text-neutral-300 prose-li:text-neutral-300 prose-strong:text-white max-w-none text-base leading-relaxed whitespace-pre-wrap">
                                {recommendation}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
