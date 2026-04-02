import { Wallet } from "lucide-react";
import { formatAddress } from "../lib/utils";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  account: string | null;
  onConnect: () => Promise<void>;
  isConnecting: boolean;
}

export function Navbar({ account, onConnect, isConnecting }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Wallet className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">DeExpense</span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {account ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium border border-blue-100 dark:border-blue-800">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {formatAddress(account)}
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Wallet"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
