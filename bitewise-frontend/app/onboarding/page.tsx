"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

interface UserProfile {
  name: string;
  age: number;
  gender: "male" | "female";
  weight: number;
  height: number;
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
  goal: "lose_weight" | "lose_fat" | "maintain_weight" | "gain_weight" | "gain_muscle";
  weightChangeRate: "slow" | "moderate" | "fast";
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: 25,
    gender: "male",
    weight: 70,
    height: 170,
    activityLevel: "moderately_active",
    goal: "maintain_weight",
    weightChangeRate: "moderate"
  });

  const calculateCalories = (profile: UserProfile) => {
    // Mifflin-St Jeor Equation
    let bmr;
    if (profile.gender === "male") {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };

    const maintenanceCalories = Math.round(bmr * activityMultipliers[profile.activityLevel]);

    // Goal adjustments
    let targetCalories = maintenanceCalories;
    let weeklyWeightChange = 0;

    if (profile.goal === "lose_weight" || profile.goal === "lose_fat") {
      const deficits = { slow: 250, moderate: 500, fast: 750 };
      targetCalories = maintenanceCalories - deficits[profile.weightChangeRate];
      weeklyWeightChange = -deficits[profile.weightChangeRate] / 1100; // rough kg per week
    } else if (profile.goal === "gain_weight" || profile.goal === "gain_muscle") {
      const surpluses = { slow: 200, moderate: 400, fast: 600 };
      targetCalories = maintenanceCalories + surpluses[profile.weightChangeRate];
      weeklyWeightChange = surpluses[profile.weightChangeRate] / 1100;
    }

    // Calculate macros
    const protein = (profile.goal === "gain_muscle" || profile.goal === "lose_fat") ? profile.weight * 2.2 : profile.weight * 1.8; // g
    const fat = (targetCalories * 0.25) / 9; // 25% of calories from fat
    const carbs = (targetCalories - (protein * 4) - (fat * 9)) / 4; // remaining calories from carbs

    return {
      maintenance: maintenanceCalories,
      target: Math.max(targetCalories, 1200), // minimum 1200 calories
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(profile.weight * 0.4), // 0.4g per kg bodyweight
      weeklyWeightChange: Math.round(weeklyWeightChange * 10) / 10
    };
  };

  const handleSubmit = () => {
    const calories = calculateCalories(profile);
    const userData = { ...profile, calories };
    
    localStorage.setItem("userProfile", JSON.stringify(userData));
    router.push("/dashboard");
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <span>Step {step} of 4</span>
        </div>

        {step === 1 && (
          <div className={styles.step}>
            <h2>Welcome to BiteWise! 👋</h2>
            <p>Let's get to know you better</p>
            
            <div className={styles.inputGroup}>
              <label>What's your name?</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                placeholder="Enter your name"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({...profile, age: Number(e.target.value)})}
                min="13"
                max="100"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Gender</label>
              <div className={styles.radioGroup}>
                <label>
                  <input
                    type="radio"
                    checked={profile.gender === "male"}
                    onChange={() => setProfile({...profile, gender: "male"})}
                  />
                  Male
                </label>
                <label>
                  <input
                    type="radio"
                    checked={profile.gender === "female"}
                    onChange={() => setProfile({...profile, gender: "female"})}
                  />
                  Female
                </label>
              </div>
            </div>

            <button 
              onClick={nextStep} 
              disabled={!profile.name.trim()}
              className={styles.nextBtn}
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.step}>
            <h2>Physical Details 📏</h2>
            
            <div className={styles.inputGroup}>
              <label>Weight (kg)</label>
              <input
                type="number"
                value={profile.weight}
                onChange={(e) => setProfile({...profile, weight: Number(e.target.value)})}
                min="30"
                max="300"
                step="0.1"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Height (cm)</label>
              <input
                type="number"
                value={profile.height}
                onChange={(e) => setProfile({...profile, height: Number(e.target.value)})}
                min="100"
                max="250"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Activity Level</label>
              <select
                value={profile.activityLevel}
                onChange={(e) => setProfile({...profile, activityLevel: e.target.value as any})}
              >
                <option value="sedentary">Sedentary (little/no exercise)</option>
                <option value="lightly_active">Lightly Active (light exercise 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (moderate exercise 3-5 days/week)</option>
                <option value="very_active">Very Active (hard exercise 6-7 days/week)</option>
                <option value="extremely_active">Extremely Active (very hard exercise, physical job)</option>
              </select>
            </div>

            <div className={styles.stepNav}>
              <button onClick={prevStep} className={styles.prevBtn}>Back</button>
              <button onClick={nextStep} className={styles.nextBtn}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.step}>
            <h2>Your Goals 🎯</h2>
            
            <div className={styles.inputGroup}>
              <label>What's your primary goal?</label>
              <div className={styles.goalCards}>
                <div 
                  className={`${styles.goalCard} ${profile.goal === "lose_weight" ? styles.selected : ""}`}
                  onClick={() => setProfile({...profile, goal: "lose_weight"})}
                >
                  <span className={styles.goalEmoji}>📉</span>
                  <h3>Lose Weight</h3>
                  <p>Overall weight loss</p>
                  </div>
                <div 
                  className={`${styles.goalCard} ${profile.goal === "lose_fat" ? styles.selected : ""}`}
                  onClick={() => setProfile({...profile, goal: "lose_fat"})}
                >
                  <span className={styles.goalEmoji}>🔥</span>
                  <h3>Lose Fat</h3>
                  <p>Prioritize fat loss with higher protein</p>
                </div>
                <div 
                  className={`${styles.goalCard} ${profile.goal === "maintain_weight" ? styles.selected : ""}`}
                  onClick={() => setProfile({...profile, goal: "maintain_weight"})}
                >
                  <span className={styles.goalEmoji}>⚖️</span>
                  <h3>Maintain Weight</h3>
                  <p>Stay at current weight</p>
                </div>
                <div 
                  className={`${styles.goalCard} ${profile.goal === "gain_weight" ? styles.selected : ""}`}
                  onClick={() => setProfile({...profile, goal: "gain_weight"})}
                >
                  <span className={styles.goalEmoji}>📈</span>
                  <h3>Gain Weight</h3>
                  <p>Healthy weight gain</p>
                </div>
                <div 
                  className={`${styles.goalCard} ${profile.goal === "gain_muscle" ? styles.selected : ""}`}
                  onClick={() => setProfile({...profile, goal: "gain_muscle"})}
                >
                  <span className={styles.goalEmoji}>💪</span>
                  <h3>Gain Muscle</h3>
                  <p>Build lean muscle mass</p>
                </div>
              </div>
            </div>

            {(profile.goal === "lose_weight" || profile.goal === "lose_fat" || profile.goal === "gain_weight" || profile.goal === "gain_muscle") && (
              <div className={styles.inputGroup}>
                <label>How fast do you want to progress?</label>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      checked={profile.weightChangeRate === "slow"}
                      onChange={() => setProfile({...profile, weightChangeRate: "slow"})}
                    />
                    Slow & Steady (0.25kg/week)
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={profile.weightChangeRate === "moderate"}
                      onChange={() => setProfile({...profile, weightChangeRate: "moderate"})}
                    />
                    Moderate (0.5kg/week)
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={profile.weightChangeRate === "fast"}
                      onChange={() => setProfile({...profile, weightChangeRate: "fast"})}
                    />
                    Fast (0.75kg/week)
                  </label>
                </div>
              </div>
            )}

            <div className={styles.stepNav}>
              <button onClick={prevStep} className={styles.prevBtn}>Back</button>
              <button onClick={nextStep} className={styles.nextBtn}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className={styles.step}>
            <h2>Your Personalized Plan 🎉</h2>
            
            {(() => {
              const calories = calculateCalories(profile);
              return (
                <div className={styles.results}>
                  <div className={styles.resultCard}>
                    <h3>Daily Calorie Target</h3>
                    <div className={styles.calorieTarget}>{calories.target} cal</div>
                    <p>Maintenance: {calories.maintenance} cal</p>
                  </div>

                  <div className={styles.macroBreakdown}>
                    <h3>Daily Macro Targets</h3>
                    <div className={styles.macroGrid}>
                      <div className={styles.macroItem}>
                        <span className={styles.macroLabel}>Protein</span>
                        <span className={styles.macroValue}>{calories.protein}g</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroLabel}>Carbs</span>
                        <span className={styles.macroValue}>{calories.carbs}g</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroLabel}>Fat</span>
                        <span className={styles.macroValue}>{calories.fat}g</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroLabel}>Fiber</span>
                        <span className={styles.macroValue}>{calories.fiber}g</span>
                      </div>
                    </div>
                  </div>

                  {calories.weeklyWeightChange !== 0 && (
                    <div className={styles.progressPrediction}>
                      <p>
                        Expected progress: <strong>
                          {calories.weeklyWeightChange > 0 ? '+' : ''}{calories.weeklyWeightChange}kg per week
                        </strong>
                      </p>
                    </div>
                  )}

                  <button onClick={handleSubmit} className={styles.startBtn}>
                    Start Your Journey! 🚀
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}