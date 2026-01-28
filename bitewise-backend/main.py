from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io
import random
import uuid
import os
from pydantic import BaseModel
import requests
import os

from typing import List, Dict, Any, Optional
# Load .env if available; fail gracefully when python-dotenv isn't installed
try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv(*args, **kwargs):
        return None

load_dotenv()
app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can restrict to your frontend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 pre-trained model
model = YOLO("food256_best.pt")
  # nano model, can replace with custom food model later

# Enhanced food database with macros (per 100g)
FOOD_DATABASE = {
    # Common YOLO classes that could be food items
    "apple": {"calories": 52, "protein": 0.3, "carbs": 14, "fat": 0.2, "fiber": 2.4},
    "banana": {"calories": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fiber": 2.6},
    "orange": {"calories": 47, "protein": 0.9, "carbs": 12, "fat": 0.1, "fiber": 2.4},
    "sandwich": {"calories": 250, "protein": 12, "carbs": 30, "fat": 10, "fiber": 3},
    "hot dog": {"calories": 290, "protein": 10, "carbs": 2, "fat": 26, "fiber": 0},
    "pizza": {"calories": 266, "protein": 11, "carbs": 33, "fat": 10, "fiber": 2.3},
    "donut": {"calories": 452, "protein": 5, "carbs": 51, "fat": 25, "fiber": 2},
    "cake": {"calories": 257, "protein": 3, "carbs": 46, "fat": 8, "fiber": 1.2},
    "broccoli": {"calories": 34, "protein": 2.8, "carbs": 7, "fat": 0.4, "fiber": 2.6},
    "carrot": {"calories": 41, "protein": 0.9, "carbs": 10, "fat": 0.2, "fiber": 2.8},
    "person": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0},  # Not food
    "car": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0},    # Not food
    # Generic fallbacks for detected objects
    "default_food": {"calories": 200, "protein": 8, "carbs": 25, "fat": 8, "fiber": 3},
    # Extras for nutrition Q&A
    "chicken breast": {"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0},
    "white rice": {"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fiber": 0.4},
    "brown rice": {"calories": 112, "protein": 2.6, "carbs": 22, "fat": 0.9, "fiber": 1.8},
    "oats": {"calories": 389, "protein": 16.9, "carbs": 66.3, "fat": 6.9, "fiber": 10.6},
    "egg": {"calories": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fiber": 0},
    "salmon": {"calories": 208, "protein": 25.4, "carbs": 0, "fat": 12.4, "fiber": 0},
    "tofu": {"calories": 76, "protein": 8, "carbs": 1.9, "fat": 4.8, "fiber": 0.3},
}


def load_usda_cache_into_db(cache_dir="usda_cache"):
    """Load cached USDA search and detail files into the local FOOD_DATABASE to enrich knowledge."""
    try:
        files = os.listdir(cache_dir)
    except Exception:
        return

    # map fdcId -> macros from detail files
    details = {}
    for fname in files:
        if fname.startswith("detail_") and fname.endswith(".json"):
            try:
                with open(os.path.join(cache_dir, fname), "r", encoding="utf-8") as f:
                    import json
                    data = json.load(f)
                    mac = data.get("macros") or data
                    fid = fname.replace("detail_", "").replace(".json", "")
                    details[str(fid)] = mac
            except Exception:
                continue

    # read search files to map names -> fdc id
    for fname in files:
        if fname.startswith("search_") and fname.endswith(".json"):
            try:
                with open(os.path.join(cache_dir, fname), "r", encoding="utf-8") as f:
                    import json
                    data = json.load(f)
                    results = data.get("results") or []
                    for item in results:
                        fid = str(item.get("id"))
                        name = (item.get("name") or "").strip()
                        if not name or fid not in details:
                            continue
                        macros = details.get(fid)
                        if not macros:
                            continue
                        key = name.lower()
                        # don't override existing curated local entries
                        if key in FOOD_DATABASE:
                            continue
                        # ensure macros contain expected keys
                        if all(k in macros for k in ("calories", "protein", "carbs", "fat", "fiber")):
                            FOOD_DATABASE[key] = {
                                "calories": float(macros.get("calories", 0)),
                                "protein": float(macros.get("protein", 0)),
                                "carbs": float(macros.get("carbs", 0)),
                                "fat": float(macros.get("fat", 0)),
                                "fiber": float(macros.get("fiber", 0)),
                            }
            except Exception:
                continue


# Load cache at startup to enrich the DB
load_usda_cache_into_db()

def get_food_macros(class_name, estimated_grams=100):
    """Get nutritional information for detected food items"""
    clean_name = class_name.lower().strip()
    # 1️⃣ Check local database first
    if clean_name in FOOD_DATABASE:
        macros = FOOD_DATABASE[clean_name]
    else:
        macros = None

    # 2️⃣ Skip non-food items (some classes map to non-food)
    if macros and macros.get("calories", 0) == 0:
        return None

    # 3️⃣ Try USDA if not in local
    if macros is None:
        usda_hits = usda_search(clean_name)
        if usda_hits:
            fdc_id = usda_hits[0]["id"]
            usda_mac = usda_macros(fdc_id)
            if usda_mac:
                macros = usda_mac

    # 4️⃣ Try Nutritionix if still None (disabled by default)
    # if macros is None:
    #     nx_mac = nutritionix_macros(clean_name, estimated_grams)
    #     if nx_mac:
    #         macros = nx_mac

    # 5️⃣ Fallback to default if nothing found
    if macros is None:
        macros = FOOD_DATABASE["default_food"]

    # Calculate based on estimated portion size if needed (for local DB only)
    if clean_name in FOOD_DATABASE:
        multiplier = estimated_grams / 100
        return {
            "name": class_name.title(),
            "grams": estimated_grams,
            "calories": round(macros["calories"] * multiplier),
            "protein": round(macros["protein"] * multiplier, 1),
            "carbs": round(macros["carbs"] * multiplier, 1),
            "fat": round(macros["fat"] * multiplier, 1),
            "fiber": round(macros["fiber"] * multiplier, 1)
        }
    else:
        # USDA / Nutritionix macros are already scaled
        return {
            "name": class_name.title(),
            "grams": estimated_grams,
            "calories": round(macros.get("calories", 0)),
            "protein": round(macros.get("protein", 0), 1),
            "carbs": round(macros.get("carbs", 0), 1),
            "fat": round(macros.get("fat", 0), 1),
            "fiber": round(macros.get("fiber", 0), 1)
        }

    # (function ends above; no further processing required)

@app.get("/")
def root():
    return {"message": "BiteWise Backend is running 🚀"}
 
@app.post("/predict-calories")
async def predict_calories(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        file_path = f"uploads/{file_id}_{file.filename}"

        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)

        # Save the file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Load image for YOLO
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        # YOLO prediction
        results = model.predict(image, conf=0.3)  # 30% confidence threshold

        # Extract detected objects
        detected_foods = []
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0

        if len(results) > 0 and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            for box in boxes:
                # Get class ID and confidence
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])

                # Get class name from model
                class_name = model.names[class_id]

                # Estimate portion size
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                box_area = (x2 - x1) * (y2 - y1)
                image_area = image.width * image.height
                area_ratio = box_area / image_area
                estimated_grams = max(50, min(300, int(area_ratio * 500)))

                # Get nutritional information
                food_info = get_food_macros(class_name, estimated_grams)
                if food_info:
                    food_info["confidence"] = round(confidence * 100)
                    detected_foods.append(food_info)

                    # Add to totals
                    total_calories += food_info["calories"]
                    total_protein += food_info["protein"]
                    total_carbs += food_info["carbs"]
                    total_fat += food_info["fat"]
                    total_fiber += food_info["fiber"]

        # If no food detected, return default food item
        if not detected_foods:
            default_food = get_food_macros("default_food", 150)
            if default_food:
                default_food["name"] = "Food Item"
                default_food["confidence"] = 75
                detected_foods.append(default_food)
                total_calories = default_food["calories"]
                total_protein = default_food["protein"]
                total_carbs = default_food["carbs"]
                total_fat = default_food["fat"]
                total_fiber = default_food["fiber"]

        # Create smart meal name
        if len(detected_foods) == 1:
            meal_name = detected_foods[0]["name"]
        elif len(detected_foods) <= 3:
            meal_name = " + ".join([f["name"] for f in detected_foods])
        else:
            meal_name = "Mixed Meal"


        return {
    "predictedClasses": [food["name"] for food in detected_foods],
    "predictedCalories": total_calories,
    "detectedFoods": detected_foods,
    "mealName": meal_name,
    "meal": {
        "name": meal_name,
        "items": detected_foods,
        "nutrition": {
            "calories": total_calories,
            "protein": round(total_protein, 1),
            "carbs": round(total_carbs, 1),
            "fat": round(total_fat, 1),
            "fiber": round(total_fiber, 1),
        }
    },
    "totalNutrition": {
        "calories": total_calories,
        "protein": round(total_protein, 1),
        "carbs": round(total_carbs, 1),
        "fat": round(total_fat, 1),
        "fiber": round(total_fiber, 1),
    },
    "filePath": file_path,
}

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return {
            "predictedClasses": ["Food Item"],
            "predictedCalories": 200,
            "detectedFoods": [get_food_macros("default_food", 150)],
            "mealName": "Food Item",
            "totalNutrition": {
                "calories": 200,
                "protein": 8.0,
                "carbs": 25.0,
                "fat": 8.0,
                "fiber": 3.0,
            },
            "error": "Could not analyze image, using default values",
        }




