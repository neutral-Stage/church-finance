import Link from 'next/link';
import {
  CheckCircle, Shield, ArrowRight, DollarSign,
  PiggyBank,
  CreditCard,
  FileText,
  BarChart3
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border text-foreground relative z-10">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-sm hover:scale-105 transition-transform duration-300">
                <span className="text-primary-foreground font-bold text-xl">CF</span>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-foreground">
                  Church Finance
                </h3>
                <p className="text-primary text-sm font-semibold -mt-1">Management System</p>
              </div>
            </div>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-lg mb-8">
              Empowering churches with comprehensive financial management solutions
              for secure, efficient, and transparent financial operations.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-income/15 border border-income/30 rounded-full">
                <CheckCircle className="h-5 w-5 text-income" />
                <span className="text-sm font-semibold text-income">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-primary/15 border border-primary/30 rounded-full">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary">Bank-Level Security</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-bold mb-6 text-foreground">Quick Access</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/auth/login" className="group flex items-center p-3 bg-muted/50 hover:bg-accent border border-border rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">Sign In</span>
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="group flex items-center p-3 bg-muted/50 hover:bg-accent border border-border rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">Create Account</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="group flex items-center p-3 bg-muted/50 hover:bg-accent border border-border rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xl font-bold mb-6 text-foreground">Core Features</h4>
            <ul className="space-y-4">
              <li className="flex items-center p-3 bg-muted/50 border border-border rounded-xl hover:bg-accent transition-all duration-300 group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-medium">Offering Management</span>
              </li>
              <li className="flex items-center p-3 bg-muted/50 border border-border rounded-xl hover:bg-accent transition-all duration-300 group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <PiggyBank className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-medium">Fund Tracking</span>
              </li>
              <li className="flex items-center p-3 bg-muted/50 border border-border rounded-xl hover:bg-accent transition-all duration-300 group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-medium">Expense Management</span>
              </li>
              <li className="flex items-center p-3 bg-muted/50 border border-border rounded-xl hover:bg-accent transition-all duration-300 group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-medium">Financial Reports</span>
              </li>
              <li className="flex items-center p-3 bg-muted/50 border border-border rounded-xl hover:bg-accent transition-all duration-300 group">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <span className="text-foreground font-medium">Analytics Dashboard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm mb-4 md:mb-0 font-medium">
              (c) 2024 Church Finance Management System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
