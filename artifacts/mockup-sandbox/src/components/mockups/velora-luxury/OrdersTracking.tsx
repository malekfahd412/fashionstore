import React from 'react';

export function OrdersTracking() {
  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white">
      {/* NAVBAR */}
      <header className="bg-[#F7F3EE] border-b border-[#E8E2DA] py-6 text-center">
        <div className="font-['Playfair_Display',Georgia,serif] text-[22px] tracking-wider">
          VELORA
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto py-20 px-10">
        <h1 className="font-['Playfair_Display',Georgia,serif] text-[48px] mb-16 text-center text-[#0F172A]">Track Your Order</h1>

        {/* ORDER SELECTION / HISTORY */}
        <div className="bg-white border border-[#E8E2DA] mb-20">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E8E2DA]">
                <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">DATE</th>
                <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">ORDER ID</th>
                <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">ITEMS</th>
                <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">TOTAL</th>
                <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">STATUS</th>
              </tr>
            </thead>
            <tbody className="text-[14px] font-light">
              <tr className="bg-[#F7F3EE]/30 cursor-pointer">
                <td className="p-6">Mar 08, 2026</td>
                <td className="p-6 font-medium">#VL-8492</td>
                <td className="p-6 flex gap-2">
                  <img src="/__mockup/images/product-coat.png" className="w-8 h-10 object-cover border border-[#E8E2DA]" />
                  <img src="/__mockup/images/p1.png" className="w-8 h-10 object-cover border border-[#E8E2DA]" />
                </td>
                <td className="p-6">EGP 23,000</td>
                <td className="p-6"><span className="text-[#C8A96B] text-[11px] tracking-[0.1em] uppercase">PROCESSING</span></td>
              </tr>
              <tr className="border-t border-[#E8E2DA] cursor-pointer hover:bg-[#F7F3EE]/50 transition-colors">
                <td className="p-6">Feb 14, 2026</td>
                <td className="p-6">#VL-8104</td>
                <td className="p-6 flex gap-2">
                  <img src="/__mockup/images/p3.png" className="w-8 h-10 object-cover border border-[#E8E2DA]" />
                </td>
                <td className="p-6">EGP 8,200</td>
                <td className="p-6"><span className="text-[#0F172A]/50 text-[11px] tracking-[0.1em] uppercase">DELIVERED</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TRACKING DETAIL (Active Order) */}
        <div className="bg-white border border-[#E8E2DA] p-12">
          <div className="flex justify-between items-end mb-16 border-b border-[#E8E2DA] pb-8">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">ORDER #VL-8492</div>
              <h2 className="font-['Playfair_Display',Georgia,serif] text-[32px]">Arriving Soon</h2>
            </div>
            <div className="text-right">
              <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">ESTIMATED DELIVERY</div>
              <div className="font-['Playfair_Display',Georgia,serif] italic text-[24px] text-[#C8A96B]">March 12, 2026</div>
            </div>
          </div>

          {/* TIMELINE STEPPER */}
          <div className="relative mb-16 px-4">
            <div className="absolute top-[11px] left-[5%] right-[5%] h-px bg-[#E8E2DA]"></div>
            
            <div className="relative flex justify-between z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-[#C8A96B] flex items-center justify-center text-white text-[10px]">✓</div>
                <div className="text-[10px] tracking-[0.15em] uppercase font-medium">Confirmed</div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-[#5B1E2D] flex items-center justify-center ring-4 ring-white"></div>
                <div className="text-[10px] tracking-[0.15em] uppercase font-medium text-[#5B1E2D]">Processing</div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E8E2DA]"></div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[#0F172A]/40">Packed</div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E8E2DA]"></div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[#0F172A]/40">Shipped</div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-white border border-[#E8E2DA]"></div>
                <div className="text-[10px] tracking-[0.15em] uppercase text-[#0F172A]/40">Delivered</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-[#F7F3EE] p-8">
            <div>
              <h4 className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-4">DELIVERY ADDRESS</h4>
              <div className="text-[14px] font-light leading-[1.8]">
                Layla Hassan<br />
                Villa 14, Palm Hills<br />
                6th of October City<br />
                Giza, Egypt
              </div>
            </div>
            <div>
              <h4 className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-4">NEED HELP?</h4>
              <div className="text-[14px] font-light leading-[1.8]">
                For any modifications or inquiries, our client services team is at your disposal.<br />
                <a href="#" className="underline text-[#C8A96B] hover:text-[#0F172A] transition-colors mt-2 inline-block">Contact Support</a>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
