import React, { useState } from 'react';

export function ContactFAQ() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    { q: "What is your return policy?", a: "We accept returns within 14 days of delivery for items in their original condition, unworn, unwashed, and with all tags attached. Returns are complimentary for all orders." },
    { q: "Do you ship internationally?", a: "Yes, Velora ships globally. International orders are typically delivered within 3-5 business days via DHL Express. All duties and taxes are calculated at checkout." },
    { q: "How do I track my order?", a: "Once your order has been dispatched, you will receive an email containing a tracking link. You may also track your order through your Velora account dashboard." },
    { q: "Can I modify or cancel my order?", a: "Orders can be modified or cancelled within 2 hours of placement. Please contact our client services team immediately if you require any changes." }
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#0F172A] font-['Inter',sans-serif] selection:bg-[#5B1E2D] selection:text-white">
      {/* NAVBAR */}
      <header className="bg-[#F7F3EE] border-b border-[#E8E2DA] py-6 text-center sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-10 flex justify-between items-center">
          <div className="text-[10px] tracking-[0.3em] uppercase hidden md:block">Client Services</div>
          <div className="font-['Playfair_Display',Georgia,serif] text-[22px] tracking-wider absolute left-1/2 -translate-x-1/2">
            VELORA
          </div>
          <div className="text-[10px] tracking-[0.3em] uppercase hidden md:block">Return Home</div>
        </div>
      </header>

      {/* CONTACT SECTION */}
      <section className="py-[120px] max-w-[1400px] mx-auto px-10 md:px-20 border-b border-[#E8E2DA]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div>
            <h1 className="font-['Playfair_Display',Georgia,serif] text-[64px] mb-8 text-[#0F172A]">Let's Talk.</h1>
            <p className="text-[15px] font-light text-[#0F172A]/70 mb-12 max-w-sm leading-[1.8]">
              Our client advisors are available Monday through Saturday, 9am to 8pm EET.
            </p>
            
            <div className="space-y-8 text-[14px] font-light">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">EMAIL</div>
                <a href="mailto:concierge@velora.com" className="hover:text-[#C8A96B] transition-colors">concierge@velora.com</a>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">PHONE</div>
                <a href="tel:+201001234567" className="hover:text-[#C8A96B] transition-colors">+20 100 123 4567</a>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-[#0F172A]/50 mb-2">FLAGSHIP BOUTIQUE</div>
                <address className="not-italic">
                  Zamalek, Cairo<br/>
                  Egypt
                </address>
              </div>
            </div>

            <button className="mt-12 bg-[#25D366] text-white px-8 py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#128C7E] transition-colors">
              MESSAGE ON WHATSAPP
            </button>
          </div>

          <div className="bg-white border border-[#E8E2DA] p-10 md:p-16">
            <h3 className="font-['Playfair_Display',Georgia,serif] text-[28px] mb-8">Send a Message</h3>
            <form className="space-y-8" onSubmit={e => e.preventDefault()}>
              <input type="text" placeholder="Full Name" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[14px] font-light outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40" />
              <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[14px] font-light outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40" />
              <textarea placeholder="How can we help you?" rows={4} className="w-full bg-transparent border-b border-[#E8E2DA] pb-3 text-[14px] font-light outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#0F172A]/40 resize-none"></textarea>
              <button className="w-full bg-[#0F172A] text-white py-4 text-[10px] tracking-[0.3em] uppercase hover:bg-[#5B1E2D] transition-colors">
                SEND MESSAGE
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-[120px] max-w-[800px] mx-auto px-10 border-b border-[#E8E2DA]">
        <h2 className="font-['Playfair_Display',Georgia,serif] text-[40px] mb-12 text-center text-[#0F172A]">Frequently Asked Questions</h2>
        <div className="border-t border-[#E8E2DA]">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-[#E8E2DA]">
              <button 
                className="w-full text-left py-8 flex justify-between items-center"
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <span className="font-['Playfair_Display',Georgia,serif] text-[20px]">{faq.q}</span>
                <span className="text-[#C8A96B] text-[20px]">{activeFaq === i ? '−' : '+'}</span>
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-[200px] pb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                <p className="text-[14px] font-light text-[#0F172A]/70 leading-[1.8] max-w-2xl">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-[180px] max-w-[1400px] mx-auto px-10 md:px-20 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#C8A96B] mb-8">THE MAISON</div>
        <h2 className="font-['Playfair_Display',Georgia,serif] text-[48px] md:text-[64px] mb-16 leading-[1.1] max-w-4xl mx-auto">
          Founded in Cairo in 2019, Velora was born from a refusal to compromise.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-20 text-left">
          <div className="aspect-[4/5] overflow-hidden">
            <img src="/__mockup/images/story-fabric.png" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col justify-center px-0 md:px-10 lg:px-20">
            <h3 className="font-['Playfair_Display',Georgia,serif] text-[32px] mb-8">Our Philosophy</h3>
            <p className="text-[15px] font-light leading-[2] text-[#0F172A]/70 mb-6">
              We believe that true luxury lies in the unseen. It's the hand-finished seam on the inside of a coat. It's the weight of a silk slip dress. It's the decision to produce fifty perfect pieces rather than five thousand adequate ones.
            </p>
            <p className="text-[15px] font-light leading-[2] text-[#0F172A]/70">
              Velora designs for the modern individual who seeks quiet excellence. Our pieces are not meant to announce your arrival, but to linger in the memory long after you've left the room.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#0F172A] text-white py-12 text-center text-[10px] tracking-[0.2em] uppercase text-white/50 border-t border-[#C8A96B]">
        VELORA &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
