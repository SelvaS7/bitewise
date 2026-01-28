export async function getFoodMacros(foodName: string) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/foods/macros?id=${foodName}`);
    if (!res.ok) throw new Error("Failed to fetch food data");
    return await res.json();
  } catch (err) {
    console.error("Nutrition fetch error:", err);
    return { error: "Unable to fetch nutrition info" };
  }
}
