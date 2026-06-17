import React from "react";
import { X, Minus, Plus, ChevronDown } from "lucide-react";

export function CartCheckout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row w-full text-[#111111] font-['Inter',sans-serif]">
      {/* LEFT SIDE — CART DRAWER */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100 relative">
        <div className="absolute top-4 left-8 text-sm font-medium tracking-widest text-gray-500 uppercase">Cart</div>
        
        {/* Drawer Container */}
        <div className="w-full max-w-[480px] bg-white shadow-2xl h-[85vh] flex flex-col overflow-hidden relative border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-['Playfair_Display',serif] text-2xl font-medium">Your Cart (2)</h2>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Item 1 */}
            <div className="flex gap-4 p-3 bg-[#F5F5F5] rounded-sm">
              <img 
                src="/__mockup/images/product-coat.jpg" 
                alt="The Obsidian Coat" 
                className="w-24 h-32 object-cover rounded-sm"
              />
              <div className="flex flex-col flex-1 py-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-[15px]">The Obsidian Coat</h3>
                  <p className="font-medium">EGP 3,200</p>
                </div>
                <p className="text-gray-500 text-sm mt-1">Size M</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center border border-gray-200 bg-white rounded-sm">
                    <button className="px-3 py-1 text-gray-500 hover:text-black transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm px-2">1</span>
                    <button className="px-3 py-1 text-gray-500 hover:text-black transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button className="text-xs text-gray-500 underline uppercase tracking-wider hover:text-black transition-colors">Remove</button>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4 p-3 bg-[#F5F5F5] rounded-sm">
              <img 
                src="/__mockup/images/p1.jpg" 
                alt="Noir Turtleneck" 
                className="w-24 h-32 object-cover rounded-sm"
              />
              <div className="flex flex-col flex-1 py-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-[15px]">Noir Turtleneck</h3>
                  <p className="font-medium">EGP 890</p>
                </div>
                <p className="text-gray-500 text-sm mt-1">Size S</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center border border-gray-200 bg-white rounded-sm">
                    <button className="px-3 py-1 text-gray-500 hover:text-black transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm px-2">1</span>
                    <button className="px-3 py-1 text-gray-500 hover:text-black transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button className="text-xs text-gray-500 underline uppercase tracking-wider hover:text-black transition-colors">Remove</button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 bg-white space-y-4 mt-auto">
            <div className="space-y-2 text-[15px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>EGP 4,090</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="h-px w-full bg-gray-200 my-4"></div>
              <div className="flex justify-between font-medium text-lg">
                <span>Total</span>
                <span>EGP 4,090</span>
              </div>
            </div>
            
            <button className="w-full bg-[#111111] text-white h-14 text-sm font-medium tracking-[0.1em] uppercase hover:bg-black/90 transition-colors">
              Proceed to Checkout
            </button>
            <div className="text-center">
              <button className="text-sm text-gray-500 hover:text-black transition-colors underline">
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER DIVIDER */}
      <div className="hidden md:block w-px bg-gray-200"></div>

      {/* RIGHT SIDE — CHECKOUT PAGE */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto relative p-8 md:p-12 lg:px-16">
        <div className="absolute top-4 right-8 text-sm font-medium tracking-widest text-gray-500 uppercase">Checkout</div>
        
        <div className="max-w-[600px] w-full mx-auto pb-20">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-['Playfair_Display',serif] text-3xl font-medium tracking-widest uppercase mb-8">Velora</h1>
            
            {/* Progress */}
            <div className="flex items-center justify-center space-x-4 text-sm tracking-wider uppercase text-gray-400">
              <span className="text-black font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C9A227]"></span>
                1 Info
              </span>
              <span>→</span>
              <span>2 Shipping</span>
              <span>→</span>
              <span>3 Payment</span>
            </div>
          </div>

          {/* Form Sections */}
          <div className="space-y-10">
            {/* Contact */}
            <section>
              <h2 className="font-['Playfair_Display',serif] text-xl mb-6">Contact Information</h2>
              <div className="space-y-4 text-sm">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number" 
                  className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                />
              </div>
            </section>

            {/* Delivery */}
            <section>
              <h2 className="font-['Playfair_Display',serif] text-xl mb-6">Delivery Address</h2>
              <div className="space-y-4 text-sm">
                <input 
                  type="text" 
                  placeholder="Address Line 1" 
                  className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                />
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    placeholder="City" 
                    className="flex-1 pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                  />
                  <div className="flex-1 relative">
                    <select className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors appearance-none text-gray-400 cursor-pointer">
                      <option value="">Governorate</option>
                      <option value="cairo">Cairo</option>
                      <option value="giza">Giza</option>
                      <option value="alex">Alexandria</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Postal Code" 
                  className="w-full pb-3 border-b border-gray-200 bg-transparent outline-none focus:border-black transition-colors placeholder:text-gray-400"
                />
              </div>
            </section>

            {/* Payment */}
            <section>
              <h2 className="font-['Playfair_Display',serif] text-xl mb-6">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border border-black cursor-pointer bg-[#F5F5F5]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black"></div>
                    </div>
                    <span className="text-sm font-medium">Cash on Delivery</span>
                  </div>
                </label>
                <label className="flex items-center justify-between p-4 border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                    <span className="text-sm text-gray-600">Pay Online via Paymob</span>
                  </div>
                </label>
              </div>
            </section>

            {/* Inline Order Summary */}
            <section className="bg-[#F5F5F5] p-6 rounded-sm mt-8">
              <h3 className="font-medium text-sm tracking-wider uppercase mb-4 text-gray-500">Order Summary</h3>
              <div className="space-y-3 text-sm text-gray-600 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between">
                  <span>The Obsidian Coat <span className="text-gray-400 text-xs ml-1">× 1</span></span>
                  <span>EGP 3,200</span>
                </div>
                <div className="flex justify-between">
                  <span>Noir Turtleneck <span className="text-gray-400 text-xs ml-1">× 1</span></span>
                  <span>EGP 890</span>
                </div>
              </div>
              <div className="flex justify-between font-medium text-lg text-black">
                <span>Total</span>
                <span>EGP 4,090</span>
              </div>
            </section>

            {/* Action */}
            <button className="w-full bg-[#C9A227] text-white h-14 text-sm font-medium tracking-[0.1em] uppercase hover:bg-[#b59020] transition-colors mt-8">
              Place Order →
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
