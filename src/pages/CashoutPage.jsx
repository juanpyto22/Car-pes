import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  DollarSign,
  Wallet,
  History,
  Plus,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLevelStatus, useUserBankAccounts, useRequestWithdrawal, useWithdrawalHistory } from '@/hooks/useLevelRewards';
import { useToast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

const CashoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const levelStatus = useLevelStatus();
  const { accounts, loading: accountsLoading, addAccount } = useUserBankAccounts();
  const { requestWithdrawal } = useRequestWithdrawal();
  const { history, loading: historyLoading } = useWithdrawalHistory();

  const [activeTab, setActiveTab] = useState('wallet'); // wallet, accounts, history
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('10.00');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states for adding account
  const [accountType, setAccountType] = useState('paypal');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  if (levelStatus.loading) {
    return <LoadingSpinner />;
  }

  const coinsInEuros = (levelStatus.coinsAvailable / 10000).toFixed(2);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountIdentifier.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await addAccount(accountType, accountIdentifier, accountHolder);
      if (result.success) {
        toast({
          title: 'Cuenta agregada',
          description: 'Tu cuenta bancaria ha sido verificada',
          variant: 'success'
        });
        setShowAddAccount(false);
        setAccountIdentifier('');
        setAccountHolder('');
        setAccountType('paypal');
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Error',
        description: 'Select a bank account',
        variant: 'destructive'
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount < 10 || amount > parseFloat(coinsInEuros)) {
      toast({
        title: 'Error',
        description: `Amount must be between €10.00 and €${coinsInEuros}`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await requestWithdrawal(amount, selectedAccount);
      if (result.success) {
        toast({
          title: '¡Retiro solicitado!',
          description: 'Tu solicitud de retiro ha sido enviada. Se procesará en 1-3 días hábiles.',
          variant: 'success'
        });
        setWithdrawAmount('10.00');
        setSelectedAccount(null);
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cashout - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-400 to-teal-500 bg-clip-text text-transparent mb-2">
              💰 Retirar Dinero
            </h1>
            <p className="text-slate-400">Convierte tus monedas virtuales en dinero real</p>
          </motion.div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/20 rounded-2xl p-6 mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-400 font-semibold mb-1">Saldo Disponible</p>
                <p className="text-3xl font-black text-white">€{coinsInEuros}</p>
              </div>
              <div>
                <p className="text-sm text-green-400 font-semibold mb-1">Monedas</p>
                <p className="text-2xl font-black text-emerald-300">{levelStatus.coinsAvailable.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-green-400 font-semibold mb-1">Nivel Actual</p>
                <p className="text-2xl font-black text-cyan-300">{levelStatus.currentLevel}</p>
              </div>
            </div>

            {!levelStatus.canWithdraw && (
              <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <p className="text-sm text-yellow-300">
                  Necesitas mínimo €10.00 para solicitar un retiro
                </p>
              </div>
            )}
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-white/10">
            {[
              { id: 'wallet', label: '💳 Cartera', icon: Wallet },
              { id: 'accounts', label: '🏦 Cuentas', icon: DollarSign },
              { id: 'history', label: '📜 Historial', icon: History }
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-semibold text-sm transition-all ${
                  activeTab === tab.id
                    ? 'text-green-400 border-b-2 border-green-500'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Send className="w-5 h-5 text-green-400" />
                    Solicitar Retiro
                  </h3>

                  {!levelStatus.canWithdraw ? (
                    <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
                      <p className="text-red-400">
                        Necesitas alcanzar €10.00 para retirar dinero
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Cantidad a Retirar (EUR)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-500">€</span>
                          <input
                            type="number"
                            min="10"
                            max={coinsInEuros}
                            step="0.01"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pl-8 pr-4 text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Máximo: €{coinsInEuros}
                        </p>
                      </div>

                      {/* Account Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Selecciona Cuenta Bancaria
                        </label>
                        {accounts.length === 0 ? (
                          <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg text-center">
                            <p className="text-amber-400">
                              Primero debes agregar una cuenta bancaria
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {accounts.map((account) => (
                              <motion.button
                                key={account.id}
                                onClick={() => setSelectedAccount(account.id)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                  selectedAccount === account.id
                                    ? 'border-green-500 bg-green-900/20'
                                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                                }`}
                                whileHover={{ scale: 1.02 }}
                              >
                                <p className="font-semibold text-white capitalize">
                                  {account.account_type === 'paypal' ? '🅿️ PayPal' : '🏦 Banco'}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {account.account_identifier}
                                </p>
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        onClick={handleRequestWithdrawal}
                        disabled={loading || !selectedAccount || accounts.length === 0}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? 'Procesando...' : 'Solicitar Retiro'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Accounts Tab */}
            {activeTab === 'accounts' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {!showAddAccount ? (
                  <div className="space-y-4">
                    {accountsLoading ? (
                      <LoadingSpinner />
                    ) : (
                      <>
                        {accounts.map((account) => (
                          <motion.div
                            key={account.id}
                            className="bg-slate-900/50 border border-white/10 rounded-xl p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-bold text-white capitalize">
                                  {account.account_type === 'paypal' ? '🅿️ PayPal' : '🏦 Banco'}
                                </p>
                                <p className="text-slate-400 text-sm">{account.account_identifier}</p>
                                {account.account_holder_name && (
                                  <p className="text-slate-500 text-xs mt-1">
                                    {account.account_holder_name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {account.is_verified && (
                                  <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                                    ✓ Verificada
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        <motion.button
                          onClick={() => setShowAddAccount(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus className="w-5 h-5" />
                          Agregar Cuenta
                        </motion.button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/50 border border-white/10 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Nueva Cuenta Bancaria</h3>
                    <form onSubmit={handleAddAccount} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Tipo de Cuenta
                        </label>
                        <select
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="paypal">PayPal</option>
                          <option value="iban">IBAN/Banco</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          {accountType === 'paypal' ? 'Email de PayPal' : 'Número IBAN'}
                        </label>
                        <input
                          type={accountType === 'paypal' ? 'email' : 'text'}
                          value={accountIdentifier}
                          onChange={(e) => setAccountIdentifier(e.target.value)}
                          placeholder={accountType === 'paypal' ? 'tu@email.com' : 'ES9121000418450200051332'}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          Nombre del Titular
                        </label>
                        <input
                          type="text"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          placeholder="Tu nombre completo"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex gap-3">
                        <motion.button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {loading ? 'Agregando...' : 'Agregar Cuenta'}
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => setShowAddAccount(false)}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-all"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Cancelar
                        </motion.button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                {historyLoading ? (
                  <LoadingSpinner />
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>No hay retiros registrados</p>
                  </div>
                ) : (
                  history.map((trans) => (
                    <motion.div
                      key={trans.id}
                      className="bg-slate-900/50 border border-white/10 rounded-xl p-4 flex items-start justify-between"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          trans.status === 'completed' ? 'bg-green-900/30' :
                          trans.status === 'pending' ? 'bg-yellow-900/30' :
                          'bg-red-900/30'
                        }`}>
                          {trans.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : trans.status === 'pending' ? (
                            <Clock className="w-5 h-5 text-yellow-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            €{parseFloat(trans.amount).toFixed(2)}
                          </p>
                          <p className="text-sm text-slate-400 capitalize">
                            {trans.account_type}: {trans.account_identifier}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(trans.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${
                        trans.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                        trans.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {trans.status}
                      </span>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CashoutPage;
