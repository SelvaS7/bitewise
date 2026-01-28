"use client";

import { useState } from "react";

interface MealConfirmModalProps {
  open: boolean;
  suggestedName: string;
  calories: number;
  onConfirm: (finalName: string) => void;
  onCancel: () => void;
}

export default function MealConfirmModal({
  open,
  suggestedName,
  calories,
  onConfirm,
  onCancel,
}: MealConfirmModalProps) {
  const [name, setName] = useState(suggestedName);

  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>Confirm Meal Name</h3>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Meal name"
          style={inputStyle}
        />

        <p style={{ marginTop: "10px" }}>
          Calories: <strong>{calories} kcal</strong>
        </p>

        <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
          <button style={confirmBtn} onClick={() => onConfirm(name)}>
            Confirm
          </button>
          <button style={cancelBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- styles --- */
const overlayStyle = {
  position: "fixed" as const,
  inset: 0,
  background: "rgba(149, 24, 24, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  width: "320px",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const confirmBtn = {
  flex: 1,
  background: "#6c63ff",
  color: "#fff",
  borderRadius: "6px",
  padding: "8px",
};

const cancelBtn = {
  flex: 1,
  background: "#eee",
  borderRadius: "6px",
  padding: "8px",
};
