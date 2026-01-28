"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user has completed onboarding
    const userProfile = localStorage.getItem("userProfile");
    if (userProfile) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'system-ui'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🍽️ BiteWise</h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>Loading your nutrition journey...</p>
      </div>
    </div>
  );
}
