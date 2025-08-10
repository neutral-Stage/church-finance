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
    <footer className="relative z-10 bg-white/5 backdrop-blur-xl border-t border-white/10 text-gray-800">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-4 -right-4 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-cyan-400/5 to-blue-400/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 transition-transform duration-300">
                <span className="text-white font-bold text-xl">CF</span>
              </div>
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-100 via-blue-300 to-purple-300 bg-clip-text text-transparent">
                  Church Finance
                </h3>
                <p className="text-blue-300 text-sm font-semibold -mt-1">Management System</p>
              </div>
            </div>
            <p className="text-gray-200 text-lg leading-relaxed max-w-lg mb-8">
              Empowering churches worldwide with comprehensive financial management solutions. 
              Trusted by over 500+ congregations for secure, efficient, and transparent financial operations.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-700">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-full">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Bank-Level Security</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-gray-100 to-blue-300 bg-clip-text text-transparent">Quick Access</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/auth/login" className="group flex items-center p-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-200 group-hover:text-gray-100 font-medium">Sign In</span>
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="group flex items-center p-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-200 group-hover:text-gray-100 font-medium">Create Account</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="group flex items-center p-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                    <ArrowRight className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-200 group-hover:text-gray-100 font-medium">Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-gray-100 to-purple-300 bg-clip-text text-transparent">Core Features</h4>
            <ul className="space-y-4">
              <li className="flex items-center p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-200 group-hover:text-gray-100 font-medium">Offering Management</span>
              </li>
              <li className="flex items-center p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <PiggyBank className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-200 group-hover:text-gray-100 font-medium">Fund Tracking</span>
              </li>
              <li className="flex items-center p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-200 group-hover:text-gray-100 font-medium">Expense Management</span>
              </li>
              <li className="flex items-center p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-200 group-hover:text-gray-100 font-medium">Financial Reports</span>
              </li>
              <li className="flex items-center p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-gray-200 group-hover:text-gray-100 font-medium">Analytics Dashboard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-200 text-sm mb-4 md:mb-0 font-medium">
              (c) 2024 Church Finance Management System. All rights reserved.
            </p>
            <div className="flex space-x-4">
              <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full animate-pulse shadow-lg"></div>
              <div className="w-3 h-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '0.5s' }}></div>
              <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse shadow-lg" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </footer>
  );
}