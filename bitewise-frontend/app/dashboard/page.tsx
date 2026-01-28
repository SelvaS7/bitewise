"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import FoodSearch from "../../components/FoodSearch";
import { foodDatabase, calculateMacros, getFoodById } from "../../data/foodDatabase";

interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  timestamp: string;
}

interface UserProfile {
  name: string;
  age: number;
  gender: "male" | "female";
  weight: number;
  height: number;
  activityLevel: string;
  goal: string;
  weightChangeRate: string;
  calories: {
    maintenance: number;
    target: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    weeklyWeightChange: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [predictedMeal, setPredictedMeal] = useState<any>(null);
  const [isPredicted, setIsPredicted] = useState(false);

  const [weeklyCalories, setWeeklyCalories] = useState<{ date: string; calories: number }[]>([]);
  const [warning, setWarning] = useState("");

  // Load user profile and redirect if not found
  useEffect(() => {
    const savedProfile = localStorage.getItem("userProfile");
    if (!savedProfile) {
      router.push("/onboarding");
      return;
    }
    setUserProfile(JSON.parse(savedProfile));

    const savedMeals = localStorage.getItem("meals");
    if (savedMeals) setMeals(JSON.parse(savedMeals));

    const savedWeekly = localStorage.getItem("weeklyCalories");
    if (savedWeekly) setWeeklyCalories(JSON.parse(savedWeekly));
  }, [router]);

  // Save meals & weekly data to localStorage
  useEffect(() => {
    localStorage.setItem("meals", JSON.stringify(meals));
    localStorage.setItem("weeklyCalories", JSON.stringify(weeklyCalories));
  }, [meals, weeklyCalories]);

  // Calculate daily totals
  const caloriesConsumed = meals.reduce((acc, m) => acc + m.calories, 0);
  const proteinConsumed = meals.reduce((acc, m) => acc + m.protein, 0);
  const carbsConsumed = meals.reduce((acc, m) => acc + m.carbs, 0);
  const fatConsumed = meals.reduce((acc, m) => acc + m.fat, 0);
  const fiberConsumed = meals.reduce((acc, m) => acc + m.fiber, 0);

  const dailyGoal = userProfile?.calories.target || 2000;
  const proteinGoal = userProfile?.calories.protein || 150;
  const carbsGoal = userProfile?.calories.carbs || 250;
  const fatGoal = userProfile?.calories.fat || 67;
  const fiberGoal = userProfile?.calories.fiber || 25;

  const remainingCalories = Math.max(dailyGoal - caloriesConsumed, 0);
  const progressPercent = Math.min((caloriesConsumed / dailyGoal) * 100, 100);

  // Recommendation helper: compute macro gaps and suggest foods
  const macroGaps = {
    protein: Math.max(proteinGoal - proteinConsumed, 0),
    carbs: Math.max(carbsGoal - carbsConsumed, 0),
    fat: Math.max(fatGoal - fatConsumed, 0),
    fiber: Math.max(fiberGoal - fiberConsumed, 0),
  };

  type ScoredFood = { id: string; name: string; grams: number; score: number; preview: { calories:number; protein:number; carbs:number; fat:number; fiber:number } };

  const recommendationFoods: ScoredFood[] = (() => {
    // Aim 200g default, then clip 50-200g based on density
    const targetGrams = 150;
    const scored: ScoredFood[] = foodDatabase.map((item) => {
      const m = calculateMacros(item, targetGrams);
      // Weighted score toward the biggest gaps
      const score =
        (macroGaps.protein > 0 ? Math.min(m.protein, macroGaps.protein) * 3 : 0) +
        (macroGaps.fiber > 0 ? Math.min(m.fiber, macroGaps.fiber) * 2 : 0) +
        (macroGaps.carbs > 0 ? Math.min(m.carbs, macroGaps.carbs) * 1 : 0) +
        (macroGaps.fat > 0 ? Math.min(m.fat, macroGaps.fat) * 1 : 0);
      return { id: item.id, name: item.name, grams: targetGrams, score, preview: m };
    });
    return scored
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  })();

  const handleAddRecommendation = (foodId: string, grams: number) => {
    const item = getFoodById(foodId);
    if (!item) return;
    const m = calculateMacros(item, grams);
    handleFoodSelected({
      name: `${item.name} (${grams}g)`,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      fiber: m.fiber,
    });
  };



  // Add meal from food search
  const handleFoodSelected = (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }) => {
    const newMeal: Meal = {
      ...food,
      timestamp: new Date().toISOString(),
    };
    setMeals([...meals, newMeal]);

    // Update weekly calories
    const todayStr = new Date().toISOString().slice(0, 10);
    setWeeklyCalories((prev) => {
      const updated = [...prev];
      const todayIndex = updated.findIndex((item) => item.date === todayStr);
      if (todayIndex >= 0) {
        const todayItem = updated[todayIndex];
        updated[todayIndex] = { ...todayItem, calories: todayItem.calories + food.calories };
      } else {
        updated.push({ date: todayStr, calories: food.calories });
      }
      return updated;
    });
  };

