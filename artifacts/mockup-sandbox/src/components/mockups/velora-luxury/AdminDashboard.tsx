import React, { useState } from 'react';
import { Search } from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const navItems = ['Dashboard', 'Users', 'Products', 'Categories', 'Orders', 'Coupons', 'Banners', 'Analytics', 'Settings', 'Support', 'Newsletter'];

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] flex">
      {/* DARK SIDEBAR */}
      <aside className="w-[280px] bg-[#1A1A1A] text-white flex flex-col p-10 hidden lg:flex shrink-0">
        <div className="font-['Playfair_Display',Georgia,serif] text-[24px] tracking-wider mb-2">
          VELORA
        </div>
        <div className="text-[10px] tracking-[0.1em] text-white/40 uppercase mb-16">ADMINISTRATION</div>
        <nav className="flex flex-col gap-6 flex-1 overflow-y-auto no-scrollbar">
          {navItems.map(item => (
            <button 
              key={item}
              onClick={() => setActiveTab(item)}
              className={`text-left text-[11px] tracking-[0.2em] uppercase transition-colors relative ${activeTab === item ? 'text-white' : 'text-white/40 hover:text-white/80'}`}
            >
              {activeTab === item && (
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
              )}
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR */}
        <header className="h-[80px] bg-white border-b border-[#E8E2DA] flex items-center justify-between px-10 shrink-0">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50">
            ADMIN / {activeTab}
          </div>
          <div className="flex items-center gap-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/30" />
              <input type="text" placeholder="Search" className="pl-10 pr-4 py-2 bg-[#F7F3EE] text-[13px] outline-none w-[250px] placeholder:text-[#0F172A]/30" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-[12px] font-['Playfair_Display',Georgia,serif]">
              A
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 lg:p-16">
          {activeTab === 'Dashboard' && (
            <div className="max-w-[1200px]">
              <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">Platform Overview</h1>

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {[
                  { label: 'Total Revenue', value: 'EGP 2.4M' },
                  { label: 'Total Orders', value: '1,284' },
                  { label: 'Active Users', value: '8,492' },
                  { label: 'Conversion Rate', value: '3.2%' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white border border-[#E8E2DA] p-8">
                    <h3 className="text-[10px] tracking-[0.2em] uppercase mb-4 text-[#0F172A]/50">{stat.label}</h3>
                    <div className="font-['Playfair_Display',Georgia,serif] text-[32px] text-[#0F172A]">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* 2 COLUMNS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* RECENT ORDERS */}
                <div>
                  <h3 className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-6">Recent Orders</h3>
                  <div className="bg-white border border-[#E8E2DA]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#E8E2DA]">
                          <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-5">ORDER</th>
                          <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-5">TOTAL</th>
                          <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-5">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="text-[13px] font-light">
                        <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50">
                          <td className="p-5">#VL-8492</td>
                          <td className="p-5">EGP 18,500</td>
                          <td className="p-5"><span className="text-[#C8A96B] text-[10px] tracking-[0.1em] uppercase">PROCESSING</span></td>
                        </tr>
                        <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50">
                          <td className="p-5">#VL-8491</td>
                          <td className="p-5">EGP 4,200</td>
                          <td className="p-5"><span className="text-[#0F172A]/50 text-[10px] tracking-[0.1em] uppercase">SHIPPED</span></td>
                        </tr>
                        <tr className="hover:bg-[#F7F3EE]/50">
                          <td className="p-5">#VL-8490</td>
                          <td className="p-5">EGP 32,000</td>
                          <td className="p-5"><span className="text-[#5B1E2D] text-[10px] tracking-[0.1em] uppercase">PENDING</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TOP PRODUCTS */}
                <div>
                  <h3 className="font-['Playfair_Display',Georgia,serif] text-[24px] mb-6">Top Products</h3>
                  <div className="bg-white border border-[#E8E2DA] p-6 space-y-6">
                    <div className="flex items-center gap-4">
                      <img src="/__mockup/images/p1.png" className="w-10 h-14 object-cover border border-[#E8E2DA]" />
                      <div className="flex-1">
                        <div className="text-[14px]">Cashmere Turtleneck</div>
                        <div className="text-[12px] text-[#0F172A]/50 font-light">482 Sales</div>
                      </div>
                      <div className="text-[14px] font-light">EGP 4,500</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <img src="/__mockup/images/p6.png" className="w-10 h-14 object-cover border border-[#E8E2DA]" />
                      <div className="flex-1">
                        <div className="text-[14px]">Signature Long Coat</div>
                        <div className="text-[12px] text-[#0F172A]/50 font-light">315 Sales</div>
                      </div>
                      <div className="text-[14px] font-light">EGP 18,500</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Products' && (
            <div className="max-w-[1200px]">
              <div className="flex justify-between items-end mb-12">
                <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] text-[#0F172A]">Products Catalog</h1>
                <button className="bg-[#1A1A1A] text-white px-8 py-3 text-[10px] tracking-[0.2em] uppercase hover:bg-[#C8A96B] transition-colors">
                  ADD NEW PRODUCT
                </button>
              </div>
              <div className="bg-white border border-[#E8E2DA]">
                {/* Search Bar */}
                <div className="p-4 border-b border-[#E8E2DA]">
                  <input type="text" placeholder="Search products..." className="w-full md:w-[300px] bg-transparent pb-2 border-b border-[#E8E2DA] outline-none text-[13px] font-light" />
                </div>
                {/* Table */}
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#E8E2DA]">
                      <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">PRODUCT</th>
                      <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">CATEGORY</th>
                      <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">PRICE</th>
                      <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="text-[14px] font-light">
                    <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50">
                      <td className="p-6 flex items-center gap-4">
                        <img src="/__mockup/images/p4.png" className="w-10 h-14 object-cover border border-[#E8E2DA]" />
                        <span>Wide Leg Trousers</span>
                      </td>
                      <td className="p-6">Ready to Wear</td>
                      <td className="p-6">EGP 5,800</td>
                      <td className="p-6">
                        <button className="text-[10px] uppercase tracking-widest text-[#0F172A]/50 hover:text-[#0F172A]">EDIT</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
