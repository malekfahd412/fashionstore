import React, { useState } from 'react';
import { Search, Moon, User, ShoppingBag } from 'lucide-react';

export function CartCheckout() {
  const [paymentMethod, setPaymentMethod] = useState('card');

  return (
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#F7F3EE] border-b border-[#E8E2DA] py-4 h-[80px] text-[#0F172A]">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20 flex items-center justify-between h-full">
          <nav className="hidden md:flex items-center gap-8 text-[10px] tracking-[0.3em] uppercase">
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Home</a>
            <a href="#" className="hover:text-[#C8A96B] transition-colors">Shop</a>
          </nav>
          <a href="#" className="font-['Playfair_Display',Georgia,serif] text-[22px] tracking-wider absolute left-1/2 -translate-x-1/2">
            VELORA
          </a>
          <div className="flex items-center gap-6">
            <button className="hover:text-[#C8A96B] transition-colors"><Search size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors"><User size={18} strokeWidth={1.5} /></button>
            <button className="hover:text-[#C8A96B] transition-colors relative">
              <ShoppingBag size={18} strokeWidth={1.5} />
              <span className="absolute -top-1.5 -right-1.5 bg-[#0F172A] text-white text-[9px] w-4 h-4 flex items-center justify-center">2</span>
            </button>
          </div>
        </div>
      </header>

      {/* SPLIT LAYOUT */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* LEFT PANEL - CART (Ivory) */}
        <div className="w-full lg:w-[50%] bg-[#F7F3EE] p-10 md:p-20">
          <h2 className="font-['Playfair_Display',Georgia,serif] text-[40px] text-[#0F172A] mb-12">Your Bag</h2>
          
          <div className="flex flex-col gap-10">
            {/* Item 1 */}
            <div className="flex gap-8 border-b border-[#E8E2DA] pb-10">
              <img src="/__mockup/images/product-coat.png" alt="Product" className="w-[120px] h-[160px] object-cover bg-white border border-[#E8E2DA]" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between mb-2">
                    <h3 className="font-['Playfair_Display',Georgia,serif] text-[20px] text-[#0F172A]">The Heritage Wool Coat</h3>
                    <button className="text-[12px] text-[#0F172A]/50 hover:text-[#0F172A]">×</button>
                  </div>
                  <p className="text-[13px] text-[#0F172A]/60 font-light mb-1">Color: Midnight</p>
                  <p className="text-[13px] text-[#0F172A]/60 font-light">Size: M</p>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-4 text-[14px]">
                    <button className="text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">−</button>
                    <span>1</span>
                    <button className="text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">+</button>
                  </div>
                  <div className="font-light">EGP 18,500</div>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-8 border-b border-[#E8E2DA] pb-10">
              <img src="/__mockup/images/p1.png" alt="Product" className="w-[120px] h-[160px] object-cover bg-white border border-[#E8E2DA]" />
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between mb-2">
                    <h3 className="font-['Playfair_Display',Georgia,serif] text-[20px] text-[#0F172A]">Cashmere Turtleneck</h3>
                    <button className="text-[12px] text-[#0F172A]/50 hover:text-[#0F172A]">×</button>
                  </div>
                  <p className="text-[13px] text-[#0F172A]/60 font-light mb-1">Color: Ivory</p>
                  <p className="text-[13px] text-[#0F172A]/60 font-light">Size: S</p>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-4 text-[14px]">
                    <button className="text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">−</button>
                    <span>1</span>
                    <button className="text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">+</button>
                  </div>
                  <div className="font-light">EGP 4,500</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - CHECKOUT (Midnight Blue) */}
        <div className="w-full lg:w-[50%] bg-[#0F172A] p-10 md:p-20 text-white">
          <div className="max-w-[500px]">
            <h2 className="text-[#C8A96B] font-['Playfair_Display',Georgia,serif] text-[32px] mb-12">Order Summary</h2>
            
            <div className="space-y-4 text-[14px] font-light mb-10 border-b border-white/10 pb-8">
              <div className="flex justify-between">
                <span className="text-white/70">Subtotal</span>
                <span>EGP 23,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Shipping</span>
                <span>Calculated at next step</span>
              </div>
              <div className="flex justify-between text-[18px] pt-4">
                <span>Total</span>
                <span>EGP 23,000</span>
              </div>
            </div>

            <div className="mb-12">
              <input type="text" placeholder="Promo Code" className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-[#C8A96B] transition-colors placeholder:text-white/30 text-sm font-light" />
            </div>

            <h3 className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-8">Shipping Information</h3>
            <div className="space-y-6 mb-12">
              <input type="text" placeholder="Full Name" className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-[#C8A96B] transition-colors placeholder:text-white/30 text-sm font-light" />
              <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-[#C8A96B] transition-colors placeholder:text-white/30 text-sm font-light" />
              <input type="tel" placeholder="Phone Number" className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-[#C8A96B] transition-colors placeholder:text-white/30 text-sm font-light" />
              <input type="text" placeholder="Delivery Address" className="w-full bg-transparent border-b border-white/20 pb-3 text-white outline-none focus:border-[#C8A96B] transition-colors placeholder:text-white/30 text-sm font-light" />
            </div>

            <h3 className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-8">Payment Method</h3>
            <div className="flex flex-col gap-4 mb-12">
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`text-left p-4 border transition-colors ${paymentMethod === 'card' ? 'border-[#C8A96B]' : 'border-white/20'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${paymentMethod === 'card' ? 'border-[#C8A96B]' : 'border-white/50'}`}>
                    {paymentMethod === 'card' && <div className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />}
                  </div>
                  <span className="text-[13px] tracking-widest uppercase">CREDIT CARD</span>
                </div>
              </button>
              <button 
                onClick={() => setPaymentMethod('cod')}
                className={`text-left p-4 border transition-colors ${paymentMethod === 'cod' ? 'border-[#C8A96B]' : 'border-white/20'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${paymentMethod === 'cod' ? 'border-[#C8A96B]' : 'border-white/50'}`}>
                    {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />}
                  </div>
                  <span className="text-[13px] tracking-widest uppercase">CASH ON DELIVERY</span>
                </div>
              </button>
            </div>

            <button className="w-full bg-[#C8A96B] text-[#0F172A] py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-white transition-colors duration-[400ms] mb-8 font-medium">
              PROCEED TO PAYMENT
            </button>

            <div className="flex justify-between items-center text-[11px] text-white/40 tracking-[0.1em] uppercase">
              <div className="flex items-center gap-2"><span className="text-[#C8A96B]">🔒</span> Secure checkout</div>
              <div className="flex items-center gap-2"><span className="text-[#C8A96B]">✓</span> Free returns</div>
              <div className="flex items-center gap-2"><span className="text-[#C8A96B]">🎁</span> Luxury packaging</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
