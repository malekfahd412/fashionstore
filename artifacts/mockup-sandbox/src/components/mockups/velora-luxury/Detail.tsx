import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, ChevronDown, MessageCircle, Star, Truck, RefreshCcw, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Detail() {
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('black');
  
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = [
    { id: 'black', hex: '#111111', name: 'Black' },
    { id: 'camel', hex: '#C19A6B', name: 'Camel' },
    { id: 'ivory', hex: '#FFFFF0', name: 'Ivory' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Inter'] selection:bg-[#C9A227] selection:text-white">
      {/* 1. MINIMAL NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Menu className="w-5 h-5 cursor-pointer" />
          <Search className="w-5 h-5 cursor-pointer hidden md:block" />
        </div>
        <div className="font-['Playfair_Display'] text-2xl font-bold tracking-widest cursor-pointer">
          VELORA
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium hidden md:block cursor-pointer">ACCOUNT</span>
          <div className="relative cursor-pointer">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 bg-[#111111] text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
              1
            </span>
          </div>
        </div>
      </nav>

      {/* 2. PRODUCT HERO — TWO-COLUMN STICKY LAYOUT */}
      <div className="flex flex-col md:flex-row relative items-start">
        {/* LEFT COLUMN */}
        <div className="w-full md:w-[60%] flex flex-col gap-0.5">
          <img src="/__mockup/images/detail-1.png" alt="Full product shot" className="w-full h-auto object-cover" />
          <img src="/__mockup/images/detail-2.png" alt="Side view" className="w-full h-auto object-cover" />
          <img src="/__mockup/images/detail-3.png" alt="Detail shot" className="w-full h-auto object-cover" />
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full md:w-[40%] md:sticky md:top-[73px] md:h-[calc(100vh-73px)] overflow-y-auto hide-scrollbar bg-white py-12 px-8 md:py-16 md:px-12">
          
          <div className="max-w-md mx-auto md:mx-0">
            <div className="text-xs tracking-[0.2em] text-gray-400 font-semibold mb-4">
              OUTERWEAR / COATS
            </div>
            
            <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] font-medium leading-tight text-[#111111]">
              The Obsidian Coat
            </h1>
            
            <div className="text-2xl mt-4 font-light">
              EGP 3,200
            </div>
            
            <hr className="my-8 border-gray-200" />
            
            <div className="mb-8">
              <div className="text-xs tracking-[0.2em] text-gray-400 font-semibold mb-2">MATERIAL</div>
              <div className="text-sm text-gray-600">100% Merino Wool — Woven in Italy</div>
            </div>
            
            {/* SIZE SELECTOR */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs tracking-[0.2em] text-gray-400 font-semibold">SIZE</div>
                <div className="text-xs underline text-gray-500 cursor-pointer hover:text-black">Size Guide</div>
              </div>
              <div className="flex gap-3">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-12 flex items-center justify-center text-sm transition-all duration-300 ${
                      selectedSize === size
                        ? 'bg-[#111111] text-white border border-[#111111]'
                        : 'bg-white text-[#111111] border border-gray-200 hover:border-black'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            
            {/* COLOR SELECTOR */}
            <div className="mb-10">
              <div className="text-xs tracking-[0.2em] text-gray-400 font-semibold mb-4">
                COLOR: <span className="text-[#111111] ml-2 capitalize">{colors.find(c => c.id === selectedColor)?.name}</span>
              </div>
              <div className="flex gap-4">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color.id ? 'border-[#C9A227] p-1' : 'border-transparent'
                    }`}
                  >
                    <span 
                      className="w-full h-full block rounded-full border border-gray-200" 
                      style={{ backgroundColor: color.hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <button className="w-full h-14 bg-[#111111] text-white text-sm tracking-[0.1em] font-medium hover:bg-black/90 transition-colors mb-4">
              ADD TO CART
            </button>
            
            <button className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors py-2">
              <MessageCircle className="w-4 h-4" />
              <span>or Buy with WhatsApp</span>
            </button>
            
            <hr className="my-8 border-gray-200" />
            
            {/* Accordions */}
            <div className="space-y-4">
              {[
                { title: 'Product Details', content: 'Crafted from ultra-fine Italian merino wool, the Obsidian Coat offers a flawless drape and superior warmth without the weight. Features a relaxed tailored fit, hidden button closure, and hand-finished seams.' },
                { title: 'Shipping & Returns', content: 'Free standard shipping on all orders over EGP 500. Next day delivery available in Cairo. Returns accepted within 14 days of delivery in original condition.' },
                { title: 'Size Guide', content: 'Model is 178cm/5\'10" and wears a size S. We recommend taking your usual size for a tailored fit, or sizing up for a more relaxed look.' }
              ].map((item, i) => (
                <div key={i} className="border-b border-gray-200 pb-4">
                  <button className="w-full flex justify-between items-center text-sm font-medium uppercase tracking-wider text-gray-800">
                    {item.title}
                    <ChevronDown className="w-4 h-4 text-[#C9A227]" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Trust Badges */}
            <div className="flex flex-col gap-4 mt-8 pt-8 bg-gray-50 p-6 rounded-sm">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <Truck className="w-5 h-5 text-[#C9A227]" />
                <span>Free shipping over EGP 500</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <RefreshCcw className="w-5 h-5 text-[#C9A227]" />
                <span>Easy 14-day returns</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <ShieldCheck className="w-5 h-5 text-[#C9A227]" />
                <span>100% Authentic Guaranteed</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* 3. EDITORIAL STORY SECTION */}
      <div className="bg-[#F5F5F5] py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl md:text-5xl font-['Playfair_Display'] mb-8 text-[#111111]">
              The Making Of
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6 font-light">
              Every Obsidian Coat begins its journey in the historic textile mills of Biella, Italy, where generations of artisans have perfected the art of wool weaving. We selected a premium 100% Merino wool that offers an unparalleled combination of warmth, durability, and a remarkably soft hand-feel.
            </p>
            <p className="text-gray-600 leading-relaxed font-light">
              Back in our atelier, each piece is cut and assembled by skilled craftsmen who dedicate hours to hand-finishing the interior seams and precisely aligning the silhouette. It's a commitment to slow fashion and enduring quality that you can feel the moment you slip it on.
            </p>
            <button className="mt-8 text-sm uppercase tracking-widest font-semibold flex items-center gap-2 border-b-2 border-[#C9A227] pb-1 hover:text-[#C9A227] transition-colors inline-flex">
              Explore Our Craft <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full md:w-1/2">
            <img 
              src="/__mockup/images/detail-story.png" 
              alt="Atelier workspace" 
              className="w-full h-auto object-cover shadow-xl"
            />
          </div>
        </div>
      </div>

      {/* 4. RELATED PRODUCTS */}
      <div className="bg-white py-24 px-6 md:px-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-['Playfair_Display'] text-center mb-16 text-[#111111]">
            You May Also Like
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Product 1 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                <img src="/__mockup/images/p1.jpg" alt="Related Product" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-full bg-white text-[#111111] py-3 text-sm font-medium tracking-wider hover:bg-[#111111] hover:text-white transition-colors">
                    QUICK VIEW
                  </button>
                </div>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg text-[#111111]">The Silk Slip Dress</h3>
              <p className="text-gray-500 text-sm mt-1">EGP 2,400</p>
            </div>
            
            {/* Product 2 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                <img src="/__mockup/images/p2.jpg" alt="Related Product" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-full bg-white text-[#111111] py-3 text-sm font-medium tracking-wider hover:bg-[#111111] hover:text-white transition-colors">
                    QUICK VIEW
                  </button>
                </div>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg text-[#111111]">Tailored Wool Blazer</h3>
              <p className="text-gray-500 text-sm mt-1">EGP 3,800</p>
            </div>
            
            {/* Product 3 */}
            <div className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                <img src="/__mockup/images/p3.jpg" alt="Related Product" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="w-full bg-white text-[#111111] py-3 text-sm font-medium tracking-wider hover:bg-[#111111] hover:text-white transition-colors">
                    QUICK VIEW
                  </button>
                </div>
              </div>
              <h3 className="font-['Playfair_Display'] text-lg text-[#111111]">Cashmere Turtleneck</h3>
              <p className="text-gray-500 text-sm mt-1">EGP 1,950</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Minimal */}
      <footer className="bg-[#111111] text-white py-12 text-center border-t border-gray-800">
        <div className="font-['Playfair_Display'] text-2xl font-bold tracking-widest mb-6">
          VELORA
        </div>
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} VELORA Luxury. All rights reserved.</p>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
