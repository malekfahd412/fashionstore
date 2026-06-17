import React, { useState } from "react";
import { Search, ShoppingBag, Menu, User, Grid2X2 } from "lucide-react";

export function Listing() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Knitwear", "Outerwear", "Accessories", "New"];

  const products = [
    {
      id: 1,
      name: "The Essential Turtleneck",
      price: "4,500",
      image: "/__mockup/images/p1.png",
    },
    {
      id: 2,
      name: "Oversized Camel Blazer",
      price: "12,000",
      image: "/__mockup/images/p2.png",
    },
    {
      id: 3,
      name: "Silk Minimalist Blouse",
      price: "6,200",
      image: "/__mockup/images/p3.png",
    },
    {
      id: 4,
      name: "Wide Leg Trousers",
      price: "5,800",
      image: "/__mockup/images/p4.png",
    },
    {
      id: 5,
      name: "Structural Crossbody",
      price: "8,900",
      image: "/__mockup/images/p5.png",
    },
    {
      id: 6,
      name: "Signature Long Coat",
      price: "18,500",
      image: "/__mockup/images/p6.png",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Inter']">
      {/* 1. MINIMAL NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Menu className="w-5 h-5 cursor-pointer" />
          <div className="hidden md:flex items-center gap-6 text-sm tracking-wide">
            <a href="#" className="hover:text-[#C9A227] transition-colors">NEW ARRIVALS</a>
            <a href="#" className="hover:text-[#C9A227] transition-colors">COLLECTIONS</a>
          </div>
        </div>
        
        <a href="/" className="text-2xl font-['Playfair_Display'] font-bold tracking-wider absolute left-1/2 -translate-x-1/2">
          VELORA
        </a>
        
        <div className="flex items-center gap-5">
          <Search className="w-5 h-5 cursor-pointer hover:text-[#C9A227] transition-colors" />
          <User className="w-5 h-5 cursor-pointer hover:text-[#C9A227] transition-colors" />
          <ShoppingBag className="w-5 h-5 cursor-pointer hover:text-[#C9A227] transition-colors" />
        </div>
      </nav>

      {/* 2. PAGE HEADER */}
      <header className="bg-[#111111] text-white py-20 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <span className="block tracking-[0.2em] text-xs text-[#C9A227] mb-4">THE COLLECTION</span>
          <h1 className="text-6xl font-['Playfair_Display'] mb-4">All Pieces</h1>
          <p className="text-gray-400 text-sm">72 pieces</p>
        </div>
      </header>

      {/* 3. MINIMAL FILTER BAR */}
      <div className="bg-white border-b border-gray-100 py-4 px-8 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-[65px] z-40">
        <div className="flex flex-wrap items-center gap-8">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`text-sm tracking-wide transition-all ${
                activeFilter === filter
                  ? "border-b border-[#111111] pb-1 font-medium"
                  : "text-gray-500 hover:text-[#111111]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <button className="flex items-center gap-2 hover:text-[#C9A227] transition-colors">
            Sort: New Arrivals <span className="text-xs">↓</span>
          </button>
          <Grid2X2 className="w-4 h-4 cursor-pointer text-gray-400 hover:text-[#111111] transition-colors" />
        </div>
      </div>

      {/* 4. MASONRY PRODUCT GRID & 5. EDITORIAL BREAK */}
      <main className="max-w-[2000px] mx-auto pb-24">
        <div className="p-0">
          <style>{`
            .masonry-grid {
              column-count: 1;
              column-gap: 2px;
            }
            @media (min-width: 640px) {
              .masonry-grid {
                column-count: 2;
              }
            }
            @media (min-width: 1024px) {
              .masonry-grid {
                column-count: 3;
              }
            }
            .masonry-item {
              break-inside: avoid;
              margin-bottom: 2px;
            }
          `}</style>
          
          <div className="masonry-grid">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="masonry-item relative group overflow-hidden cursor-pointer">
                <div className="bg-[#F9F9F9] w-full h-full">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                
                {/* Hover overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                  <div className="flex justify-between items-end">
                    <div className="text-white">
                      <h3 className="font-['Playfair_Display'] text-xl mb-1">{product.name}</h3>
                      <p className="text-sm font-light tracking-wide">{product.price} EGP</p>
                    </div>
                    <button className="px-5 py-2 bg-white/10 hover:bg-white text-white hover:text-black text-xs uppercase tracking-widest backdrop-blur-sm border border-white/20 transition-all">
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. EDITORIAL BREAK */}
        <div className="w-full bg-[#F5F5F5] py-20 my-2">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="text-3xl font-['Playfair_Display'] italic text-[#111111]">
              "Pieces designed to outlast trends."
            </h2>
            <div className="w-16 h-px bg-[#C9A227] mx-auto mt-6"></div>
          </div>
        </div>

        <div className="p-0">
          <div className="masonry-grid">
            {products.slice(3, 6).map((product) => (
              <div key={product.id} className="masonry-item relative group overflow-hidden cursor-pointer">
                <div className="bg-[#F9F9F9] w-full h-full">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                
                {/* Hover overlay info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                  <div className="flex justify-between items-end">
                    <div className="text-white">
                      <h3 className="font-['Playfair_Display'] text-xl mb-1">{product.name}</h3>
                      <p className="text-sm font-light tracking-wide">{product.price} EGP</p>
                    </div>
                    <button className="px-5 py-2 bg-white/10 hover:bg-white text-white hover:text-black text-xs uppercase tracking-widest backdrop-blur-sm border border-white/20 transition-all">
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      {/* Minimal Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 px-8 flex flex-col items-center">
        <h2 className="text-2xl font-['Playfair_Display'] font-bold tracking-wider mb-6">VELORA</h2>
        <div className="flex gap-8 text-xs tracking-[0.1em] text-gray-500 uppercase mb-8">
          <a href="#" className="hover:text-[#111111]">Instagram</a>
          <a href="#" className="hover:text-[#111111]">Pinterest</a>
          <a href="#" className="hover:text-[#111111]">Contact</a>
        </div>
        <p className="text-xs text-gray-400">© 2024 VELORA. All rights reserved.</p>
      </footer>
    </div>
  );
}