# --- Simple AI Chat Endpoint ---
class ChatRequest(BaseModel):
    message: str
    profile: dict | None = None  # optional user profile for personalization
    recentMeals: list | None = None
    lastMessages: list | None = None


def parse_food_query(text: str):
    """Try to detect a food and grams from a free text like 'chicken 150g' or 'macros of oats 80 g'"""
    import re
    grams = 100
    match = re.search(r"(\d{1,4})\s*g", text)
    if match:
        grams = max(1, min(1000, int(match.group(1))))
    
    # Try to match any known food key inside text
    lowered = text.lower()
    candidates = []
    for key in FOOD_DATABASE.keys():
        if key in ("default_food", "person", "car"):
            continue
        if key in lowered:
            candidates.append(key)
    if candidates:
        # choose longest match
        candidates.sort(key=len, reverse=True)
        return candidates[0], grams
    return None, grams


def format_macros(name: str, grams: int, macros: dict) -> str:
    return (
        f"{name.title()} ({grams}g): "
        f"{macros['calories']} cal, {macros['protein']}g protein, {macros['carbs']}g carbs, {macros['fat']}g fat, {macros['fiber']}g fiber."
    )


@app.post("/chat")
def chat(req: ChatRequest):
    text = (req.message or "").lower().strip()

    if not text:
        return {"reply": "Tell me your goal, e.g. lose fat, gain muscle, or ask for a meal idea."}

    # Nutrition Q&A: macros/calories of a specific food
    if any(k in text for k in ["macro", "macros", "calorie", "calories", "protein", "carb", "fat", "fiber"]):
        food_name, grams = parse_food_query(text)
        if food_name:
            base = FOOD_DATABASE.get(food_name)
            if base and base.get("calories", 0) > 0:
                m = get_food_macros(food_name, grams)
                if m:
                    return {"reply": format_macros(food_name, grams, m)}

    # If LLM key is present, try LLM first (OpenAI-compatible)
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
    api_base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if api_key:
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            # Build system with optional profile context
            profile_context = ""
            if req.profile:
                try:
                    name = req.profile.get("name")
                    goal = req.profile.get("goal")
                    cals = req.profile.get("calories", {})
                    profile_context = (
                        f"User: {name}, Goal: {goal}, Targets -> Calories: {cals.get('target')}, "
                        f"Protein: {cals.get('protein')}g, Carbs: {cals.get('carbs')}g, Fat: {cals.get('fat')}g, Fiber: {cals.get('fiber')}g."
                    )
                except Exception:
                    profile_context = ""

            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": (
                        "You are BiteWise AI, a trusted fitness & nutrition assistant.\n"
                        + (f"Context: {profile_context}\n" if profile_context else "")
                        + "Be accurate and concise. Prefer evidence-based advice. Include macros when relevant."
                    )},
                    {"role": "user", "content": req.message},
                ],
                "temperature": 0.7,
            }
            resp = requests.post(f"{api_base}/chat/completions", json=payload, headers=headers, timeout=20)
            if resp.ok:
                data = resp.json()
                reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if reply:
                    return {"reply": reply}
        except Exception as e:
            # Fall through to rule-based
            pass

    # Very simple rule-based responses as a starter
    if any(word in text for word in ["protein", "high protein", "muscle"]):
        return {
            "reply": (
                "High-protein ideas: grilled chicken breast + veggies, greek yogurt + berries, "
                "paneer/tofu stir-fry, tuna salad, eggs + oats. Aim ~1.8–2.2g protein/kg bodyweight."
            )
        }

    if any(word in text for word in ["cutting", "deficit", "lose fat", "lose weight"]):
        return {
            "reply": (
                "Calorie deficit tips: keep protein high, eat high-volume foods (veggies, fruits), "
                "prefer whole grains, hydrate, and track your macros. A moderate deficit works best."
            )
        }

    if any(word in text for word in ["bulking", "surplus", "gain weight"]):
        return {
            "reply": (
                "Lean bulk: add 200–400 kcal/day above maintenance, keep protein ~2g/kg, "
                "lift progressively, and prioritize sleep and recovery."
            )
        }

    if any(word in text for word in ["fiber", "digestion", "constipation"]):
        return {"reply": "Aim 25–35g fiber/day: oats, fruits, vegetables, legumes, whole grains. Hydrate well."}

    if any(word in text for word in ["carb", "carbs", "energy"]):
        return {"reply": "Great carb sources: rice, oats, potatoes, fruits, whole grains. Time carbs around workouts."}

    if any(word in text for word in ["fat", "fats", "omega"]):
        return {"reply": "Healthy fats: olive oil, nuts, seeds, avocado, fatty fish. Keep ~20–35% calories from fat."}

    # Default
    return {
        "reply": (
            "I can help with macros, meal ideas, cutting/bulking tips. Try: "
            "'high protein breakfast', 'cutting diet tips', or 'carb sources before workout'."
        )
    }


