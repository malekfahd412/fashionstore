import React, { useState } from 'react';

export function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const navItems = ['Overview', 'Orders', 'Wishlist', 'Profile', 'Notifications', 'Support', 'Security'];

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] flex">
      {/* SIDEBAR */}
      <aside className="w-[280px] border-r border-[#E8E2DA] flex flex-col p-10 hidden lg:flex">
        <div className="font-['Playfair_Display',Georgia,serif] text-[24px] tracking-wider mb-16">
          VELORA
        </div>
        <nav className="flex flex-col gap-6 flex-1">
          {navItems.map(item => (
            <button 
              key={item}
              onClick={() => setActiveTab(item)}
              className={`text-left text-[11px] tracking-[0.2em] uppercase transition-colors relative ${activeTab === item ? 'text-[#0F172A]' : 'text-[#0F172A]/40 hover:text-[#0F172A]'}`}
            >
              {activeTab === item && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#C8A96B] rounded-full"></div>
              )}
              {item}
            </button>
          ))}
        </nav>
        <button className="text-left text-[11px] tracking-[0.2em] uppercase text-[#5B1E2D] hover:text-[#5B1E2D]/70 transition-colors mt-auto">
          SIGN OUT
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-10 lg:p-20 overflow-y-auto">
        {activeTab === 'Overview' && (
          <div className="max-w-[1000px]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-2 text-[#0F172A]">Good afternoon, Layla.</h1>
            <p className="text-[#0F172A]/60 font-light mb-16 text-[14px]">Here is what is happening with your account today.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
              <div className="border border-[#E8E2DA] p-8 bg-white">
                <h3 className="text-[10px] tracking-[0.2em] uppercase mb-4 text-[#0F172A]/50">RECENT ORDER</h3>
                <div className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-2">#VL-8492</div>
                <div className="text-[13px] font-light text-[#0F172A]/70 mb-6">Processing • Expected Mar 12</div>
                <button className="text-[10px] tracking-[0.2em] uppercase border-b border-[#0F172A] pb-1 hover:text-[#C8A96B] hover:border-[#C8A96B] transition-colors">TRACK ORDER</button>
              </div>
              <div className="border border-[#E8E2DA] p-8 bg-white">
                <h3 className="text-[10px] tracking-[0.2em] uppercase mb-4 text-[#0F172A]/50">STORE CREDIT</h3>
                <div className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-2">EGP 2,500</div>
                <div className="text-[13px] font-light text-[#0F172A]/70 mb-6">Available to spend</div>
                <button className="text-[10px] tracking-[0.2em] uppercase border-b border-[#0F172A] pb-1 hover:text-[#C8A96B] hover:border-[#C8A96B] transition-colors">SHOP NOW</button>
              </div>
            </div>

            <h3 className="font-['Playfair_Display',Georgia,serif] text-[28px] mb-8">Wishlist Preview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(num => (
                <div key={num} className="cursor-pointer group">
                  <div className="aspect-[3/4] bg-white border border-[#E8E2DA] mb-4 relative overflow-hidden">
                    <img src={`/__mockup/images/p${num}.png`} alt="Product" className="w-full h-full object-cover transition-transform duration-[600ms] group-hover:scale-105" />
                  </div>
                  <h4 className="font-['Playfair_Display',Georgia,serif] text-[16px]">Signature Piece {num}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'Orders' && (
          <div className="max-w-[1000px]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">Order History</h1>
            <div className="bg-white border border-[#E8E2DA]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8E2DA]">
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">ORDER</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">DATE</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">TOTAL</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">STATUS</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] font-light">
                  <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50 transition-colors">
                    <td className="p-6">#VL-8492</td>
                    <td className="p-6 text-[#0F172A]/70">Mar 08, 2026</td>
                    <td className="p-6">EGP 18,500</td>
                    <td className="p-6"><span className="text-[#C8A96B] text-[11px] tracking-[0.1em] uppercase">PROCESSING</span></td>
                  </tr>
                  <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50 transition-colors">
                    <td className="p-6">#VL-8104</td>
                    <td className="p-6 text-[#0F172A]/70">Feb 14, 2026</td>
                    <td className="p-6">EGP 4,500</td>
                    <td className="p-6"><span className="text-[#0F172A]/50 text-[11px] tracking-[0.1em] uppercase">DELIVERED</span></td>
                  </tr>
                  <tr className="hover:bg-[#F7F3EE]/50 transition-colors">
                    <td className="p-6">#VL-7992</td>
                    <td className="p-6 text-[#0F172A]/70">Jan 02, 2026</td>
                    <td className="p-6">EGP 22,000</td>
                    <td className="p-6"><span className="text-[#0F172A]/50 text-[11px] tracking-[0.1em] uppercase">DELIVERED</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Profile' && (
          <div className="max-w-[600px]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">Personal Details</h1>
            <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">FULL NAME</label>
                <input type="text" defaultValue="Layla Hassan" className="w-full bg-transparent border-b border-[#E8E2DA] pb-2 text-[15px] font-light outline-none focus:border-[#0F172A] transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">EMAIL ADDRESS</label>
                <input type="email" defaultValue="layla.hassan@example.com" className="w-full bg-transparent border-b border-[#E8E2DA] pb-2 text-[15px] font-light outline-none focus:border-[#0F172A] transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">PHONE NUMBER</label>
                <input type="tel" defaultValue="+20 100 123 4567" className="w-full bg-transparent border-b border-[#E8E2DA] pb-2 text-[15px] font-light outline-none focus:border-[#0F172A] transition-colors" />
              </div>
              <button className="mt-8 bg-[#0F172A] text-white px-10 py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] transition-colors duration-[400ms]">
                SAVE CHANGES
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
