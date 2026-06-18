import React from 'react';
import { Search, Moon, User, ShoppingBag } from 'lucide-react';

export function Auth() {
  return (
    <div className="min-h-screen bg-[#F7F3EE] flex flex-col font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white relative">
      {/* NAVBAR */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent py-4 h-[80px] text-[#0F172A]">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20 flex items-center justify-between h-full ml-[40px]">
          <nav className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.3em] uppercase">
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Home</a>
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Shop</a>
          </nav>
          <div className="flex items-center gap-6">
            <button className="hover:text-[#C8A96B] transition-colors"><Search size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors"><Moon size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors"><ShoppingBag size={18} strokeWidth={1.5} /></button>
          </div>
        </div>
      </header>

      {/* LEFT EDGE STRIP */}
      <div className="absolute top-0 left-0 bottom-0 w-[40px] bg-[#0F172A] flex items-center justify-center z-10">
        <h1 className="font-['Playfair_Display',Georgia,serif] text-white text-[20px] tracking-[0.3em] -rotate-90 whitespace-nowrap">
          VELORA
        </h1>
      </div>

      <div className="flex-1 flex flex-col md:flex-row ml-[40px] items-center justify-center py-20 px-10 md:px-0">
        {/* LOGIN FORM */}
        <div className="w-full md:w-1/2 max-w-md px-10 md:px-20">
          <h2 className="font-['Playfair_Display',Georgia,serif] text-[48px] text-[#0F172A] mb-2">Welcome Back.</h2>
          <p className="text-[13px] font-light text-[#0F172A]/60 mb-12">Log in to your Velora account.</p>

          <form className="space-y-8 mb-10" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[#0F172A] outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 text-sm font-light" />
            <input type="password" placeholder="Password" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[#0F172A] outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 text-sm font-light" />
            
            <div className="flex justify-between items-center pt-2">
              <a href="#" className="text-[11px] tracking-[0.1em] uppercase text-[#0F172A]/60 hover:text-[#0F172A] transition-colors underline">Forgot password?</a>
            </div>

            <button className="w-full bg-[#0F172A] text-white py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] transition-colors duration-[400ms] mt-4">
              SIGN IN
            </button>
          </form>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-[#E8E2DA] flex-1"></div>
            <span className="text-[11px] tracking-[0.1em] uppercase text-[#0F172A]/40">or continue with</span>
            <div className="h-px bg-[#E8E2DA] flex-1"></div>
          </div>

          <button className="w-full bg-transparent border border-[#E8E2DA] text-[#0F172A] py-4 text-[10px] tracking-[0.3em] uppercase hover:border-[#0F172A] transition-colors flex items-center justify-center gap-3">
            GOOGLE
          </button>
        </div>

        {/* DIVIDER */}
        <div className="hidden md:block w-px h-[500px] bg-[#E8E2DA]"></div>

        {/* REGISTER FORM */}
        <div className="w-full md:w-1/2 max-w-md px-10 md:px-20 mt-20 md:mt-0">
          <h2 className="font-['Playfair_Display',Georgia,serif] text-[48px] text-[#0F172A] mb-2">Join Velora.</h2>
          <p className="text-[13px] font-light text-[#0F172A]/60 mb-12">Create an account for exclusive access.</p>

          <form className="space-y-8 mb-10" onSubmit={(e) => e.preventDefault()}>
            <input type="text" placeholder="Full Name" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[#0F172A] outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 text-sm font-light" />
            <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[#0F172A] outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 text-sm font-light" />
            <input type="password" placeholder="Password" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[#0F172A] outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 text-sm font-light" />
            
            <button className="w-full bg-[#0F172A] text-white py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] transition-colors duration-[400ms] mt-4">
              CREATE ACCOUNT
            </button>
          </form>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-[#E8E2DA] flex-1"></div>
            <span className="text-[11px] tracking-[0.1em] uppercase text-[#0F172A]/40">or continue with</span>
            <div className="h-px bg-[#E8E2DA] flex-1"></div>
          </div>

          <button className="w-full bg-transparent border border-[#E8E2DA] text-[#0F172A] py-4 text-[10px] tracking-[0.3em] uppercase hover:border-[#0F172A] transition-colors flex items-center justify-center gap-3">
            GOOGLE
          </button>
        </div>
      </div>
    </div>
  );
}
