"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import { Music, Trophy, Theater, Utensils, Camera, Sparkles } from 'lucide-react';

const categories = [
  { name: 'All', icon: Sparkles },
  { name: 'Music', icon: Music },
  { name: 'Sports', icon: Trophy },
  { name: 'Arts', icon: Theater },
  { name: 'Food', icon: Utensils },
  { name: 'Nightlife', icon: Camera },
];

const CategoryFilter = () => {
  const [active, setActive] = React.useState('All');

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = active === cat.name;
        return (
          <button
            key={cat.name}
            onClick={() => setActive(cat.name)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-200 whitespace-nowrap font-medium",
              isActive 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
            )}
          >
            <Icon className="h-4 w-4" />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;