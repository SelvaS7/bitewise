"use client";

import { useState, useEffect, useRef } from "react";
import { searchFoods, FoodItem, calculateMacros } from "../data/foodDatabase";
import styles from "./FoodSearch.module.css";

interface FoodSearchProps {
  onFoodSelected: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    grams: number;
  }) => void;
  onClose: () => void;
}

// 🔹 Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function FoodSearch({ onFoodSelected, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState<number>(100);
  const [showResults, setShowResults] = useState(false);
  const [currentMacros, setCurrentMacros] = useState<any | null>(null);
  const [loadingMacros, setLoadingMacros] = useState(false);
  const [updatedMacro, setUpdatedMacro] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const NUTRITIONIX_APP_ID = "80e1848e";
  const NUTRITIONIX_APP_KEY = "e7e2aeca0692b9c57ba3cdb6d03ae59f";

  const debouncedGrams = useDebounce(grams, 500);
  const debouncedQuery = useDebounce(query, 500);

  // 🔹 Search Effect
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (debouncedQuery.length >= 2) {
        try {
          const resp = await fetch(`http://127.0.0.1:8000/foods/search?q=${encodeURIComponent(debouncedQuery)}`);
          const data = await resp.json();
          if (!ignore && data.results && data.results.length > 0) {
            setSearchResults(data.results);
            setShowResults(true);
            return;
          }
        } catch (e) {
          console.warn("USDA search failed, trying Nutritionix...");
        }

        try {
          const nutritionixResp = await fetch(
            "https://trackapi.nutritionix.com/v2/search/instant?query=" + encodeURIComponent(debouncedQuery),
            {
              headers: {
                "x-app-id": NUTRITIONIX_APP_ID,
                "x-app-key": NUTRITIONIX_APP_KEY,
              },
            }
          );
          const nData = await nutritionixResp.json();
          if (!ignore && (nData.common?.length > 0 || nData.branded?.length > 0)) {
            const mergedResults = [
              ...(nData.common?.map((item: any) => ({
                id: item.food_name,
                name: item.food_name,
                brand: "Common Food",
              })) || []),
              ...(nData.branded?.map((item: any) => ({
                id: item.nix_item_id,
                name: item.food_name,
                brand: item.brand_name,
              })) || []),
            ];
            setSearchResults(mergedResults);
            setShowResults(true);
            return;
          }
        } catch (err) {
          console.error("Nutritionix fallback failed", err);
        }

        const results = searchFoods(debouncedQuery);
        if (!ignore) {
          setSearchResults(results);
          setShowResults(true);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    };
    run();
    return () => { ignore = true; };
  }, [debouncedQuery]);

  // 🔹 Close results on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔹 Select a food
  const handleFoodSelect = (food: any) => {
    setSelectedFood({
      id: food.id || food.name,
      name: food.name,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      category: food.category || "",
      searchTerms: [],
    } as any);
    setQuery(food.name);
    setShowResults(false);
  };

  // 🔹 Fetch macros dynamically
  useEffect(() => {
    if (!selectedFood) return;

    const fetchMacros = async () => {
      setLoadingMacros(true);

      // 🔹 Backend fetch
      try {
        const resp = await fetch(
          `http://127.0.0.1:8000/foods/macros?id=${encodeURIComponent(selectedFood.id || selectedFood.name)}&grams=${debouncedGrams}`
        );
        if (resp.ok) {
          const data = await resp.json();
          if (data.macros) {
            setCurrentMacros(data.macros);
            setUpdatedMacro(true);
            setTimeout(() => setUpdatedMacro(false), 800);
            setLoadingMacros(false);
            return;
          }
        }
      } catch (e) {
        console.warn("Backend macro fetch failed, falling back to Nutritionix...");
      }

      // 🔹 Nutritionix fallback
      try {
        const nutriResp = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
          method: "POST",
          headers: {
            "x-app-id": NUTRITIONIX_APP_ID,
            "x-app-key": NUTRITIONIX_APP_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: `${selectedFood.name} ${debouncedGrams}g` }),
        });
        const nutriData = await nutriResp.json();
        if (nutriData.foods && nutriData.foods.length > 0) {
          const f = nutriData.foods[0];
          setCurrentMacros({
            calories: f.nf_calories,
            protein: f.nf_protein,
            carbs: f.nf_total_carbohydrate,
            fat: f.nf_total_fat,
            fiber: f.nf_dietary_fiber,
          });
          setUpdatedMacro(true);
          setTimeout(() => setUpdatedMacro(false), 800);
        }
      } catch (err) {
        console.error("Nutritionix macro fetch failed", err);
      } finally {
        setLoadingMacros(false);
      }
    };

    // 🔹 Instant local macros
    const localMacros = calculateMacros(selectedFood, grams);
    setCurrentMacros(localMacros);

    fetchMacros();
  }, [selectedFood, debouncedGrams, grams]);

  // 🔹 Add food to diary
  const handleAddFood = () => {
    if (!selectedFood || !currentMacros) return;

    onFoodSelected({
      name: `${selectedFood.name} (${grams}g)`,
      calories: currentMacros.calories,
      protein: currentMacros.protein,
      carbs: currentMacros.carbs,
      fat: currentMacros.fat,
      fiber: currentMacros.fiber,
      grams,
    });
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Add Food</h3>
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        </div>

        <div className={styles.searchContainer} ref={searchRef}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for food (e.g., chicken, rice, apple...)"
            className={styles.searchInput}
            autoFocus
          />

          {showResults && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((food) => (
                <div
                  key={food.id || food.name}
                  className={styles.resultItem}
                  onClick={() => handleFoodSelect(food)}
                >
                  <div className={styles.foodName}>{food.name}</div>
                  {food.brand && <div className={styles.foodInfo}>Brand: {food.brand}</div>}
                </div>
              ))}
            </div>
          )}

          {showResults && debouncedQuery.length >= 2 && searchResults.length === 0 && (
            <div className={styles.noResults}>
              No foods found. Try different keywords like "chicken breast" or "brown rice".
            </div>
          )}
        </div>

        {selectedFood && (
          <div
            className={`${styles.selectedFood} ${currentMacros ? styles.fadeIn : ""}`}
          >
            <div className={styles.foodDetails}>
              <h4>{selectedFood.name}</h4>
              <p className={styles.category}>Category: {selectedFood.category}</p>
            </div>

            <div className={styles.quantitySection}>
              <label htmlFor="grams">Quantity (grams):</label>
              <input
                id="grams"
                type="number"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                min="1"
                max="2000"
                className={styles.gramsInput}
              />
            </div>

            {currentMacros && (
              <div className={styles.macroPreview}>
                <h4>
                  Nutrition Preview
                  {loadingMacros && <span className={styles.loadingSpinner}></span>}
                </h4>
                <div className={styles.macroGrid}>
                  {["Calories","Protein","Carbs","Fat","Fiber"].map((label) => (
                    <div key={label} className={styles.macroItem}>
                      <span className={styles.macroLabel}>{label}</span>
                      <span className={`${styles.macroValue} ${updatedMacro ? styles.updated : ""}`}>
                        {label==="Calories" ? currentMacros.calories :
                         label==="Protein" ? currentMacros.protein+"g" :
                         label==="Carbs" ? currentMacros.carbs+"g" :
                         label==="Fat" ? currentMacros.fat+"g" :
                         currentMacros.fiber+"g"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
              <button onClick={handleAddFood} className={styles.addBtn}>Add to Diary</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
