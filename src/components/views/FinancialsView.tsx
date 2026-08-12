import React, { useState, useMemo } from 'react';
import { Wallet, CheckCircle, CreditCard, BellRing, Clock, Loader2, FileCheck, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { FinancialsViewProps, LedgerItem } from '../../types';
import { ledgersService } from '../../services/ledgersService';
import { useAuth } from '../../contexts/AuthContext';
import { receiptRequestsService } from '../../services/receiptRequestsService';
import { useReceiptRequests } from '../../hooks/useReceiptRequests';
import { SuccessModal } from '../modals/SuccessModal';
import { ErrorModal } from '../modals/ErrorModal';
import { sortLedgerItems, LOCALES } from '../../utils/helpers';

export const FinancialsView: React.FC<FinancialsViewProps> = ({
  userRole,
  lang,
  residents,
  setResidents, 
  baseClasses, 
  currentTheme, 
  t, 
  darkMode, 
  meetingDate, 
  calculateTotalDebt, 
  getResidentLedgerWithPlanning 
}) => {
  const { userProfile, user } = useAuth();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<typeof residents[0] | null>(null);
  const [selectedResidentForDetail, setSelectedResidentForDetail] = useState<typeof residents[0] | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [residentPaymentNote, setResidentPaymentNote] = useState<string>('');
  const [residentPaymentAmount, setResidentPaymentAmount] = useState<string>('');
  const [submittingReceipt, setSubmittingReceipt] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 12;
  
  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  
  // Fetch receipt requests based on role
  const { receiptRequests, refetch: refetchReceiptRequests } = useReceiptRequests(
    userRole === 'admin' ? undefined : user?.id
  );

  // Resident view data - must be called before any conditional returns (React hooks rule)
  // Prefer the explicit link on the profile; fall back to name matching only for
  // accounts an admin hasn't linked yet (see scripts/move_link_to_user_profiles.sql).
  // Birden fazla hesap aynı daireye bağlı olabilir - hepsi aynı kaydı görür.
  const myResidentRecord =
    residents.find((r) => r.id === userProfile?.resident_id) ??
    residents.find((r) => r.name === userProfile?.full_name);
  const myFullLedgerUnsorted = myResidentRecord ? getResidentLedgerWithPlanning(myResidentRecord) : [];
  const myDebt = calculateTotalDebt(myFullLedgerUnsorted);
  
  // Apply custom sorting
  const myFullLedger = useMemo(() => sortLedgerItems(myFullLedgerUnsorted), [myFullLedgerUnsorted]);
  
  // Pagination logic
  const totalPages = Math.ceil(myFullLedger.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLedger = myFullLedger.slice(startIndex, endIndex);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(paymentAmountInput);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Geçersiz tutar girdiniz.' });
      return;
    }

    if (!selectedDebtor) return;

    const debtorLedger = getResidentLedgerWithPlanning(selectedDebtor);
    const totalDebt = calculateTotalDebt(debtorLedger);
    if (paymentAmount > totalDebt) {
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Girilen tutar toplam borçtan fazla.' });
      return;
    }

    try {
      let remainingPayment = paymentAmount;
      // Use debtorLedger which includes both existing and planned debts
      const unpaidItems = debtorLedger.filter((item) => item.status !== 'paid');
      
      for (const item of unpaidItems) {
        console.log('Processing item:', item);
        if (remainingPayment <= 0) break;
        
        const recordExists = item.id && !item.id.startsWith('plan-');
        const itemDebt = item.status === 'partial_paid' 
          ? item.amount - (item.paid_amount || 0)
          : item.amount;
        
        if (remainingPayment >= itemDebt) {
          // Full payment for this item
          if (recordExists) {
            // Existing record - update it
            await ledgersService.updateStatus(item.id, 'paid');
          } else {
            // Planned debt - insert as paid
            await ledgersService.create(selectedDebtor.id, {
              date: item.date,
              desc: item.desc,
              amount: item.amount,
              status: 'paid'
            });
          }
          remainingPayment -= itemDebt;
        } else {
          // Partial payment for this item
          const paidAmount = (item.paid_amount || 0) + remainingPayment;
          
          if (recordExists) {
            // Existing record - update to partial_paid
            await ledgersService.update(item.id, { 
              status: 'partial_paid',
              paid_amount: paidAmount
            });
          } else {
            // Planned debt - insert as partial_paid
            await ledgersService.create(selectedDebtor.id, {
              date: item.date,
              desc: item.desc,
              amount: item.amount,
              status: 'partial_paid',
              paid_amount: paidAmount
            });
          }
          remainingPayment = 0;
        }
      }

      const updatedResident = await ledgersService.getByResidentId(selectedDebtor.id);
      const updatedResidents = residents.map((r) => 
        r.id === selectedDebtor.id 
          ? { ...r, ledger: updatedResident } 
          : r
      );
      
      setResidents(updatedResidents);
      setPaymentModalOpen(false);
      setSelectedDebtor(null);
      setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Ödeme başarıyla işlendi.' });
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Ödeme işlenirken bir hata oluştu.' });
    }
  };

  const renderLedgerRow = (item: LedgerItem) => {
    let statusColor = "bg-gray-100 text-gray-600";
    if (item.status === 'paid') statusColor = "bg-green-100 text-green-700";
    if (item.status === 'unpaid') statusColor = "bg-red-100 text-red-700";
    if (item.status === 'planned') statusColor = "bg-blue-50 text-blue-600 border border-blue-100";
    if (item.status === 'partial_paid') statusColor = "bg-yellow-100 text-yellow-700";

    const displayAmount = item.status === 'partial_paid' 
      ? `${item.paid_amount || 0} / ${item.amount} ₺`
      : `${item.amount} ₺`;
    
    const amountColor = item.status === 'unpaid' ? 'text-red-500' 
      : item.status === 'planned' ? 'text-blue-500' 
      : item.status === 'partial_paid' ? 'text-yellow-600'
      : 'text-green-600';

    return (
      <tr key={item.id} className={`border-b ${baseClasses.border} ${baseClasses.hover}`}>
        <td className={`p-4 ${baseClasses.textSub}`}>{item.date}</td>
        <td className={`p-4 font-medium ${baseClasses.textMain}`}>{item.desc}</td>
        <td className="p-4">
          <span className={`px-2 py-1 rounded text-xs font-bold ${statusColor}`}>
            {t(`status_${item.status}`)}
          </span>
        </td>
        <td className={`p-4 text-right font-bold ${amountColor}`}>
          {displayAmount}
        </td>
      </tr>
    );
  };

  // Admin Görünümü
  if (userRole === 'admin') {
    // Show detail view if a resident is selected
    if (selectedResidentForDetail) {
      const detailLedgerUnsorted = getResidentLedgerWithPlanning(selectedResidentForDetail);
      const detailDebt = calculateTotalDebt(detailLedgerUnsorted);
      const detailLedger = sortLedgerItems(detailLedgerUnsorted);
      
      // Pagination for detail view
      const detailTotalPages = Math.ceil(detailLedger.length / ITEMS_PER_PAGE);
      const detailStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      const detailEndIndex = detailStartIndex + ITEMS_PER_PAGE;
      const detailPaginatedLedger = detailLedger.slice(detailStartIndex, detailEndIndex);

      return (
        <div className="p-4 animate-fade-in">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedResidentForDetail(null);
              setCurrentPage(1);
            }}
            className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 ${currentTheme.primary} text-white hover:opacity-90`}
          >
            <ChevronLeft size={16} />
            {t('back') || 'Geri'}
          </button>

          <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
            <Wallet className={`mr-2 ${currentTheme.text}`} /> {selectedResidentForDetail.name} - No: {selectedResidentForDetail.door}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`bg-gradient-to-br ${currentTheme.gradient} rounded-xl p-6 text-white shadow-lg`}>
              <p className="opacity-80 mb-1">{t('total_debt')}</p>
              <h3 className="text-3xl font-bold">{detailDebt.toFixed(2)} ₺</h3>
              <div className="mt-4 text-xs bg-white/20 p-2 rounded flex items-center">
                <Clock size={14} className="mr-1"/> {t('meeting_date')}: {meetingDate}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className={`rounded-xl shadow-sm border overflow-hidden ${baseClasses.bgCard}`}>
            <div className={`p-4 border-b font-semibold ${baseClasses.textMain} ${baseClasses.border} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
              {t('ledger_history')}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b text-sm ${baseClasses.border} ${baseClasses.textSub}`}>
                    <th className="p-4">{t('date')}</th>
                    <th className="p-4">{t('description')}</th>
                    <th className="p-4">{t('status')}</th>
                    <th className="p-4 text-right">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPaginatedLedger.map((item) => renderLedgerRow(item))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {detailTotalPages > 1 && (
              <div className={`p-4 border-t ${baseClasses.border} flex items-center justify-between`}>
                <span className={`text-sm ${baseClasses.textSub}`}>
                  {t('showing')}: {detailStartIndex + 1}-{Math.min(detailEndIndex, detailLedger.length)} / {detailLedger.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-lg border ${baseClasses.border} transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 ${baseClasses.textMain}`}
                  >
                    <ChevronLeft size={16} />
                    {t('previous') || 'Önceki'}
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: detailTotalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg border ${baseClasses.border} transition-colors ${
                          page === currentPage
                            ? `${currentTheme.primary} text-white font-bold`
                            : `${darkMode ? 'bg-slate-700' : 'bg-white'} hover:bg-opacity-80`
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(detailTotalPages, prev + 1))}
                    disabled={currentPage === detailTotalPages}
                    className={`px-3 py-1 rounded-lg border ${baseClasses.border} transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 ${baseClasses.textMain}`}
                  >
                    {t('next') || 'Sonraki'}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show list view
    return (
      <div className="p-4 animate-fade-in">
        <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
          <Wallet className={`mr-2 ${currentTheme.text}`} /> {t('financials')} (Admin)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 rounded-xl shadow-sm border overflow-hidden ${baseClasses.bgCard}`}>
            <div className={`p-4 border-b ${baseClasses.border} flex justify-between items-center ${darkMode ? 'bg-slate-700/50' : currentTheme.light}`}>
              <span className={`font-bold ${currentTheme.text}`}>{t('total_debt')} Listesi</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className={`border-b text-sm ${baseClasses.border} ${baseClasses.textSub}`}>
                    <th className="p-4">{t('flat')}</th>
                    <th className="p-4">{t('name')}</th>
                    <th className="p-4 text-right">{t('amount')}</th>
                    <th className="p-4 text-center">{t('detail') || 'Detay'}</th>
                    <th className="p-4 text-center">{t('collect')}</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((resident) => {
                    const residentLedger = getResidentLedgerWithPlanning(resident);
                    const debt = calculateTotalDebt(residentLedger);
                    return (
                      <tr key={resident.id} className={`border-b ${baseClasses.border} ${baseClasses.hover}`}>
                        <td className={`p-4 font-medium ${baseClasses.textMain}`}>No:{resident.door}</td>
                        <td className={`p-4 ${baseClasses.textSub}`}>{resident.name}</td>
                        <td className={`p-4 text-right font-bold ${debt > 0 ? 'text-red-500' : 'opacity-40'}`}>
                          {debt} ₺
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedResidentForDetail(resident);
                              setCurrentPage(1);
                            }}
                            className={`${currentTheme.primary} text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 flex items-center mx-auto`}
                          >
                            <Eye size={12} className="mr-1"/> {t('detail') || 'Detay'}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          {debt > 0 ? (
                            <button 
                              onClick={() => {
                                setSelectedDebtor(resident); 
                                setPaymentAmountInput(''); 
                                setPaymentModalOpen(true);
                              }} 
                              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 flex items-center mx-auto"
                            >
                              <CreditCard size={12} className="mr-1"/> {t('collect')}
                            </button>
                          ) : <CheckCircle size={18} className="text-green-500 mx-auto" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Admin Receipt Requests Section */}
        <div className={`rounded-xl shadow-sm border overflow-hidden ${baseClasses.bgCard} mt-6`}>
          <div className={`p-4 border-b font-semibold ${baseClasses.textMain} ${baseClasses.border} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} flex items-center gap-2`}>
            <FileCheck size={20} className="text-orange-500" />
            {t('receipt_requests_title') || 'Makbuz Talepleri'}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b text-sm ${baseClasses.border} ${baseClasses.textSub} ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <th className="p-4">{t('receipt_date') || 'Tarih'}</th>
                  <th className="p-4">Sakin</th>
                  <th className="p-4">Daire</th>
                  <th className="p-4">{t('receipt_amount') || 'Tutar'}</th>
                  <th className="p-4">{t('receipt_message') || 'Mesaj'}</th>
                  <th className="p-4">{t('receipt_status') || 'Durum'}</th>
                  <th className="p-4">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {receiptRequests && receiptRequests.length > 0 ? (
                  receiptRequests.map((request) => (
                    <tr key={request.id} className={`border-b ${baseClasses.border} ${baseClasses.textMain}`}>
                      <td className="p-4 text-sm">
                        {new Date(request.created_at).toLocaleDateString(LOCALES[lang])}
                      </td>
                      <td className="p-4 font-medium">{request.user_name}</td>
                      <td className="p-4 text-sm">{request.apartment_info || '-'}</td>
                      <td className="p-4 font-bold text-green-600">
                        {request.amount > 0 ? `${request.amount.toFixed(2)} ₺` : '-'}
                      </td>
                      <td className="p-4 text-sm max-w-xs truncate">{request.message}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          request.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {t(request.status) || request.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  // Process payment deduction if amount exists
                                  if (request.amount > 0 && request.user_id) {
                                    const resident = residents.find(r => r.name === request.user_name);
                                    if (resident) {
                                      let remainingPayment = request.amount;
                                      
                                      // Step 1: Complete any existing partial_paid items first (oldest first)
                                      const partialPaidItems = resident.ledger
                                        .filter(item => item.status === 'partial_paid')
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                      
                                      for (const item of partialPaidItems) {
                                        if (remainingPayment <= 0) break;
                                        const remainingDebt = item.amount - (item.paid_amount || 0);
                                        
                                        if (remainingPayment >= remainingDebt) {
                                          // Complete the partial payment
                                          await ledgersService.update(item.id, { 
                                            status: 'paid',
                                            paid_amount: item.amount // Mark as fully paid
                                          });
                                          remainingPayment -= remainingDebt;
                                        } else {
                                          // Add to partial payment
                                          await ledgersService.update(item.id, { 
                                            paid_amount: (item.paid_amount || 0) + remainingPayment
                                          });
                                          remainingPayment = 0;
                                        }
                                      }
                                      
                                      // Step 2: Process unpaid items (oldest first)
                                      if (remainingPayment > 0) {
                                        const unpaidItems = resident.ledger
                                          .filter(item => item.status === 'unpaid')
                                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                        
                                        for (const item of unpaidItems) {
                                          if (remainingPayment <= 0) break;
                                          
                                          if (remainingPayment >= item.amount) {
                                            // Full payment
                                            await ledgersService.update(item.id, { 
                                              status: 'paid',
                                              paid_amount: item.amount
                                            });
                                            remainingPayment -= item.amount;
                                          } else {
                                            // Partial payment
                                            await ledgersService.update(item.id, { 
                                              status: 'partial_paid',
                                              paid_amount: remainingPayment
                                            });
                                            remainingPayment = 0;
                                          }
                                        }
                                      }
                                      
                                      // Step 3: Handle future planned debts (prepayment)
                                      if (remainingPayment > 0) {
                                        const fullLedger = getResidentLedgerWithPlanning(resident);
                                        const plannedItems = fullLedger
                                          .filter(item => item.status === 'planned')
                                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                        
                                        for (const plannedItem of plannedItems) {
                                          if (remainingPayment <= 0) break;
                                          
                                          // Check if this planned item exists in DB
                                          const existsInDb = resident.ledger.find(item => item.id === plannedItem.id);
                                          
                                          if (existsInDb) {
                                            // This shouldn't happen for planned items, but handle it
                                            if (remainingPayment >= plannedItem.amount) {
                                              await ledgersService.update(plannedItem.id, { 
                                                status: 'paid',
                                                paid_amount: plannedItem.amount
                                              });
                                              remainingPayment -= plannedItem.amount;
                                            } else {
                                              await ledgersService.update(plannedItem.id, { 
                                                status: 'partial_paid',
                                                paid_amount: remainingPayment
                                              });
                                              remainingPayment = 0;
                                            }
                                          } else {
                                            // Create new DB record (prepayment)
                                            if (remainingPayment >= plannedItem.amount) {
                                              // Full prepayment
                                              await ledgersService.create(resident.id, {
                                                date: plannedItem.date,
                                                desc: plannedItem.desc,
                                                amount: plannedItem.amount,
                                                status: 'paid',
                                                paid_amount: plannedItem.amount
                                              });
                                              remainingPayment -= plannedItem.amount;
                                            } else {
                                              // Partial prepayment
                                              await ledgersService.create(resident.id, {
                                                date: plannedItem.date,
                                                desc: plannedItem.desc,
                                                amount: plannedItem.amount,
                                                status: 'partial_paid',
                                                paid_amount: remainingPayment
                                              });
                                              remainingPayment = 0;
                                            }
                                          }
                                        }
                                      }
                                      
                                      // Refresh resident ledger
                                      const updatedLedger = await ledgersService.getByResidentId(resident.id);
                                      setResidents(residents.map(r => r.id === resident.id ? { ...r, ledger: updatedLedger } : r));
                                    }
                                  }
                                  
                                  await receiptRequestsService.updateStatus(request.id, 'approved');
                                  refetchReceiptRequests();
                                  setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Makbuz talebi onaylandı ve ödeme işlendi.' });
                                } catch (error) {
                                  console.error('Error approving receipt:', error);
                                  setErrorModal({ isOpen: true, title: 'Hata', message: 'Makbuz onaylanırken bir hata oluştu.' });
                                }
                              }}
                              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              {t('approve') || 'Onayla'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await receiptRequestsService.updateStatus(request.id, 'rejected');
                                  refetchReceiptRequests();
                                  setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Makbuz talebi reddedildi.' });
                                } catch (error) {
                                  console.error('Error rejecting receipt:', error);
                                  setErrorModal({ isOpen: true, title: 'Hata', message: 'Makbuz reddedilirken bir hata oluştu.' });
                                }
                              }}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              {t('reject') || 'Reddet'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className={`p-8 text-center text-sm ${baseClasses.textSub}`}>
                      Henüz makbuz talebi bulunmamaktadır.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Payment Modal */}
        {paymentModalOpen && selectedDebtor && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className={`${baseClasses.bgCard} rounded-xl p-6 w-full max-w-md`}>
              <h3 className={`text-xl font-bold mb-4 ${baseClasses.textMain}`}>{t('collection_process')}</h3>
              <div className={`mb-4 p-3 border rounded ${baseClasses.border}`}>
                <p className={`text-sm ${baseClasses.textSub}`}>{selectedDebtor.name} (No: {selectedDebtor.door})</p>
                <p className="text-xl font-bold text-red-500 mt-1">{t('total')}: {calculateTotalDebt(getResidentLedgerWithPlanning(selectedDebtor))} ₺</p>
              </div>
              <input 
                type="number" 
                value={paymentAmountInput} 
                onChange={(e) => setPaymentAmountInput(e.target.value)} 
                className={`w-full p-3 border rounded-lg mb-4 text-lg font-bold ${baseClasses.input}`} 
                placeholder="0.00" 
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setPaymentModalOpen(false)} 
                  className={`px-4 py-2 rounded text-sm ${baseClasses.textSub}`}
                >
                  {t('close')}
                </button>
                <button 
                  onClick={handleProcessPayment} 
                  className="bg-green-600 text-white px-4 py-2 rounded font-bold"
                >
                  {t('process_payment')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Sakin Görünümü (data already calculated above)
  return (
    <div className="p-4 animate-fade-in">
      <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
        <Wallet className={`mr-2 ${currentTheme.text}`} /> {t('financials')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`bg-gradient-to-br ${currentTheme.gradient} rounded-xl p-6 text-white shadow-lg`}>
          <p className="opacity-80 mb-1">{t('total_debt')}</p>
          <h3 className="text-3xl font-bold">{myDebt.toFixed(2)} ₺</h3>
          <div className="mt-4 text-xs bg-white/20 p-2 rounded flex items-center">
            <Clock size={14} className="mr-1"/> {t('meeting_date')}: {meetingDate}
          </div>
        </div>
        <div className={`rounded-xl p-6 shadow-sm border col-span-2 ${baseClasses.bgCard}`}>
          <h3 className={`font-bold mb-2 flex items-center ${baseClasses.textMain}`}>
            <BellRing size={18} className="mr-2 text-orange-500"/> {t('payment_notice')}
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input 
                type="number" 
                placeholder="Ödeme Tutarı (₺)" 
                className={`w-40 border rounded-lg px-4 py-2 text-sm outline-none ${baseClasses.input}`}
                value={residentPaymentAmount} 
                onChange={(e) => setResidentPaymentAmount(e.target.value)} 
              />
              <input 
                type="text" 
                placeholder={t('payment_placeholder')} 
                className={`flex-1 border rounded-lg px-4 py-2 text-sm outline-none ${baseClasses.input}`}
                value={residentPaymentNote} 
                onChange={(e) => setResidentPaymentNote(e.target.value)} 
              />
            </div>
            <button 
              onClick={async () => { 
                if(residentPaymentNote && user?.id) {
                  setSubmittingReceipt(true);
                  try {
                    const amount = parseFloat(residentPaymentAmount) || 0;
                    
                    await receiptRequestsService.create(
                      user.id,
                      userProfile?.full_name || 'Kullanıcı',
                      userProfile?.apartment_info || null,
                      amount,
                      residentPaymentNote
                    );
                    setResidentPaymentNote('');
                    setResidentPaymentAmount('');
                    refetchReceiptRequests();
                    setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Makbuz talebiniz başarıyla gönderildi. Yönetici onayladığında ödenmiş olarak işaretlenecektir.' });
                  } catch (error) {
                    console.error('Error submitting receipt request:', error);
                    setErrorModal({ isOpen: true, title: 'Hata', message: 'Makbuz talebi gönderilirken bir hata oluştu.' });
                  } finally {
                    setSubmittingReceipt(false);
                  }
                } 
              }} 
              disabled={submittingReceipt || !residentPaymentNote}
              className={`text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 ${darkMode ? 'bg-slate-700' : 'bg-slate-800'}`}
            >
              {submittingReceipt ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('sending')}
                </>
              ) : (
                t('notify_btn')
              )}
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden ${baseClasses.bgCard}`}>
        <div className={`p-4 border-b font-semibold ${baseClasses.textMain} ${baseClasses.border} ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
          {t('account_history')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b text-sm ${baseClasses.border} ${baseClasses.textSub} ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <th className="p-4">{t('date')}</th>
                <th className="p-4">{t('desc')}</th>
                <th className="p-4">{t('type')}</th>
                <th className="p-4 text-right">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLedger.map(item => renderLedgerRow(item))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={`p-4 border-t ${baseClasses.border} flex items-center justify-between`}>
            <div className={`text-sm ${baseClasses.textSub}`}>
              {t('showing') || 'Gösteriliyor'}: {startIndex + 1}-{Math.min(endIndex, myFullLedger.length)} / {myFullLedger.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-lg border ${baseClasses.border} disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-80 transition-colors flex items-center gap-1 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}
              >
                <ChevronLeft size={16} />
                {t('previous') || 'Önceki'}
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg border ${baseClasses.border} transition-colors ${
                      page === currentPage
                        ? `${currentTheme.primary} text-white font-bold`
                        : `${darkMode ? 'bg-slate-700' : 'bg-white'} hover:bg-opacity-80`
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-lg border ${baseClasses.border} disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-80 transition-colors flex items-center gap-1 ${darkMode ? 'bg-slate-700' : 'bg-white'}`}
              >
                {t('next') || 'Sonraki'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        darkMode={darkMode}
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
        darkMode={darkMode}
      />
    </div>
  );
};
