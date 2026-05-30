"use client";

import React from 'react';
import { Ticket, Github, Twitter, Instagram, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-50 border-t pt-16 pb-8">
      <div className="container px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-indigo-600">
                SimplyTicketz
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed mb-6">
              The world's leading platform for discovering and booking tickets to the most exciting events.
            </p>
            <div className="flex gap-4">
              <Twitter className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
              <Facebook className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
              <Github className="h-5 w-5 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Explore</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Concerts</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Sports</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Theater</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Festivals</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Press</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Contact</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Support</h4>
            <ul className="space-y-4 text-slate-500">
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Help Center</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Safety</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-indigo-600 cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            © 2024 SimplyTicketz Inc. All rights reserved.
          </p>
          <div className="flex gap-8 text-sm text-slate-400">
            <span className="hover:text-indigo-600 cursor-pointer">Privacy</span>
            <span className="hover:text-indigo-600 cursor-pointer">Terms</span>
            <span className="hover:text-indigo-600 cursor-pointer">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;