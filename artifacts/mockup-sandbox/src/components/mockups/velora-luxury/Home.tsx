import React, { useState, useEffect } from 'react';
import { Search, Moon, User, ShoppingBag, ArrowRight } from 'lucide-react';

export function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white">
      {/* NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[300ms] border-b ${
          isScrolled ? 'bg-[#F7F3EE] border-[#E8E2DA] py-4 text-[#0F172A]' : 'bg-transparent border-transparent py-6 text-white'
        }`}
      >
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
              <span className={`absolute -top-1.5 -right-1.5 ${isScrolled ? 'bg-[#0F172A]' : 'bg-white text-[#0F172A]'} ${isScrolled ? 'text-white' : ''} text-[9px] w-4 h-4 flex items-center justify-center`}>2</span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="h-[100vh] w-full bg-[#0F172A] flex flex-col md:flex-row relative">
        <div className="flex-1 flex flex-col justify-center px-10 md:px-20 z-10 text-white">
          <p className="text-[#C8A96B] text-[10px] tracking-[0.15em] uppercase mb-8">
            SS 2026 COLLECTION
          </p>
          <h1 className="font-['Playfair_Display',Georgia,serif] text-[80px] md:text-[120px] leading-[1.1] mb-12">
            Dressed<br />in<br />Silence
          </h1>
          <div className="w-16 h-px bg-[#C8A96B] mb-12"></div>
          <div>
            <a href="#" className="inline-flex items-center gap-4 text-[10px] tracking-[0.3em] uppercase hover:text-[#C8A96B] transition-colors">
              EXPLORE THE COLLECTION <ArrowRight size={16} strokeWidth={1} />
            </a>
          </div>
        </div>
        <div className="flex-1 relative">
          <img src="/__mockup/images/hero-velora.png" alt="Velora Hero" className="absolute inset-0 w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/80 to-transparent"></div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-[180px] max-w-[1400px] mx-auto px-10 md:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { name: 'Knitwear', img: '/__mockup/images/cat-knitwear.png' },
            { name: 'Outerwear', img: '/__mockup/images/cat-outerwear.png' },
            { name: 'Accessories', img: '/__mockup/images/cat-accessories.png' }
          ].map((cat) => (
            <div key={cat.name} className="group relative h-[600px] overflow-hidden cursor-pointer bg-white">
              <img src={cat.img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-[500ms]"></div>
              <h3 className="absolute bottom-10 left-10 text-white font-['Playfair_Display',Georgia,serif] text-[48px]">
                {cat.name}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="py-[120px] max-w-[1400px] mx-auto px-10 md:px-20">
        <h2 className="font-['Playfair_Display',Georgia,serif] italic text-[48px] md:text-[64px] mb-16 text-[#0F172A]">
          New Arrivals.
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

      {/* EDITORIAL STRIP */}
      <section className="w-full bg-[#0F172A] flex flex-col md:flex-row">
        <div className="flex-1 flex items-center justify-center p-20 text-center md:text-left">
          <h2 className="font-['Playfair_Display',Georgia,serif] italic text-[40px] md:text-[56px] text-white leading-[1.2] max-w-lg">
            "Garments that outlast seasons."
          </h2>
        </div>
        <div className="flex-1 h-[60vh] md:h-auto">
          <img src="/__mockup/images/detail-story.png" alt="Editorial" className="w-full h-full object-cover" />
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="py-[180px] px-10 md:px-20 overflow-hidden bg-[#F7F3EE]">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="font-['Playfair_Display',Georgia,serif] text-[48px] md:text-[64px] mb-16 text-[#0F172A]">
            Best Sellers
          </h2>
          <div className="flex gap-10 overflow-x-auto pb-10 hide-scrollbar snap-x">
            {[1,2,3,4,5].map((num) => (
              <div key={num} className="min-w-[300px] md:min-w-[400px] snap-start group cursor-pointer">
                <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-white border border-[#E8E2DA]">
                  <img src={`/__mockup/images/p${num}.png`} alt={`Product ${num}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-105" />
                </div>
                <h4 className="font-['Playfair_Display',Georgia,serif] text-[20px] text-[#0F172A] mb-2">Signature Piece {num}</h4>
                <p className="text-[#0F172A]/60 font-light text-[14px]">EGP 9,500</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-[120px] bg-[#FFFFFF] text-center px-10 md:px-20 border-t border-[#E8E2DA]">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-['Playfair_Display',Georgia,serif] text-[48px] md:text-[56px] text-[#0F172A] mb-8">
            Join the inner circle
          </h2>
          <p className="text-[#0F172A]/70 mb-12 font-light text-[15px]">Exclusive access to collections, private events, and editorial content.</p>
          <form className="flex flex-col sm:flex-row gap-0 justify-center max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Email Address" 
              className="bg-transparent border-b border-[#0F172A] text-[#0F172A] px-4 py-4 outline-none focus:border-[#C8A96B] transition-colors w-full placeholder:text-[#0F172A]/40 rounded-none text-sm"
            />
            <button className="bg-[#0F172A] text-white px-10 py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] transition-colors duration-[400ms] mt-4 sm:mt-0 whitespace-nowrap">
              SUBSCRIBE
            </button>
          </form>
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
              <li><a href="#" className="hover:text-white transition-colors">Ready to Wear</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Accessories</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Collections</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Help</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Client Services</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Track Order</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Care Guide</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-[0.3em] uppercase mb-8 text-[#C8A96B]">Connect</h4>
            <ul className="space-y-4 text-sm font-light text-white/70">
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pinterest</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Journal</a></li>
              <li className="pt-4"><a href="#" className="hover:text-white transition-colors">عربي</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] tracking-[0.15em] uppercase text-white/50">
          <p>&copy; {new Date().getFullYear()} VELORA. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">PRIVACY</a>
            <a href="#" className="hover:text-white transition-colors">TERMS</a>
          </div>
        </div>
      </footer>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
