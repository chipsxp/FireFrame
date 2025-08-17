"use client"

import React from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
    // This is a simplified template, you could add framer-motion here for animations
    // For now, we will use CSS for a simple fade-in
    return <div className="animate-fade-in">{children}</div>;
}

// Add this to your tailwind.config.ts if it does not exist:
/*
theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
      },
    },
},
*/
