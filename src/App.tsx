/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ethers } from "ethers";
import { Plus, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { AddExpenseModal } from "./components/AddExpenseModal";
import { Dashboard } from "./components/Dashboard";
import { ExpenseList } from "./components/ExpenseList";
import { Navbar } from "./components/Navbar";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "./constants";
import { Category, Expense, SummaryStats } from "./types";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found! Please install it.");
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
      toast.success("Wallet connected!");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect wallet.");
    } finally {
      setIsConnecting(false);
    }
  };

  const getContract = async (withSigner = false) => {
    if (!window.ethereum) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const fetchExpenses = async () => {
    if (!account) return;
    try {
      setIsLoading(true);
      const contract = await getContract();
      if (!contract) return;

      const rawExpenses = await contract.getExpenses();
      const formattedExpenses: Expense[] = rawExpenses.map((e: any, index: number) => ({
        id: index,
        amount: Number(e.amount) / 100, // Assuming 2 decimal places stored as integer
        category: e.category,
        description: e.description,
        timestamp: Number(e.timestamp),
        user: e.user,
      }));

      setExpenses(formattedExpenses);
    } catch (error) {
      console.error("Fetch error:", error);
      // toast.error("Failed to fetch expenses from blockchain.");
    } finally {
      setIsLoading(false);
    }
  };

  const addExpense = async (amount: number, category: Category, description: string) => {
    try {
      setIsSubmitting(true);
      const contract = await getContract(true);
      if (!contract) return;

      const amountInCents = Math.round(amount * 100);
      const timestamp = Math.floor(Date.now() / 1000);

      const tx = await contract.addExpense(amountInCents, category, description, timestamp);
      toast.loading("Transaction pending...", { id: "tx" });
      
      await tx.wait();
      toast.success("Expense added to blockchain!", { id: "tx" });
      fetchExpenses();
    } catch (error) {
      console.error("Add error:", error);
      toast.error("Transaction failed.", { id: "tx" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (index: number) => {
    try {
      setIsDeleting(index);
      const contract = await getContract(true);
      if (!contract) return;

      const tx = await contract.deleteExpense(index);
      toast.loading("Deleting expense...", { id: "del" });
      
      await tx.wait();
      toast.success("Expense removed!", { id: "del" });
      fetchExpenses();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete expense.", { id: "del" });
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (account) {
      fetchExpenses();
    }
  }, [account]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });
    }
  }, []);

  const stats = useMemo<SummaryStats>(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    const categoryMap: Record<string, number> = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });
    
    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    const monthMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const month = new Date(e.timestamp * 1000).toLocaleString("default", { month: "short" });
      monthMap[month] = (monthMap[month] || 0) + e.amount;
    });
    
    const monthlySummary = Object.entries(monthMap).map(([month, amount]) => ({
      month,
      amount,
    }));

    return { total, categoryBreakdown, monthlySummary };
  }, [expenses]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Toaster position="bottom-right" />
      <Navbar account={account} onConnect={connectWallet} isConnecting={isConnecting} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!account ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center mb-8 animate-bounce">
              <Wallet size={48} />
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Welcome to DeExpense
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md mb-10">
              Connect your MetaMask wallet to start tracking your expenses securely on the blockchain.
            </p>
            <button
              onClick={connectWallet}
              className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-500/40 transition-all transform hover:-translate-y-1"
            >
              Get Started
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Dashboard</h2>
                <p className="text-gray-500 dark:text-gray-400">Overview of your decentralized spending</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-1"
              >
                <Plus size={20} />
                Add Expense
              </button>
            </div>

            <Dashboard stats={stats} />
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
              <ExpenseList 
                expenses={expenses} 
                onDelete={deleteExpense} 
                isDeleting={isDeleting}
              />
            </div>
          </div>
        )}
      </main>

      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addExpense}
        isSubmitting={isSubmitting}
      />

      <footer className="py-12 border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2026 DeExpense. Built with Ethereum & React.
          </p>
        </div>
      </footer>
    </div>
  );
}