  // Add meal (legacy manual entry)
  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();

    // Allow adding either the predicted meal or a manual entry
    const manualCalories = mealCalories ? Number(mealCalories) : 0;

    const mealToAdd: Meal | null = predictedMeal
      ? predictedMeal
      : mealName && mealCalories
      ? {
          name: mealName,
          calories: manualCalories,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          timestamp: new Date().toISOString(),
        }
      : null;

    if (!mealToAdd) {
      alert("Please predict calories first or enter a meal name and calories");
      return;
    }

    // Add meal
    setMeals((prev) => [...prev, mealToAdd]);

    // Update weekly calories
    const today = new Date().toISOString().slice(0, 10);
    setWeeklyCalories((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((d) => d.date === today);

      if (index >= 0) {
        updated[index] = { ...updated[index], calories: updated[index].calories + (mealToAdd.calories || 0) };
      } else {
        updated.push({ date: today, calories: mealToAdd.calories || 0 });
      }
      return updated;
    });

    // Reset modal state
    setPredictedMeal(null);
    setIsPredicted(false);
    setUploadedImage(null);
    setImagePreview(null);
    setMealName("");
    setMealCalories("");
    setShowPopup(false);
  };

   

  // Remove meal
  const removeMeal = (index: number) => {
    const removedMeal = meals[index];
    const newMeals = [...meals];
    newMeals.splice(index, 1);
    setMeals(newMeals);

    // Update weeklyCalories
    const todayStr = new Date().toISOString().slice(0, 10);
    setWeeklyCalories((prev) =>
      prev.map((item) =>
        item.date === todayStr
          ? { ...item, calories: Math.max(item.calories - removedMeal.calories, 0) }
          : item
      )
    );
  };

  // Image upload preview
  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    setUploadedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Predict calories using YOLOv8 backend
  const handlePredictCalories = async () => {
    if (!uploadedImage) return;
    
    const formData = new FormData();
    formData.append("file", uploadedImage);

    try {
      const res = await fetch("http://127.0.0.1:8000/predict-calories", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      const nutrition = data.totalNutrition;

      const meal = {
        name: data.mealName || data.predictedClasses.join(" + "),
        calories: Math.round(nutrition.calories),
        protein: Math.round(nutrition.protein),
        carbs: Math.round(nutrition.carbs),
        fat: Math.round(nutrition.fat),
        fiber: Math.round(nutrition.fiber),
        timestamp: new Date().toISOString(),
      };

    // ✅ STORE PREDICTION ONLY
      setPredictedMeal(meal);
      setIsPredicted(true);

    // ✅ Prefill inputs
      setMealName(meal.name);
      setMealCalories(meal.calories.toString());
    } catch (err) {
      console.error(err);
      alert("Prediction failed");
    }
  };

  // Macro pie chart data
  // Macro pie chart data (include fiber as a separate slice). We approximate fiber energy at 2 kcal/g for visualization.
  const macroData = [
    { name: 'Protein', value: proteinConsumed * 4, fill: '#ff6b6b' },
    { name: 'Carbs', value: carbsConsumed * 4, fill: '#ffb86b' },
    { name: 'Fat', value: fatConsumed * 9, fill: '#4ecdc4' },
    { name: 'Fiber', value: fiberConsumed * 2, fill: '#a78bfa' },
  ];

  // Show warning near the daily progress when calories approach or exceed the daily goal
  useEffect(() => {
    if (!userProfile) return;

    if (caloriesConsumed >= dailyGoal) {
      const over = caloriesConsumed - dailyGoal;
      if (over > 0) {
        setWarning(`Daily target exceeded by ${Math.round(over)} cal`);
      } else {
        setWarning(`You've reached your daily calorie target (${dailyGoal} cal)`);
      }
    } else if (caloriesConsumed >= dailyGoal * 0.9) {
      setWarning(`You're close to your daily target (${Math.round(progressPercent)}%)`);
    } else {
      setWarning("");
    }
  }, [caloriesConsumed, dailyGoal, progressPercent, userProfile]);

  if (!userProfile) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Welcome back, {userProfile.name}! 👋</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => router.push("/chat")}
            className={styles.editProfileBtn}
          >
            AI Chat
          </button>
          <button 
            onClick={() => router.push("/onboarding")}
            className={styles.editProfileBtn}
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className={styles.goalCard}>
        <div className={styles.goalInfo}>
          <h3>Your Goal: {userProfile.goal.replace('_', ' ').toUpperCase()}</h3>
          <p>
            {userProfile.calories.weeklyWeightChange > 0 ? '+' : ''}
            {userProfile.calories.weeklyWeightChange}kg per week
          </p>
        </div>
      </div>
