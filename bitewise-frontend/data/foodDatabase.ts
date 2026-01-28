export interface FoodItem {
  id: string;
  name: string;
  calories: number; // per 100g
  protein: number; // per 100g
  carbs: number; // per 100g
  fat: number; // per 100g
  fiber: number; // per 100g
  category: string;
  searchTerms: string[];
}

export const foodDatabase: FoodItem[] = [
  // Proteins
  {
    id: "chicken_breast",
    name: "Chicken Breast",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    category: "protein",
    searchTerms: ["chicken", "breast", "poultry", "lean meat"]
  },
  {
    id: "chicken_thigh",
    name: "Chicken Thigh",
    calories: 209,
    protein: 26,
    carbs: 0,
    fat: 10.9,
    fiber: 0,
    category: "protein",
    searchTerms: ["chicken", "thigh", "poultry", "dark meat"]
  },
  {
    id: "salmon",
    name: "Salmon",
    calories: 208,
    protein: 25.4,
    carbs: 0,
    fat: 12.4,
    fiber: 0,
    category: "protein",
    searchTerms: ["salmon", "fish", "seafood", "omega-3"]
  },
  {
    id: "tuna",
    name: "Tuna",
    calories: 144,
    protein: 30,
    carbs: 0,
    fat: 1,
    fiber: 0,
    category: "protein",
    searchTerms: ["tuna", "fish", "seafood", "canned"]
  },
  {
    id: "eggs",
    name: "Eggs",
    calories: 155,
    protein: 13,
    carbs: 1.1,
    fat: 11,
    fiber: 0,
    category: "protein",
    searchTerms: ["egg", "eggs", "whole egg"]
  },
  {
    id: "ground_beef",
    name: "Ground Beef (85% lean)",
    calories: 250,
    protein: 26,
    carbs: 0,
    fat: 15,
    fiber: 0,
    category: "protein",
    searchTerms: ["beef", "ground beef", "minced beef", "meat"]
  },
  {
    id: "tofu",
    name: "Tofu",
    calories: 76,
    protein: 8,
    carbs: 1.9,
    fat: 4.8,
    fiber: 0.3,
    category: "protein",
    searchTerms: ["tofu", "soy", "vegetarian", "vegan"]
  },
  {
    id: "greek_yogurt",
    name: "Greek Yogurt (Plain)",
    calories: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    fiber: 0,
    category: "protein",
    searchTerms: ["yogurt", "greek yogurt", "dairy"]
  },

  // Carbohydrates
  {
    id: "white_rice",
    name: "White Rice (cooked)",
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    fiber: 0.4,
    category: "carbs",
    searchTerms: ["rice", "white rice", "jasmine rice", "basmati"]
  },
  {
    id: "brown_rice",
    name: "Brown Rice (cooked)",
    calories: 112,
    protein: 2.6,
    carbs: 22,
    fat: 0.9,
    fiber: 1.8,
    category: "carbs",
    searchTerms: ["brown rice", "rice", "whole grain"]
  },
  {
    id: "quinoa",
    name: "Quinoa (cooked)",
    calories: 120,
    protein: 4.4,
    carbs: 22,
    fat: 1.9,
    fiber: 2.8,
    category: "carbs",
    searchTerms: ["quinoa", "superfood", "grain"]
  },
  {
    id: "pasta",
    name: "Pasta (cooked)",
    calories: 131,
    protein: 5,
    carbs: 25,
    fat: 1.1,
    fiber: 1.8,
    category: "carbs",
    searchTerms: ["pasta", "spaghetti", "noodles", "macaroni"]
  },
  {
    id: "bread_white",
    name: "White Bread",
    calories: 265,
    protein: 9,
    carbs: 49,
    fat: 3.2,
    fiber: 2.7,
    category: "carbs",
    searchTerms: ["bread", "white bread", "slice"]
  },
  {
    id: "bread_whole_wheat",
    name: "Whole Wheat Bread",
    calories: 247,
    protein: 13,
    carbs: 41,
    fat: 4.2,
    fiber: 7,
    category: "carbs",
    searchTerms: ["whole wheat bread", "brown bread", "whole grain"]
  },
  {
    id: "oats",
    name: "Oats (dry)",
    calories: 389,
    protein: 16.9,
    carbs: 66.3,
    fat: 6.9,
    fiber: 10.6,
    category: "carbs",
    searchTerms: ["oats", "oatmeal", "porridge", "rolled oats"]
  },
  {
    id: "sweet_potato",
    name: "Sweet Potato",
    calories: 86,
    protein: 1.6,
    carbs: 20,
    fat: 0.1,
    fiber: 3,
    category: "carbs",
    searchTerms: ["sweet potato", "potato", "yam"]
  },
  {
    id: "banana",
    name: "Banana",
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    fiber: 2.6,
    category: "carbs",
    searchTerms: ["banana", "fruit"]
  },

  // Vegetables
  {
    id: "broccoli",
    name: "Broccoli",
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fat: 0.4,
    fiber: 2.6,
    category: "vegetables",
    searchTerms: ["broccoli", "green vegetable", "cruciferous"]
  },
  {
    id: "spinach",
    name: "Spinach",
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    category: "vegetables",
    searchTerms: ["spinach", "leafy greens", "iron"]
  },
  {
    id: "carrots",
    name: "Carrots",
    calories: 41,
    protein: 0.9,
    carbs: 10,
    fat: 0.2,
    fiber: 2.8,
    category: "vegetables",
    searchTerms: ["carrot", "carrots", "orange vegetable"]
  },
  {
    id: "bell_pepper",
    name: "Bell Pepper",
    calories: 31,
    protein: 1,
    carbs: 7,
    fat: 0.3,
    fiber: 2.5,
    category: "vegetables",
    searchTerms: ["bell pepper", "pepper", "capsicum", "red pepper", "green pepper"]
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    category: "vegetables",
    searchTerms: ["tomato", "tomatoes", "red vegetable"]
  },

  // Fats
  {
    id: "avocado",
    name: "Avocado",
    calories: 160,
    protein: 2,
    carbs: 9,
    fat: 15,
    fiber: 7,
    category: "fats",
    searchTerms: ["avocado", "healthy fats", "green fruit"]
  },
  {
    id: "olive_oil",
    name: "Olive Oil",
    calories: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    fiber: 0,
    category: "fats",
    searchTerms: ["olive oil", "oil", "cooking oil", "extra virgin"]
  },
  {
    id: "almonds",
    name: "Almonds",
    calories: 579,
    protein: 21,
    carbs: 22,
    fat: 50,
    fiber: 12,
    category: "fats",
    searchTerms: ["almonds", "nuts", "tree nuts"]
  },
  {
    id: "peanut_butter",
    name: "Peanut Butter",
    calories: 588,
    protein: 25,
    carbs: 20,
    fat: 50,
    fiber: 6,
    category: "fats",
    searchTerms: ["peanut butter", "pb", "nut butter", "spread"]
  },
  {
    id: "walnuts",
    name: "Walnuts",
    calories: 654,
    protein: 15,
    carbs: 14,
    fat: 65,
    fiber: 7,
    category: "fats",
    searchTerms: ["walnuts", "nuts", "omega-3"]
  },

  // Dairy
  {
    id: "milk_whole",
    name: "Whole Milk",
    calories: 61,
    protein: 3.2,
    carbs: 4.8,
    fat: 3.3,
    fiber: 0,
    category: "dairy",
    searchTerms: ["milk", "whole milk", "dairy"]
  },
  {
    id: "cheese_cheddar",
    name: "Cheddar Cheese",
    calories: 403,
    protein: 25,
    carbs: 1.3,
    fat: 33,
    fiber: 0,
    category: "dairy",
    searchTerms: ["cheese", "cheddar", "dairy"]
  },
  {
    id: "cottage_cheese",
    name: "Cottage Cheese",
    calories: 98,
    protein: 11,
    carbs: 3.4,
    fat: 4.3,
    fiber: 0,
    category: "dairy",
    searchTerms: ["cottage cheese", "cheese", "dairy", "low fat"]
  }
];

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return [];
  
  const lowercaseQuery = query.toLowerCase();
  
  return foodDatabase.filter(food => 
    food.name.toLowerCase().includes(lowercaseQuery) ||
    food.searchTerms.some(term => term.toLowerCase().includes(lowercaseQuery))
  ).slice(0, 10); // Return top 10 matches
}

export function getFoodById(id: string): FoodItem | undefined {
  return foodDatabase.find(food => food.id === id);
}

export function calculateMacros(food: FoodItem, grams: number) {
  const multiplier = grams / 100;
  return {
    calories: Math.round(food.calories * multiplier),
    protein: Math.round(food.protein * multiplier * 10) / 10,
    carbs: Math.round(food.carbs * multiplier * 10) / 10,
    fat: Math.round(food.fat * multiplier * 10) / 10,
    fiber: Math.round(food.fiber * multiplier * 10) / 10
  };
}
