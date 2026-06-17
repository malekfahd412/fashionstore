import React from 'react';
import { Search, ShoppingBag, User } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-['Inter'] text-[#111111] overflow-x-hidden">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E5E5] h-16 flex items-center justify-between px-6 lg:px-12">
        <div className="flex-1">
          <a href="#" className="font-['Playfair_Display'] font-bold text-2xl tracking-wider">VELORA</a>
        </div>
        
        <nav className="hidden md:flex flex-1 justify-center gap-8 text-sm uppercase tracking-widest text-gray-800">
          <a href="#" className="hover:text-black">Home</a>
          <a href="#" className="hover:text-black">Shop</a>
          <a href="#" className="hover:text-black">Categories</a>
          <a href="#" className="hover:text-black">New Arrivals</a>
        </nav>

        <div className="flex-1 flex justify-end items-center gap-6">
          <button className="hover:text-gray-600"><Search className="w-5 h-5" /></button>
          <button className="font-sans font-medium text-lg hover:text-gray-600 pb-1">ع</button>
          <button className="hover:text-gray-600 hidden sm:block"><User className="w-5 h-5" /></button>
          <button className="hover:text-gray-600 relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1.5 bg-[#C9A227] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </button>
        </div>
      </header>

      {/* FULL-SCREEN HERO */}
      <section className="relative h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#111111] text-white overflow-hidden">
        <div className="w-full md:w-[45%] h-full flex flex-col justify-center px-8 lg:px-20 z-10">
          <span className="text-[#C9A227] text-xs uppercase tracking-[0.2em] font-medium mb-6 block">
            NEW COLLECTION — SS 2026
          </span>
          <h1 className="font-['Playfair_Display'] text-6xl md:text-[80px] leading-[0.9] mb-6">
            Dress with<br />Intention
          </h1>
          <p className="text-white/70 text-lg mb-10 max-w-md">
            Discover the season's most considered pieces.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="px-8 py-4 bg-transparent border border-white text-white hover:bg-white hover:text-black transition-colors uppercase tracking-widest text-sm font-medium">
              Shop Now →
            </button>
            <button className="px-8 py-4 text-white/70 hover:text-white transition-colors uppercase tracking-widest text-sm font-medium">
              Explore
            </button>
          </div>

          <div className="absolute bottom-8 left-8 lg:left-20 flex items-center gap-4 text-xs tracking-widest uppercase text-white/50">
            <span>Scroll</span>
            <div className="w-16 h-[1px] bg-white/30"></div>
          </div>
        </div>

        <div className="w-full md:w-[55%] h-full absolute md:relative inset-0 opacity-40 md:opacity-100">
          <img 
            src="/__mockup/images/hero-velora.png" 
            alt="Hero Fashion Editorial" 
            className="w-full h-full object-cover"
          />
        </div>
      </section>

      {/* EDITORIAL STORY SECTION */}
      <section className="w-full bg-[#F5F5F5] flex flex-col md:flex-row">
        <div className="w-full md:w-[60%] h-[60vh] md:min-h-[500px]">
          <img 
            src="/__mockup/images/story-fabric.png" 
            alt="Fabric Texture" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="w-full md:w-[40%] flex flex-col justify-center p-12 lg:p-24">
          <span className="text-gray-500 text-xs uppercase tracking-[0.2em] font-medium mb-4 block">
            THE CRAFT
          </span>
          <h2 className="font-['Playfair_Display'] text-4xl mb-6">
            Fabric-first design philosophy
          </h2>
          <p className="text-gray-600 text-base leading-relaxed mb-8">
            Every garment begins with the material. We source our textiles from the finest mills, prioritizing natural fibers that wear beautifully over time and drape with effortless elegance. Quality is not an afterthought; it is our foundation.
          </p>
          <a href="#" className="inline-block border-b border-black pb-1 uppercase tracking-widest text-sm font-medium hover:text-gray-600 hover:border-gray-600 transition-colors self-start">
            Read the story →
          </a>
        </div>
      </section>

      {/* PRODUCT FEATURE */}
      <section className="w-full bg-white py-32 px-6 lg:px-12 flex flex-col items-center">
        <div className="text-center mb-20">
          <span className="text-gray-500 text-xs uppercase tracking-[0.2em] font-medium mb-4 block">
            FEATURED PIECE
          </span>
          <h2 className="font-['Playfair_Display'] text-5xl md:text-6xl mb-4">
            The Obsidian Coat
          </h2>
          <p className="text-xl text-gray-500">
            Merino Wool Blend — EGP 3,200
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 max-w-5xl w-full mx-auto mb-16">
          <div className="flex-1 aspect-[2/3] bg-gray-100">
             <img 
              src="/__mockup/images/product-coat.png" 
              alt="The Obsidian Coat" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 aspect-[2/3] bg-gray-100 mt-12 md:mt-24">
             <img 
              src="/__mockup/images/product-coat-detail.png" 
              alt="Coat Detail" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <button className="px-10 py-4 border border-[#C9A227] text-[#C9A227] hover:bg-[#C9A227] hover:text-white transition-colors uppercase tracking-widest text-sm font-medium">
          Shop the Look →
        </button>
      </section>

      {/* CATEGORIES ROW */}
      <section className="w-full bg-white py-24 px-6 lg:px-12">
        <div className="text-center mb-16">
          <h2 className="uppercase tracking-[0.2em] text-lg font-medium">Explore</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[
            { name: "Knitwear", img: "/__mockup/images/cat-knitwear.png" },
            { name: "Outerwear", img: "/__mockup/images/cat-outerwear.png" },
            { name: "Accessories", img: "/__mockup/images/cat-accessories.png" }
          ].map((cat, i) => (
            <div key={i} className="group relative aspect-[2/3] overflow-hidden bg-gray-100 cursor-pointer">
              <img 
                src={cat.img} 
                alt={cat.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <h3 className="font-['Playfair_Display'] text-white text-3xl">{cat.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#111111] text-white py-16 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="font-['Playfair_Display'] font-bold text-3xl tracking-wider">VELORA</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-medium mb-6 text-white/50">About</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">Our Story</a></li>
                <li><a href="#" className="hover:text-white">Sustainability</a></li>
                <li><a href="#" className="hover:text-white">Materials</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-medium mb-6 text-white/50">Shop</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">New Arrivals</a></li>
                <li><a href="#" className="hover:text-white">Bestsellers</a></li>
                <li><a href="#" className="hover:text-white">Knitwear</a></li>
                <li><a href="#" className="hover:text-white">Outerwear</a></li>
              </ul>
            </div>
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-medium mb-6 text-white/50">Help</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Shipping</a></li>
                <li><a href="#" className="hover:text-white">Returns</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="uppercase tracking-[0.2em] text-xs font-medium mb-6 text-white/50">Connect</h4>
              <ul className="space-y-4 text-sm text-white/80">
                <li><a href="#" className="hover:text-white">Instagram</a></li>
                <li><a href="#" className="hover:text-white">Pinterest</a></li>
                <li><a href="#" className="hover:text-white">TikTok</a></li>
                <li><a href="#" className="hover:text-white">Journal</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-white/40 uppercase tracking-widest gap-4">
            <p>© 2026 Velora</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
