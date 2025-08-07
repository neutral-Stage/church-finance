import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Church Finance
              </span>
            </div>
            <p className="text-gray-600 text-sm max-w-md">
              Comprehensive financial management system for churches.
              Track offerings, manage funds, handle bills, and monitor advances with ease.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-sm text-gray-600 hover:text-blue-600">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="text-sm text-gray-600 hover:text-blue-600">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Features</h3>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">Offering Management</li>
              <li className="text-sm text-gray-600">Fund Tracking</li>
              <li className="text-sm text-gray-600">Bill Management</li>
              <li className="text-sm text-gray-600">Advance Tracking</li>
              <li className="text-sm text-gray-600">Financial Reports</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Church Finance Management System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}