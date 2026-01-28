"use client";
import { useState } from "react";

interface DetectedFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence?: number;
}

interface FoodUploadProps {
  onMealLogged: (meal: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    time: string;
  }) => void;
}

export default function FoodUpload({ onMealLogged }: FoodUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [detectedFoods, setDetectedFoods] = useState<DetectedFood[]>([]);
  const [mealName, setMealName] = useState("");
  const [total, setTotal] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  });

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setDetectedFoods([]);
    setMealName("");
    setTotal({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    if (f) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  // STEP 1 — Analyze image
  const analyzeImage = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/predict-calories", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setDetectedFoods(data.detectedFoods || []);
      setMealName(data.mealName || "Detected Meal");

      setTotal({
        calories: data.totalNutrition.calories,
        protein: data.totalNutrition.protein,
        carbs: data.totalNutrition.carbs,
        fat: data.totalNutrition.fat,
        fiber: data.totalNutrition.fiber,
      });
    } catch (err) {
      alert("Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2 — Add meal to today
  const addMeal = () => {
    if (!mealName || total.calories === 0) return;

    onMealLogged({
      name: mealName,
      calories: total.calories,
      protein: total.protein,
      carbs: total.carbs,
      fat: total.fat,
      fiber: total.fiber,
      time: new Date().toLocaleTimeString(),
    });

    // reset
    setFile(null);
    setPreview(null);
    setDetectedFoods([]);
    setMealName("");
    setTotal({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* File input */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
      />

      {/* Image preview */}
      {preview && (
        <div style={{ marginTop: 15 }}>
          <img
            src={preview}
            alt="preview"
            style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12 }}
          />
        </div>
      )}

      {/* Analyze button */}
      {file && detectedFoods.length === 0 && (
        <button
          onClick={analyzeImage}
          disabled={loading}
          style={{
            marginTop: 15,
            padding: "10px 18px",
            borderRadius: 10,
            background: "#22C55E",
            color: "white",
            fontWeight: 600,
          }}
        >
          {loading ? "Analyzing food..." : "Analyze Food"}
        </button>
      )}

      {/* Results */}
      {detectedFoods.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <label style={{ fontWeight: 600 }}>Meal name</label>
          <input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Meal name (editable)"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              marginTop: 6,
              marginBottom: 12,
            }}
          />

          <div style={{ fontSize: 14, marginBottom: 10 }}>
            🔥 <b>{total.calories}</b> kcal •
            🧬 P {total.protein}g •
            C {total.carbs}g •
            F {total.fat}g
          </div>

          <button
            onClick={addMeal}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#6C63FF",
              color: "white",
              fontWeight: 600,
            }}
          >
            Add to Today
          </button>
        </div>
      )}
    </div>
  );
}
