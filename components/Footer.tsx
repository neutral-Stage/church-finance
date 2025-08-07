import Link from 'next/link';
import {
  CheckCircle, Shield, Star, Building2, ArrowRight, DollarSign,
  PiggyBank,
  CreditCard,
  FileText,
  BarChart3
} from 'lucide-react';

export default function Footer(): JSX.Element {
  return (
    <footer className="relative z-10 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">CF</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Church Finance
                </h3>
                <p className="text-blue-200 text-sm font-medium">Management System</p>
              </div>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed max-w-md mb-8">
              Empowering churches worldwide with comprehensive financial management solutions.
              Trusted by over 500+ congregations for secure, efficient, and transparent financial operations.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">SOC 2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-400">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">Bank-Level Security</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Quick Access</h4>
            <ul className="space-y-4">
              <li>
                <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Core Features</h4>
            <ul className="space-y-4">
              <li className="flex items-center text-gray-300">
                <DollarSign className="h-4 w-4 mr-3 text-green-400" />
                <span className="text-sm">Offering Management</span>
              </li>
              <li className="flex items-center text-gray-300">
                <PiggyBank className="h-4 w-4 mr-3 text-blue-400" />
                <span className="text-sm">Fund Tracking</span>
              </li>
              <li className="flex items-center text-gray-300">
                <CreditCard className="h-4 w-4 mr-3 text-purple-400" />
                <span className="text-sm">Expense Management</span>
              </li>
              <li className="flex items-center text-gray-300">
                <FileText className="h-4 w-4 mr-3 text-orange-400" />
                <span className="text-sm">Financial Reports</span>
              </li>
              <li className="flex items-center text-gray-300">
                <BarChart3 className="h-4 w-4 mr-3 text-cyan-400" />
                <span className="text-sm">Analytics Dashboard</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <p className="text-gray-400 text-sm">
                © 2025 Church Finance Management System. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-400">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Made with ❤️ for Churches</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">Trusted Worldwide</span>
              </div>
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