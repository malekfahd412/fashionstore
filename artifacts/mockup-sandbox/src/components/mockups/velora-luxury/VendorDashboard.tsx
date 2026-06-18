import React, { useState } from 'react';

export function VendorDashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const navItems = ['Overview', 'My Products', 'Orders', 'Analytics', 'Payouts'];

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] flex">
      {/* SIDEBAR */}
      <aside className="w-[280px] border-r border-[#E8E2DA] flex flex-col p-10 hidden lg:flex bg-[#F7F3EE]">
        <div className="font-['Playfair_Display',Georgia,serif] text-[24px] tracking-wider mb-2 text-[#0F172A]">
          VELORA
        </div>
        <div className="text-[10px] tracking-[0.1em] text-[#C8A96B] uppercase mb-16">VENDOR PORTAL</div>
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
          <div className="max-w-[1200px]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">Performance Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {[
                { label: 'Total Products', value: '42' },
                { label: 'Pending Orders', value: '18' },
                { label: 'Revenue (MTD)', value: 'EGP 145K' },
                { label: 'Avg Rating', value: '4.9' },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#E8E2DA] p-8 relative">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#C8A96B]"></div>
                  <h3 className="text-[10px] tracking-[0.2em] uppercase mb-4 text-[#0F172A]/50">{stat.label}</h3>
                  <div className="font-['Playfair_Display',Georgia,serif] text-[32px] text-[#0F172A]">{stat.value}</div>
                </div>
              ))}
            </div>

            <h3 className="font-['Playfair_Display',Georgia,serif] text-[28px] mb-8">Recent Activity</h3>
            <div className="bg-white border border-[#E8E2DA]">
              <div className="p-6 border-b border-[#E8E2DA] text-[13px] font-light text-[#0F172A]/70 flex justify-between">
                <span>New order #VL-8492 received</span>
                <span>2 hours ago</span>
              </div>
              <div className="p-6 border-b border-[#E8E2DA] text-[13px] font-light text-[#0F172A]/70 flex justify-between">
                <span>Payout of EGP 45,000 processed</span>
                <span>1 day ago</span>
              </div>
              <div className="p-6 text-[13px] font-light text-[#0F172A]/70 flex justify-between">
                <span>Stock low: Silk Slip Dress (Size S)</span>
                <span>2 days ago</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'My Products' && (
          <div className="max-w-[1200px]">
            <div className="flex justify-between items-end mb-12">
              <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] text-[#0F172A]">Products Catalog</h1>
              <button className="bg-[#0F172A] text-white px-8 py-3 text-[10px] tracking-[0.2em] uppercase hover:bg-[#C8A96B] transition-colors">
                ADD NEW PRODUCT
              </button>
            </div>
            
            <div className="bg-white border border-[#E8E2DA] overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8E2DA]">
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">PRODUCT</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">PRICE</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">STOCK</th>
                    <th className="font-normal text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 p-6">STATUS</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] font-light">
                  <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50 transition-colors">
                    <td className="p-6 flex items-center gap-4">
                      <img src="/__mockup/images/p1.png" className="w-12 h-16 object-cover border border-[#E8E2DA]" />
                      <span>Cashmere Turtleneck</span>
                    </td>
                    <td className="p-6">EGP 4,500</td>
                    <td className="p-6">24</td>
                    <td className="p-6"><span className="text-[#2F855A] text-[11px] tracking-[0.1em] uppercase">ACTIVE</span></td>
                  </tr>
                  <tr className="border-b border-[#E8E2DA] hover:bg-[#F7F3EE]/50 transition-colors">
                    <td className="p-6 flex items-center gap-4">
                      <img src="/__mockup/images/p2.png" className="w-12 h-16 object-cover border border-[#E8E2DA]" />
                      <span>Oversized Blazer</span>
                    </td>
                    <td className="p-6">EGP 12,000</td>
                    <td className="p-6 text-[#C53030]">2 (Low)</td>
                    <td className="p-6"><span className="text-[#2F855A] text-[11px] tracking-[0.1em] uppercase">ACTIVE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div className="max-w-[1200px]">
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-[#0F172A]">Revenue Analytics</h1>
            <div className="bg-white border border-[#E8E2DA] p-10 h-[400px] flex items-end justify-between gap-4">
              {/* CSS Bars for Chart Placeholder */}
              {[40, 70, 45, 90, 65, 80].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full group">
                  <div 
                    className="w-full bg-[#0F172A] group-hover:bg-[#C8A96B] transition-colors duration-300"
                    style={{ height: `${h}%` }}
                  ></div>
                  <div className="text-center mt-4 text-[10px] tracking-[0.1em] uppercase text-[#0F172A]/50">M{i+1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
