import React from "react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-serif text-2xl font-bold mb-4">LUXE</h3>
          <p className="text-background/70 text-sm">
            Premium fashion marketplace bringing you the finest curated collections from top vendors worldwide.
          </p>
        </div>
        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">Shop</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-white transition-colors">Categories</Link></li>
            <li><Link href="/products?featured=true" className="hover:text-white transition-colors">Featured</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">Support</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">Newsletter</h4>
          <p className="text-background/70 text-sm mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
          <div className="flex gap-2">
            <input type="email" placeholder="Enter your email" className="bg-background/10 border-background/20 text-white placeholder:text-background/50 px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary" />
            <button className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-background/10 text-center text-sm text-background/50">
        <p>&copy; {new Date().getFullYear()} LUXE Fashion Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
}