# --- Recipes Endpoint ---
class RecipesRequest(BaseModel):
    goal: str | None = None  # e.g., "lose_weight", "gain_muscle"
    maxCalories: int | None = None
    needProteinG: float | None = None


@app.post("/recipes")
def get_recipes(req: RecipesRequest):
    # Simple curated recipes with macros (per serving)
    recipes = [
        {
            "title": "Grilled Chicken Bowl",
            "serves": 1,
            "calories": 520,
            "protein": 45,
            "carbs": 50,
            "fat": 16,
            "fiber": 6,
            "ingredients": [
                "150g chicken breast",
                "150g cooked brown rice",
                "100g broccoli",
                "1 tbsp olive oil",
            ],
            "instructions": [
                "Grill chicken with salt/pepper.",
                "Steam broccoli.",
                "Serve over brown rice, drizzle olive oil.",
            ],
        },
        {
            "title": "Greek Yogurt Power Bowl",
            "serves": 1,
            "calories": 420,
            "protein": 35,
            "carbs": 45,
            "fat": 10,
            "fiber": 6,
            "ingredients": [
                "250g plain greek yogurt",
                "100g mixed berries",
                "30g oats",
                "10g almonds",
            ],
            "instructions": [
                "Combine all ingredients in a bowl.",
            ],
        },
        {
            "title": "Tofu Veggie Stir-fry",
            "serves": 1,
            "calories": 500,
            "protein": 30,
            "carbs": 45,
            "fat": 20,
            "fiber": 8,
            "ingredients": [
                "200g firm tofu",
                "150g mixed bell peppers",
                "100g broccoli",
                "1 tbsp olive oil",
                "150g cooked quinoa",
            ],
            "instructions": [
                "Sauté tofu until browned.",
                "Stir-fry veggies, combine with tofu.",
                "Serve over quinoa.",
            ],
        },
    ]

    # Optional filtering
    filtered = recipes
    if req.maxCalories:
        filtered = [r for r in filtered if r["calories"] <= req.maxCalories]
    if req.needProteinG and req.needProteinG > 0:
        filtered = sorted(filtered, key=lambda r: -(min(r["protein"], req.needProteinG)))

    return {"recipes": filtered[:3]}