<div className={styles.progressWrapper}>
  <div className={styles.progressHeader}>
    <span className={styles.progressLabel}>Daily Progress</span>
    <span className={styles.progressPercent}>
      {Math.round(progressPercent)}%
    </span>
  </div>

  <div className={styles.progressBar}>
    <div
      className={styles.progressFill}
      style={{
        width: `${progressPercent}%`,
        background:
          progressPercent < 80
            ? "#4caf50"
            : progressPercent < 100
            ? "#ff9800"
            : "#f44336",
      }}
    />
  </div>

  {/* 🔔 Warning / Info message */}
  {warning && (
    <div
      className={`${styles.progressWarning} ${
        caloriesConsumed > dailyGoal
          ? styles.warningDanger
          : styles.warningInfo
      }`}
    >
      {warning}
    </div>
  )}
</div>


      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <h3>Calories</h3>
          <p className={styles.mainValue}>{caloriesConsumed}</p>
          <p className={styles.subValue}>/ {dailyGoal} goal</p>
        </div>
        <div className={styles.card}>
          <h3>Protein</h3>
          <p className={styles.mainValue}>{Math.round(proteinConsumed)}g</p>
          <p className={styles.subValue}>/ {proteinGoal}g goal</p>
        </div>
        <div className={styles.card}>
          <h3>Carbs</h3>
          <p className={styles.mainValue}>{Math.round(carbsConsumed)}g</p>
          <p className={styles.subValue}>/ {carbsGoal}g goal</p>
        </div>
        <div className={styles.card}>
          <h3>Fat</h3>
          <p className={styles.mainValue}>{Math.round(fatConsumed)}g</p>
          <p className={styles.subValue}>/ {fatGoal}g goal</p>
        </div>
      </div>
      <div className={styles.addMealButtons}>
        <button 
          className={styles.addMealBtn}
          onClick={() => setShowFoodSearch(true)}
        >
          ✚ Add Food
        </button>
        <button 
          className={styles.addMealBtn}
          onClick={() => setShowPopup(true)}
        >
          📸 Upload Image
        </button>
      </div>
      {/* Macro Progress Bars */}
      <div className={styles.macroProgress}>
        <h3>Daily Macro Progress</h3>
        <div className={styles.progressBars}>
          <div className={styles.macroBar}>
            <div className={styles.macroHeader}>
              <span>Protein</span>
              <span>{Math.round(proteinConsumed)}/{proteinGoal}g</span>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFillProtein}
                style={{ width: `${Math.min((proteinConsumed / proteinGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className={styles.macroBar}>
            <div className={styles.macroHeader}>
              <span>Carbs</span>
              <span>{Math.round(carbsConsumed)}/{carbsGoal}g</span>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFillCarbs}
                style={{ width: `${Math.min((carbsConsumed / carbsGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className={styles.macroBar}>
            <div className={styles.macroHeader}>
              <span>Fat</span>
              <span>{Math.round(fatConsumed)}/{fatGoal}g</span>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFillFat}
                style={{ width: `${Math.min((fatConsumed / fatGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
          
          <div className={styles.macroBar}>
            <div className={styles.macroHeader}>
              <span>Fiber</span>
              <span>{Math.round(fiberConsumed)}/{fiberGoal}g</span>
            </div>
            <div className={styles.progressTrack}>
              <div 
                className={styles.progressFillFiber}
                style={{ width: `${Math.min((fiberConsumed / fiberGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.recentMeals}>
        <h3>Recent Meals</h3>
        {meals.length === 0 ? (
          <p className={styles.emptyMsg}>No meals logged yet. Start by searching for food or uploading an image!</p>
        ) : (
          <ul>
            {meals.map((meal, index) => (
              <li key={index} className={styles.mealItem}>
                <div className={styles.mealInfo}>
                  <div className={styles.mealName}>{meal.name}</div>
                  <div className={styles.mealMacros}>
                    {meal.calories} cal • {Math.round(meal.protein)}g protein • {Math.round(meal.carbs)}g carbs • {Math.round(meal.fat)}g fat
                  </div>
                  <div className={styles.mealTime}>
                    {new Date(meal.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <button className={styles.deleteBtn} onClick={() => removeMeal(index)}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Macro Distribution Pie Chart */}
      <div className={styles.macroChart}>
        <h3>Calorie Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={macroData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {macroData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${Math.round(value)} cal`, 'Calories']} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.macroLegend}>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#ff6b6b' }}></div>
            <span>Protein</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#ffb86b' }}></div>
            <span>Carbs</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#4ecdc4' }}></div>
            <span>Fat</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendColor} style={{ background: '#a78bfa' }}></div>
            <span>Fiber</span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={styles.recommendations}>
        <h3>Recommendations</h3>
        <p className={styles.recoSubtitle}>
          Based on today: need {Math.max(0, Math.round(proteinGoal - proteinConsumed))}g protein, {Math.max(0, Math.round(carbsGoal - carbsConsumed))}g carbs, {Math.max(0, Math.round(fatGoal - fatConsumed))}g fat, {Math.max(0, Math.round(fiberGoal - fiberConsumed))}g fiber
        </p>
        {recommendationFoods.length === 0 ? (
          <div className={styles.recoEmpty}>You're on track! 🎉</div>
        ) : (
          <div className={styles.recoGrid}>
            {recommendationFoods.map((f) => (
              <div key={f.id} className={styles.recoCard}>
                <div className={styles.recoHeader}>
                  <div className={styles.recoName}>{f.name}</div>
                  <div className={styles.recoGrams}>{f.grams}g</div>
                </div>
                <div className={styles.recoMacros}>
                  <span>{f.preview.calories} cal</span>
                  <span>{f.preview.protein}g P</span>
                  <span>{f.preview.carbs}g C</span>
                  <span>{f.preview.fat}g F</span>
                  <span>{f.preview.fiber}g Fib</span>
                </div>
                <button
                  className={styles.recoAddBtn}
                  onClick={() => handleAddRecommendation(f.id, f.grams)}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {warning && (
        <div style={{ textAlign: "center", color: "#f44336", marginBottom: 15 }}>
          {warning}
        </div>
      )}



      <div className={styles.weeklyChart}>
        <h3>Weekly Calories</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyCalories}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="calories" fill="#ff7e5f" />
          </BarChart>
        </ResponsiveContainer>
      </div>




      {showPopup && (
        <div className={styles.popupOverlay}>
          <form className={styles.popupForm} onSubmit={addMeal}>
            <h3>Add Meal</h3>
            <input
              type="text"
              placeholder="Meal Name"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Calories"
              value={mealCalories}
              onChange={(e) => setMealCalories(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />
            {imagePreview && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={imagePreview}
                  alt="Food Preview"
                  style={{ width: "150px", borderRadius: "10px" }}
                />
                <button
                  type="button"
                  onClick={handlePredictCalories}
                  style={{
                    marginTop: 8,
                    background: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Predict Calories & Macros
                </button>

                {isPredicted && predictedMeal && (
                  <div
                    style={{
                      marginTop: 10,
                      color: "#1f2937", // dark slate text
                      padding: 10,
                      background: "#eef2ff",
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    <strong>Predicted</strong>
                    <div>{predictedMeal.calories} kcal</div>
                    <div>
                      Protein: {predictedMeal.protein}g •
                      Carbs: {predictedMeal.carbs}g •
                      Fat: {predictedMeal.fat}g •
                      Fiber: {predictedMeal.fiber}g
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                type="submit"
                style={{
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Add Meal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPopup(false);
                  setUploadedImage(null);
                  setImagePreview(null);
                  setIsPredicted(false);
                  setPredictedMeal(null);
                }}
                style={{
                  background: "#e0e0e0",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showFoodSearch && (
        <FoodSearch
          onFoodSelected={handleFoodSelected}
          onClose={() => setShowFoodSearch(false)}
        />
      )}

    </div>
  );
}

