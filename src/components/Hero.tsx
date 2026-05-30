"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Calendar, MapPin } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 md:py-32">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="container relative z-10 px-4 md:px-8">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-400/10 rounded-full border border-indigo-400/20">
              Featured Event
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
              Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Unforgettable</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl">
              Discover and book tickets for the most exclusive concerts, festivals, and sporting events happening near you.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-full h-12 text-base">
                Explore Events
              </Button>
              <Button size="lg" variant="outline" className="text-white border-slate-700 hover:bg-slate-800 px-8 rounded-full h-12 text-base">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;