# --- USDA Integration ---
USDA_API_KEY = os.getenv("USDA_API_KEY")
USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
USDA_DETAILS_URL = "https://api.nal.usda.gov/fdc/v1/food/{}"

CACHE_DIR = "usda_cache"
os.makedirs(CACHE_DIR, exist_ok=True)


def _cache_path(name: str) -> str:
    return os.path.join(CACHE_DIR, name)


def read_cache(name: str) -> Optional[dict]:
    try:
        p = _cache_path(name)
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                import json
                return json.load(f)
    except Exception:
        return None
    return None


def write_cache(name: str, data: dict) -> None:
    try:
        p = _cache_path(name)
        with open(p, "w", encoding="utf-8") as f:
            import json
            json.dump(data, f)
    except Exception:
        pass


def usda_search(query: str) -> List[Dict[str, Any]]:
    if not USDA_API_KEY:
        return []
    cache_key = f"search_{query.lower().strip().replace(' ', '_')}.json"
    cached = read_cache(cache_key)
    if cached:
        return cached.get("results", [])

    params = {
        "api_key": USDA_API_KEY,
        "query": query,
        "pageSize": 10,
        "dataType": ["Branded", "Survey (FNDDS)", "SR Legacy"],
        "sortBy": "score",
    }
    try:
        resp = requests.get(USDA_SEARCH_URL, params=params, timeout=12)
        if resp.ok:
            data = resp.json()
            foods = data.get("foods", [])
            results = [
                {
                    "id": str(item.get("fdcId")),
                    "name": item.get("description", "Food"),
                    "brand": item.get("brandOwner"),
                }
                for item in foods
            ]
            write_cache(cache_key, {"results": results})
            return results
    except Exception:
        return []
    return []


