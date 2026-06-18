import React, { useState } from 'react';
import { Search, Moon, User, ShoppingBag, ArrowRight, Heart } from 'lucide-react';

export function Detail() {
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('black');
  
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = [
    { id: 'black', hex: '#0F172A', name: 'Midnight' },
    { id: 'camel', hex: '#C8A96B', name: 'Champagne' },
    { id: 'ivory', hex: '#F7F3EE', name: 'Ivory' },
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

      {/* TWO-COLUMN SPLIT */}
      <main className="max-w-[1400px] mx-auto px-10 md:px-20 py-[80px] flex flex-col lg:flex-row gap-16 lg:gap-24">
        {/* LEFT GALLERY */}
        <div className="w-full lg:w-[55%]">
          <div className="aspect-[3/4] bg-white border border-[#E8E2DA] mb-6">
            <img src="/__mockup/images/product-coat.png" alt="Main product" className="w-full h-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="aspect-[3/4] bg-white border border-[#E8E2DA]">
              <img src="/__mockup/images/product-coat-detail.png" alt="Detail 1" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-[3/4] bg-white border border-[#E8E2DA]">
              <img src="/__mockup/images/p4.png" alt="Detail 2" className="w-full h-full object-cover" />
            </div>
            <div className="aspect-[3/4] bg-white border border-[#E8E2DA]">
              <img src="/__mockup/images/detail-1.png" alt="Detail 3" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* RIGHT INFO */}
        <div className="w-full lg:w-[45%] lg:sticky lg:top-[120px] self-start">
          <div className="text-[10px] tracking-[0.15em] text-[#0F172A]/50 uppercase mb-6">
            SHOP / OUTERWEAR
          </div>
          <h1 className="font-['Playfair_Display',Georgia,serif] text-[48px] md:text-[56px] leading-[1.1] mb-4 text-[#0F172A]">
            The Heritage Wool Coat
          </h1>
          <p className="text-[#0F172A]/70 font-light text-[15px] mb-8">
            Brunello Cucinelli craftsmanship.
          </p>
          <div className="font-light text-[24px] mb-12">
            EGP 18,500
          </div>

          <div className="mb-10">
            <div className="flex justify-between text-[10px] tracking-[0.15em] uppercase mb-4">
              <span>SIZE</span>
              <button className="underline text-[#0F172A]/50 hover:text-[#0F172A]">SIZE GUIDE</button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`py-3 text-[12px] border transition-colors ${
                    selectedSize === size
                      ? 'border-[#C8A96B] bg-white'
                      : 'border-[#E8E2DA] bg-white hover:border-[#0F172A]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <div className="text-[10px] tracking-[0.15em] uppercase mb-4">
              COLOR: <span className="ml-2 text-[#0F172A]">{colors.find(c => c.id === selectedColor)?.name}</span>
            </div>
            <div className="flex gap-4">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-8 h-8 rounded-full border border-[#E8E2DA] p-0.5 transition-all ${
                    selectedColor === color.id ? 'ring-1 ring-[#C8A96B]' : ''
                  }`}
                >
                  <span className="w-full h-full block rounded-full border border-[#E8E2DA]" style={{ backgroundColor: color.hex }} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-16">
            <button className="w-full border border-[#0F172A] bg-[#0F172A] text-white py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] hover:border-[#5B1E2D] transition-colors duration-[400ms]">
              ADD TO BAG
            </button>
            <button className="w-full border border-[#E8E2DA] bg-white text-[#0F172A] py-4 text-[10px] tracking-[0.3em] uppercase flex items-center justify-center gap-2 hover:border-[#0F172A] transition-colors duration-[400ms]">
              <Heart size={14} /> ADD TO WISHLIST
            </button>
          </div>

          {/* TABS */}
          <div className="border-t border-[#E8E2DA]">
            {['DETAILS', 'CARE', 'SHIPPING'].map((tab, i) => (
              <div key={tab} className="border-b border-[#E8E2DA] py-6">
                <button className="w-full flex justify-between items-center text-[10px] tracking-[0.15em] uppercase">
                  {tab}
                  <span className="text-[#C8A96B]">{i === 0 ? '—' : '+'}</span>
                </button>
                {i === 0 && (
                  <div className="mt-4 text-[14px] font-light text-[#0F172A]/70 leading-[1.8]">
                    A masterclass in tailored outerwear. Cut from premium heavyweight wool, this double-breasted coat features structured shoulders, a sharply defined waist, and peak lapels. Fully lined with cupro for a smooth drape.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* YOU MAY ALSO ADMIRE */}
      <section className="py-[120px] max-w-[1400px] mx-auto px-10 md:px-20 border-t border-[#E8E2DA]">
        <h2 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">
          You May Also Admire
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { id: 1, name: 'Cashmere Turtleneck', price: '4,500', img: '/__mockup/images/p1.png' },
            { id: 2, name: 'Oversized Blazer', price: '12,000', img: '/__mockup/images/p2.png' },
            { id: 3, name: 'Silk Slip Dress', price: '8,200', img: '/__mockup/images/p3.png' },
            { id: 4, name: 'Structured Wool Coat', price: '18,500', img: '/__mockup/images/p4.png' },
          ].map((item) => (
            <div key={item.id} className="group cursor-pointer">
              <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-white border border-[#E8E2DA]">
                <img src={item.img} alt={item.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-105" />
                <div className="absolute inset-0 bg-[#F7F3EE]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-[600ms]"></div>
              </div>
              <h4 className="font-['Playfair_Display',Georgia,serif] text-[20px] text-[#0F172A] mb-2">{item.name}</h4>
              <p className="text-[#0F172A]/60 font-light text-[14px]">EGP {item.price}</p>
            </div>
          ))}
        </div>
      </section>

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
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Help</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Client Services</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Connect</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
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
