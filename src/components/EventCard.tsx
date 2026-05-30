"use client";

import React from 'react';
import { Calendar, MapPin, Star } from 'lucide-react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  price: string;
  image: string;
  category: string;
  rating: number;
}

const EventCard = ({ title, date, location, price, image, category, rating }: EventCardProps) => {
  const handleBook = () => {
    showSuccess(`Successfully added ${title} to your cart!`);
  };

  return (
    <Card className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl bg-white">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 text-indigo-600 hover:bg-white border-none backdrop-blur-sm font-semibold">
            {category}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-bold">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {rating}
          </div>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold mb-2">
          <Calendar className="h-4 w-4" />
          {date}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1 text-slate-500 text-sm">
          <MapPin className="h-4 w-4" />
          {location}
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block">Starting from</span>
          <span className="text-xl font-bold text-slate-900">{price}</span>
        </div>
        <Button 
          onClick={handleBook}
          className="bg-slate-900 hover:bg-indigo-600 text-white rounded-xl px-6 transition-colors"
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EventCard;