def usda_macros(fdc_id: str) -> Optional[Dict[str, float]]:
    if not USDA_API_KEY:
        return None
    cache_key = f"detail_{fdc_id}.json"
    cached = read_cache(cache_key)
    if cached:
        return cached.get("macros")

    try:
        resp = requests.get(USDA_DETAILS_URL.format(fdc_id), params={"api_key": USDA_API_KEY}, timeout=12)
        if not resp.ok:
            return None
        data = resp.json()
        nutrients = data.get("foodNutrients", [])
        # Defaults per 100g
        macros = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0}
        for n in nutrients:
            name = (n.get("nutrient", {}) or {}).get("name", "").lower()
            unit = (n.get("nutrient", {}) or {}).get("unitName", "").lower()
            value = float(n.get("amount", 0) or 0)
            # Normalize to grams/kcal per 100g if possible; FoodData often already per 100g
            if "energy" in name or name == "kcal":
                macros["calories"] = value
            elif "protein" in name:
                macros["protein"] = value
            elif "carbohydrate" in name:
                macros["carbs"] = value
            elif name.startswith("total lipid") or name == "fat" or "fat" in name:
                macros["fat"] = value
            elif "fiber" in name:
                macros["fiber"] = value
        write_cache(cache_key, {"macros": macros})
        return macros
    except Exception:
        return None
class FoodSearchRequest(BaseModel):
    q: str
@app.get("/foods/search")
def foods_search(q: str):
    q = (q or "").strip()
    if not q:
        return {"results": []}

    # Local database quick matches
    local_hits = []
    for key in FOOD_DATABASE.keys():
        if key in ("default_food", "person", "car"):
            continue
        if q.lower() in key.lower():
            local_hits.append({"id": key, "name": key.title(), "source": "local"})

    # USDA search
    remote_hits = usda_search(q)

    # Nutritionix search
    #nx_hits = nutritionix_search(q)

    # Merge results
    all_results = local_hits + remote_hits 

    # Optional: remove duplicates by name (keep first occurrence)
    seen = set()
    unique_results = []
    for r in all_results:
        if r["name"].lower() not in seen:
            seen.add(r["name"].lower())
            unique_results.append(r)

    return {"results": unique_results[:20]}  # limit max 20 results



@app.get("/foods/macros")
def foods_macros(id: str, grams: int = 100):
    grams = max(1, min(2000, grams))
    # Local first
    base = FOOD_DATABASE.get(id.lower())
    if base:
        m = get_food_macros(id, grams)
        if m:
            return {"id": id, "name": id.title(), "grams": grams, "macros": m, "source": "local"}

    # USDA fallback
    mac = usda_macros(id)
    if mac:
        mult = grams / 100.0
        normalized = {
            "calories": round(mac.get("calories", 0) * mult),
            "protein": round(mac.get("protein", 0) * mult, 1),
            "carbs": round(mac.get("carbs", 0) * mult, 1),
            "fat": round(mac.get("fat", 0) * mult, 1),
            "fiber": round(mac.get("fiber", 0) * mult, 1),
        }
        return {"id": id, "name": id, "grams": grams, "macros": normalized, "source": "usda"}

    return {"error": "Food item not found"}

