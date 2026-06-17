import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, Globe, User, ShoppingBag, Heart, ArrowRight } from 'lucide-react';

export function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#111111] font-['Inter',sans-serif]">
      {/* 1. NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          isScrolled ? 'bg-[#111111] py-4 border-white/10' : 'bg-transparent py-6 border-transparent'
        } text-white`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <nav className="hidden md:flex items-center gap-8 text-[9px] tracking-[0.35em] font-bold uppercase">
            <a href="#" className="hover:text-[#C9A227] transition-colors">Home</a>
            <a href="#" className="hover:text-[#C9A227] transition-colors">Shop</a>
            <a href="#" className="hover:text-[#C9A227] transition-colors">Categories</a>
            <a href="#" className="hover:text-[#C9A227] transition-colors">New Arrivals</a>
          </nav>
          
          <a href="#" className="font-['Playfair_Display'] text-3xl tracking-widest absolute left-1/2 -translate-x-1/2">
            VELORA
          </a>

          <div className="flex items-center gap-6">
            <button className="hover:text-[#C9A227] transition-colors"><Search size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C9A227] transition-colors"><Moon size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C9A227] transition-colors font-serif text-sm">ع</button>
            <button className="hover:text-[#C9A227] transition-colors hidden sm:block"><User size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C9A227] transition-colors relative">
              <ShoppingBag size={18} strokeWidth={1.5} />
              <span className="absolute -top-1.5 -right-1.5 bg-[#C9A227] text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">2</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO */}
      <section className="h-screen w-full bg-[#111111] flex flex-col md:flex-row relative overflow-hidden">
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 z-10">
          <p className="text-[#C9A227] text-[9px] tracking-[0.35em] font-bold uppercase mb-6">
            NEW COLLECTION — SS 2026
          </p>
          <h1 className="text-white font-['Playfair_Display'] text-6xl md:text-8xl lg:text-[100px] leading-[0.9] mb-10">
            Dress with<br />Intention
          </h1>
          <div>
            <a href="#" className="inline-flex items-center gap-2 border-b border-white text-white hover:text-[#C9A227] hover:border-[#C9A227] transition-colors pb-1 text-sm tracking-wider uppercase">
              SHOP NOW <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <div className="flex-1 relative h-[50vh] md:h-full">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] mix-blend-luminosity opacity-80">
            {/* Subtle overlay to look like a dark photo */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent md:hidden" />
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 z-10 animate-bounce">
          <span className="text-[9px] tracking-[0.35em] uppercase font-bold">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* 3. MARQUEE STRIP */}
      <div className="bg-[#0B0B0B] py-3 overflow-hidden border-y border-white/5">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] text-[#C9A227] text-[10px] tracking-[0.2em] font-bold uppercase">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="mx-4">
              FREE SHIPPING ON ORDERS OVER 500 EGP · NEW ARRIVALS EVERY WEEK · MEMBERS GET EXCLUSIVE ACCESS ·
            </span>
          ))}
        </div>
      </div>

      {/* 4. FEATURED CATEGORIES */}
      <section className="py-24 px-6 max-w-7xl mx-auto bg-[#F8F6F2]">
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-center mb-16">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
          {[
            { name: 'WOMEN', gradient: 'from-[#c9b99a] to-[#8d7b68]' },
            { name: 'MEN', gradient: 'from-[#4a4e54] to-[#1a1c1f]' },
            { name: 'ACCESSORIES', gradient: 'from-[#b8a88a] to-[#7a6a52]' },
            { name: 'SALE', gradient: 'from-[#8b1a1a] to-[#3d0a0a]' }
          ].map((cat) => (
            <div key={cat.name} className="group relative aspect-[3/4] overflow-hidden cursor-pointer bg-[#FFFFFF]">
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} transition-transform duration-700 group-hover:scale-105`} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/80 via-transparent to-transparent opacity-80" />
              <h3 className="absolute bottom-8 left-8 text-white font-['Playfair_Display'] text-3xl md:text-4xl">
                {cat.name}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* 5. NEW ARRIVALS */}
      <section className="py-24 pl-6 overflow-hidden bg-[#F8F6F2] border-y border-[#E7E3DB]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 pr-6">
            <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl">New Arrivals</h2>
            <a href="#" className="text-[9px] tracking-[0.35em] font-bold uppercase border-b border-[#111111] pb-1 hover:text-[#C9A227] hover:border-[#C9A227] transition-colors hidden sm:block">
              View All
            </a>
          </div>
          
          <div className="flex overflow-x-auto gap-6 pb-8 snap-x hide-scrollbar pr-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="min-w-[280px] md:min-w-[320px] snap-start group cursor-pointer">
                <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-[#FFFFFF]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#e8e4dc] to-[#c8c4bc]" />
                  <button className="absolute top-4 right-4 text-[#111111]/50 hover:text-[#C9A227] transition-colors z-10">
                    <Heart size={20} strokeWidth={1.5} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button className="w-full text-[10px] tracking-widest uppercase font-bold text-[#111111] hover:text-[#C9A227]">
                      QUICK ADD
                    </button>
                  </div>
                </div>
                <h4 className="font-['Playfair_Display'] text-lg mb-1 group-hover:text-[#C9A227] transition-colors">
                  Structured Wool Coat
                </h4>
                <p className="text-[#6B6B6B] text-sm">8,500 EGP</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EDITORIAL STRIP */}
      <section className="py-32 bg-[#111111] text-center px-6">
        <div className="max-w-4xl mx-auto">
          <div className="w-12 h-0.5 bg-[#C9A227] mx-auto mb-10" />
          <h2 className="font-['Playfair_Display'] italic text-3xl md:text-5xl lg:text-6xl text-white leading-tight">
            "Style is a way to say who you are without having to speak."
          </h2>
          <p className="text-[#C9A227] mt-8 text-[9px] tracking-[0.35em] uppercase font-bold">
            — Rachel Zoe
          </p>
        </div>
      </section>

      {/* 7. BEST SELLERS */}
      <section className="py-24 px-6 max-w-7xl mx-auto bg-[#F8F6F2]">
        <div className="flex justify-between items-end mb-12">
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl">Best Sellers</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-[3/4] mb-6 overflow-hidden bg-[#FFFFFF]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#e8e4dc] to-[#c8c4bc]" />
                <div className="absolute top-4 left-4 bg-[#C9A227] text-white text-[8px] tracking-[0.2em] font-bold uppercase px-2 py-1">
                  BEST SELLER
                </div>
                <button className="absolute top-4 right-4 text-[#111111]/50 hover:text-[#C9A227] transition-colors z-10">
                  <Heart size={20} strokeWidth={1.5} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <button className="w-full text-[10px] tracking-widest uppercase font-bold text-[#111111] hover:text-[#C9A227]">
                    QUICK ADD
                  </button>
                </div>
              </div>
              <h4 className="font-['Playfair_Display'] text-lg mb-1 group-hover:text-[#C9A227] transition-colors">
                Silk Evening Slip
              </h4>
              <p className="text-[#6B6B6B] text-sm">4,200 EGP</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BRAND STORY */}
      <section className="py-24 bg-[#F8F6F2] border-y border-[#E7E3DB]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="aspect-[3/4] lg:aspect-[4/5] bg-gradient-to-br from-[#2c2420] to-[#1a1512] w-full" />
          <div className="max-w-lg">
            <p className="text-[#111111] text-[9px] tracking-[0.35em] font-bold uppercase mb-6">
              OUR STORY
            </p>
            <h2 className="font-['Playfair_Display'] text-5xl md:text-6xl mb-8 leading-tight">
              Crafted for the<br />Discerning Few.
            </h2>
            <p className="text-[#6B6B6B] mb-10 leading-relaxed text-lg">
              Every stitch, every cut, every fabric choice is an exercise in restraint and precision. We design for those who understand that true luxury doesn't scream—it whispers.
            </p>
            <a href="#" className="inline-flex items-center gap-2 border-b border-[#C9A227] text-[#C9A227] pb-1 text-[10px] tracking-[0.2em] uppercase font-bold hover:text-[#111111] hover:border-[#111111] transition-colors">
              DISCOVER MORE <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 9. NEWSLETTER */}
      <section className="py-32 bg-[#0B0B0B] text-center px-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-[#C9A227] text-[9px] tracking-[0.35em] font-bold uppercase mb-6">
            JOIN THE VELORA CIRCLE
          </p>
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-white mb-12">
            Be the first to know.
          </h2>
          <form className="flex flex-col sm:flex-row gap-4 justify-center" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Email Address" 
              className="bg-transparent border border-white text-white px-6 py-4 outline-none focus:border-[#C9A227] transition-colors w-full sm:w-80 placeholder:text-white/40"
            />
            <button className="bg-white text-[#0B0B0B] px-8 py-4 text-[10px] tracking-[0.2em] font-bold uppercase hover:bg-[#C9A227] hover:text-white transition-colors">
              SUBSCRIBE
            </button>
          </form>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-[#111111] text-white/60 pt-20 pb-10 px-6 border-t border-[#111111]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-sm">
          <div>
            <h3 className="font-['Playfair_Display'] text-3xl text-white tracking-widest mb-6">VELORA</h3>
            <p className="mb-6 max-w-xs leading-relaxed text-white/60">Elevated essentials for the modern minimalist. Designed in Paris, crafted globally.</p>
            <div className="flex gap-4">
              {['Instagram', 'Pinterest', 'Twitter'].map(social => (
                <a key={social} href="#" className="hover:text-white transition-colors">{social}</a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white text-[10px] tracking-[0.2em] uppercase font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors text-white/60">Shop Women</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">Shop Men</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">New Arrivals</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">The Journal</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-[10px] tracking-[0.2em] uppercase font-bold mb-6">Customer Service</h4>
            <ul className="space-y-4">
              <li><a href="#" className="hover:text-white transition-colors text-white/60">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">Track Order</a></li>
              <li><a href="#" className="hover:text-white transition-colors text-white/60">Size Guide</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-[10px] tracking-[0.2em] uppercase font-bold mb-6">Contact</h4>
            <ul className="space-y-4">
              <li><a href="mailto:hello@velora.com" className="hover:text-white transition-colors text-white/60">hello@velora.com</a></li>
              <li><a href="tel:+18001234567" className="hover:text-white transition-colors text-white/60">+1 800 123 4567</a></li>
              <li className="mt-6 text-white/60">Mon - Fri, 9am - 6pm EST</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-[0.1em] uppercase">
          <p className="text-white/60">&copy; {new Date().getFullYear()} VELORA. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors text-white/60">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors text-white/60">Terms of Service</a>
          </div>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        /* Using inline styles for scrollbar hiding as well, to be robust */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #F8F6F2;
        }
        ::-webkit-scrollbar-thumb {
          background: #E7E3DB;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #C9A227;
        }
      `}} />
    </div>
  );
}
