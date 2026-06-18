import React, { useState } from "react";
import { Search, ShoppingBag, Moon, User } from "lucide-react";

export function Listing() {
  const [activeFilter, setActiveFilter] = useState("SHOW ALL");
  const filters = ["SHOW ALL", "KNITWEAR", "OUTERWEAR", "ACCESSORIES", "NEW"];
  const [isGrid, setIsGrid] = useState(true);

  const products = [
    { id: 1, name: "Cashmere Turtleneck", price: "4,500", image: "/__mockup/images/p1.png" },
    { id: 2, name: "Oversized Blazer", price: "12,000", image: "/__mockup/images/p2.png" },
    { id: 3, name: "Silk Slip Dress", price: "8,200", image: "/__mockup/images/p3.png" },
    { id: 4, name: "Wide Leg Trousers", price: "5,800", image: "/__mockup/images/p4.png" },
    { id: 5, name: "Structural Crossbody", price: "8,900", image: "/__mockup/images/p5.png" },
    { id: 6, name: "Signature Long Coat", price: "18,500", image: "/__mockup/images/p6.png" },
    { id: 7, name: "Merino Wool Sweater", price: "6,200", image: "/__mockup/images/p1.png" },
    { id: 8, name: "Tailored Vest", price: "9,000", image: "/__mockup/images/p2.png" },
    { id: 9, name: "Pleated Skirt", price: "4,800", image: "/__mockup/images/p3.png" },
    { id: 10, name: "Relaxed Linen Pant", price: "5,200", image: "/__mockup/images/p4.png" },
    { id: 11, name: "Leather Tote", price: "14,000", image: "/__mockup/images/p5.png" },
    { id: 12, name: "Double Breasted Coat", price: "22,000", image: "/__mockup/images/p6.png" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#F7F3EE] border-b border-[#E8E2DA] py-4 h-[80px]">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20 flex items-center justify-between h-full">
          <nav className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.3em] uppercase">
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Home</a>
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Shop</a>
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Categories</a>
            <a href="#" className="hover:text-[#C8A96B] transition-colors">New Arrivals</a>
          </nav>
          <a href="#" className="font-['Playfair_Display',Georgia,serif] text-[22px] tracking-wider absolute left-1/2 -translate-x-1/2">
            VELORA
          </a>
          <div className="flex items-center gap-6">
            <button className="hover:text-[#C8A96B] transition-colors font-serif text-sm">ع</button>
            <button className="hover:text-[#C8A96B] transition-colors"><Search size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors"><Moon size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors hidden sm:block"><User size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors relative">
              <ShoppingBag size={18} strokeWidth={1.5} />
              <span className="absolute -top-1.5 -right-1.5 bg-[#0F172A] text-white text-[9px] w-4 h-4 flex items-center justify-center">2</span>
            </button>
          </div>
        </div>
      </header>

      {/* FILTER BAR */}
      <div className="sticky top-[80px] z-40 bg-[#F7F3EE]/95 backdrop-blur-sm border-b border-[#E8E2DA]">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-8">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`text-[10px] tracking-[0.15em] uppercase transition-all pb-1 border-b ${
                  activeFilter === filter
                    ? "border-[#0F172A] text-[#0F172A] font-medium"
                    : "border-transparent text-[#0F172A]/50 hover:text-[#0F172A]"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.15em] uppercase">
            <button className="flex items-center gap-2 hover:text-[#C8A96B] transition-colors">
              SORT <span className="text-[8px]">▼</span>
            </button>
            <div className="flex gap-2">
              <button onClick={() => setIsGrid(true)} className={`${isGrid ? 'text-[#0F172A]' : 'text-[#0F172A]/30'} hover:text-[#C8A96B]`}>GRID</button>
              <span>|</span>
              <button onClick={() => setIsGrid(false)} className={`${!isGrid ? 'text-[#0F172A]' : 'text-[#0F172A]/30'} hover:text-[#C8A96B]`}>LIST</button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-10 md:px-20 py-[120px] flex flex-col lg:flex-row gap-16">
        {/* LEFT SIDEBAR (FILTERS) */}
        <aside className="w-full lg:w-[240px] flex-shrink-0">
          <div className="sticky top-[180px]">
            <div className="flex justify-between items-baseline mb-8">
              <h3 className="font-['Playfair_Display',Georgia,serif] text-[24px]">Filter</h3>
              <button className="text-[10px] tracking-[0.15em] uppercase text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">Clear All</button>
            </div>

            <div className="mb-10">
              <h4 className="text-[10px] tracking-[0.15em] uppercase mb-4 text-[#0F172A]/70">PRICE RANGE</h4>
              <div className="flex items-center gap-4 text-sm font-light">
                <input type="text" placeholder="Min" className="w-full bg-transparent border-b border-[#E8E2DA] pb-2 outline-none focus:border-[#0F172A] transition-colors" />
                <span>-</span>
                <input type="text" placeholder="Max" className="w-full bg-transparent border-b border-[#E8E2DA] pb-2 outline-none focus:border-[#0F172A] transition-colors" />
              </div>
            </div>

            <div className="mb-10">
              <h4 className="text-[10px] tracking-[0.15em] uppercase mb-4 text-[#0F172A]/70">SIZE</h4>
              <div className="grid grid-cols-3 gap-3">
                {['XS','S','M','L','XL','OS'].map(sz => (
                  <button key={sz} className="border border-[#E8E2DA] py-2 text-[11px] hover:border-[#0F172A] transition-colors bg-white">{sz}</button>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <h4 className="text-[10px] tracking-[0.15em] uppercase mb-4 text-[#0F172A]/70">COLOR</h4>
              <div className="flex flex-wrap gap-3">
                {['#0F172A','#F7F3EE','#5B1E2D','#C8A96B','#FFFFFF','#1A1A1A'].map(color => (
                  <button key={color} className="w-6 h-6 rounded-full border border-[#E8E2DA] cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: color }}></button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <div className="flex-1">
          <div className={isGrid ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10" : "flex flex-col gap-10"}>
            {products.map((product) => (
              <div key={product.id} className={`group cursor-pointer ${isGrid ? '' : 'flex gap-10 items-center'}`}>
                <div className={`relative overflow-hidden bg-white border border-[#E8E2DA] ${isGrid ? 'aspect-[3/4] mb-6' : 'w-[200px] h-[266px] flex-shrink-0'}`}>
                  <img src={product.image} alt={product.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-[#F7F3EE]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-[600ms] flex items-center justify-center">
                    <span className="text-white text-[10px] tracking-[0.3em] uppercase opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-[600ms]">QUICK VIEW</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-['Playfair_Display',Georgia,serif] text-[20px] text-[#0F172A] mb-2">{product.name}</h4>
                  <p className="text-[#0F172A]/60 font-light text-[14px]">EGP {product.price}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-20 flex justify-center">
            <button className="border border-[#0F172A] text-[#0F172A] px-12 py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#0F172A] hover:text-white transition-colors duration-[400ms]">
              LOAD MORE
            </button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] text-white pt-24 pb-12 px-10 md:px-20 border-t border-[#C8A96B]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          <div>
            <h3 className="font-['Playfair_Display',Georgia,serif] italic text-4xl mb-8">Velora</h3>
            <p className="text-white/60 font-light text-sm leading-[1.8] max-w-xs">
              Defining modern luxury through restraint, craftsmanship, and uncompromising quality.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Shop</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">New Arrivals</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Ready to Wear</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Accessories</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Help</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Client Services</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Connect</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pinterest</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto pt-8 border-t border-white/10 flex justify-between items-center text-[10px] tracking-[0.15em] uppercase text-white/50">
          <p>&copy; {new Date().getFullYear()} VELORA. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
}
