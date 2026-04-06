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
  const [isContractValid, setIsContractValid] = useState<boolean | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network:", addError);
        }
      }
    }
  };

  const checkContract = async (address: string) => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const chainIdStr = network.chainId.toString();
      setCurrentChainId(chainIdStr);
      
      if (chainIdStr !== "11155111") {
        setIsContractValid(false);
        return false;
      }

      const code = await provider.getCode(address);
      const isValid = code !== "0x" && code !== "0x0";
      setIsContractValid(isValid);
      return isValid;
    } catch (error) {
      setIsContractValid(false);
      return false;
    }
  };

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
    if (!window.ethereum || !CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) {
      return null;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  };

  const fetchExpenses = async () => {
    if (!account && !isDemoMode) return;
    
    if (isDemoMode) {
      const saved = localStorage.getItem(`expenses_${account || 'demo'}`);
      setExpenses(saved ? JSON.parse(saved) : []);
      setIsContractValid(true);
      return;
    }

    try {
      setIsLoading(true);
      
      const isValid = await checkContract(CONTRACT_ADDRESS);
      if (!isValid) {
        setExpenses([]);
        return;
      }

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
    } catch (error: any) {
      console.error("Fetch error:", error);
      if (error.code === "BAD_DATA") {
        toast.error("Contract interface mismatch or incorrect address.");
      } else {
        toast.error("Failed to fetch expenses from blockchain.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchExpenses();
    }
  }, [account, isDemoMode]);

  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => window.location.reload();
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount(null);
      };

      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const addExpense = async (amount: number, category: Category, description: string) => {
    if (isDemoMode) {
      const newExpense: Expense = {
        id: Date.now(),
        amount,
        category,
        description,
        timestamp: Math.floor(Date.now() / 1000),
        user: account || "0xDemoUser",
      };
      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      localStorage.setItem(`expenses_${account || 'demo'}`, JSON.stringify(updated));
      toast.success("Expense added (Demo Mode)");
      return;
    }

    try {
      setIsSubmitting(true);
      const contract = await getContract(true);
      if (!contract) {
        toast.error("Please provide a valid contract address first.");
        return;
      }

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
    if (isDemoMode) {
      const updated = expenses.filter((_, i) => i !== index);
      setExpenses(updated);
      localStorage.setItem(`expenses_${account || 'demo'}`, JSON.stringify(updated));
      toast.success("Expense removed (Demo Mode)");
      return;
    }

    try {
      setIsDeleting(index);
      const contract = await getContract(true);
      if (!contract) {
        toast.error("Please provide a valid contract address first.");
        return;
      }

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
            
            {!isContractValid && !isDemoMode && account && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
                <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-dashed border-amber-200 dark:border-amber-800 rounded-3xl text-center">
                  <h4 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                    {currentChainId !== "11155111" ? "Wrong Network Detected" : "Contract Not Found"}
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">
                    {currentChainId !== "11155111" 
                      ? `You are on Chain ID ${currentChainId}. Please switch to Sepolia Test Network (11155111).`
                      : `No contract found at ${CONTRACT_ADDRESS}. Make sure your contract is deployed to Sepolia.`}
                  </p>
                  
                  <div className="flex justify-center gap-4">
                    {currentChainId !== "11155111" ? (
                      <button
                        onClick={switchNetwork}
                        className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-amber-600/20"
                      >
                        Switch to Sepolia (11155111)
                      </button>
                    ) : (
                      <button
                        onClick={() => fetchExpenses()}
                        className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-amber-600/20"
                      >
                        Retry Sync
                      </button>
                    )}
                    <button
                      onClick={() => setIsDemoMode(true)}
                      className="px-8 py-3 bg-white dark:bg-gray-900 border-2 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 rounded-2xl text-sm font-bold transition-all"
                    >
                      Try Demo Mode
                    </button>
                  </div>
                </div>
              </div>
            )}

              <ExpenseList 
                expenses={expenses} 
                onDelete={deleteExpense} 
                isDeleting={isDeleting}
              />
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

