import React, { useState } from 'react';
import { MessageSquare, Sparkles, Loader2, PlusCircle, Gavel , Trash2 } from 'lucide-react';
import type { RequestBoxViewProps, RequestItem } from '../../types';
import { callGemini } from '../../config/api';
import { requestsService } from '../../services/requestsService';
import { useAuth } from '../../contexts/AuthContext';
import { canDeleteContent } from '../../utils/permissions';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SuccessModal } from '../modals/SuccessModal';
import { ErrorModal } from '../modals/ErrorModal';

export const RequestBoxView: React.FC<RequestBoxViewProps> = ({ 
  userRole, 
  requests, 
  setRequests, 
  isGenerating, 
  setIsGenerating, 
  generatedContent, 
  setGeneratedContent, 
  baseClasses, 
  currentTheme, 
  t, 
  darkMode, 
  lang 
}) => {
  const { userProfile } = useAuth();
  const [newRequestText, setNewRequestText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<RequestItem | null>(null);
  
  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const handleDeleteRequest = async (req: RequestItem) => {
    try {
      await requestsService.delete(req.id);
      setRequests(requests.filter((r) => r.id !== req.id));
    } catch (error) {
      console.error('Error deleting request:', error);
      setErrorModal({ isOpen: true, title: t('error_occurred'), message: t('delete_failed') });
    }
  };

  const filteredRequests = userRole === 'admin'
    ? requests
    : requests.filter((req) =>
        req.user_id ? req.user_id === userProfile?.id : req.user === userProfile?.full_name
      );

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestText.trim()) return;
    try {
      const newReq = await requestsService.create({
        user: userProfile?.full_name || 'Kullanıcı',
        user_id: userProfile?.id ?? null,
        date: new Date().toISOString().split('T')[0],
        content: newRequestText,
        status: 'status_new',
        inAgenda: false
      });
      setRequests([newReq, ...requests]);
      setNewRequestText('');
      setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Talebiniz başarıyla gönderildi.' });
    } catch (error) {
      console.error('Error creating request:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Talep oluşturulurken bir hata oluştu.' });
    }
  };

  const toggleAgenda = async (id: number) => {
    try {
      const request = requests.find(r => r.id === id);
      if (!request) return;
      await requestsService.toggleAgenda(id, !request.inAgenda);
      setRequests(requests.map((req) => req.id === id ? { ...req, inAgenda: !req.inAgenda } : req));
    } catch (error) {
      console.error('Error toggling agenda:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Gündem durumu güncellenirken bir hata oluştu.' });
    }
  };

  const updateRequestStatus = async (id: number, newStatus: string) => {
    try {
      await requestsService.updateStatus(id, newStatus as RequestItem['status']);
      setRequests(requests.map((req) => req.id === id ? { ...req, status: newStatus as RequestItem['status'] } : req));
    } catch (error) {
      console.error('Error updating request status:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Talep durumu güncellenirken bir hata oluştu.' });
    }
  };

  const generateAgenda = async () => {
    const agendaItems = requests.filter((r) => r.inAgenda);
    if (agendaItems.length === 0) {
      setErrorModal({ isOpen: true, title: 'Uyarı', message: 'Gündeme alınmış madde bulunmamaktadır.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedContent('');
    const itemsText = agendaItems.map((item) => `- ${item.content} (${t('resident')}: ${item.user})`).join('\n');
    const prompt = `Act as a professional building manager. Create a formal meeting agenda based on these requests in ${lang === 'tr' ? 'Turkish' : 'English'}:\n${itemsText}`;
    const result = await callGemini(prompt);
    setGeneratedContent(result);
    setIsGenerating(false);
  };

  return (
    <div className="p-4 animate-fade-in">
      <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
        <MessageSquare className={`mr-2 ${currentTheme.text}`} /> {t('requests')}
      </h2>

      {/* AI Assistant Section (Admin Only) */}
      {userRole === 'admin' && (
        <div className={`border rounded-xl p-6 mb-8 relative overflow-hidden ${darkMode ? 'bg-slate-800 border-purple-900/50' : `bg-gradient-to-r ${currentTheme.light} to-white ${currentTheme.border}`}`}>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className={`flex items-center ${currentTheme.text} mb-2`}>
                <Sparkles size={20} className="mr-2 animate-pulse" />
                <h3 className="font-bold text-lg">{t('ai_assistant_title')}</h3>
              </div>
              <p className={`text-sm mb-4 max-w-xl ${baseClasses.textSub}`}>{t('ai_desc')}</p>
              <div className="flex gap-2">
                <button 
                  onClick={generateAgenda} 
                  disabled={isGenerating} 
                  className={`${currentTheme.primary} text-white px-4 py-2 rounded-lg ${currentTheme.hover} flex items-center shadow-lg transition-all disabled:opacity-50`}
                >
                  {isGenerating ? <Loader2 className="animate-spin mr-2" size={16}/> : <Sparkles className="mr-2" size={16}/>} 
                  {t('generate_agenda')}
                </button>
              </div>
            </div>
          </div>
          {generatedContent && (
            <div className={`mt-6 p-4 rounded-lg border shadow-sm animate-fade-in ${baseClasses.bgCard}`}>
              <pre className={`whitespace-pre-wrap text-sm font-sans ${baseClasses.textMain}`}>{generatedContent}</pre>
            </div>
          )}
        </div>
      )}

      {/* New Request Form */}
      <div className={`rounded-xl shadow-sm border mb-8 p-6 ${baseClasses.bgCard}`}>
        <h3 className={`text-lg font-semibold mb-4 ${baseClasses.textMain}`}>{t('new_request')}</h3>
        <form onSubmit={handleAddRequest}>
          <textarea 
            className={`w-full p-4 border rounded-lg resize-none outline-none focus:ring-2 ${currentTheme.ring} ${baseClasses.input}`}
            rows={2} 
            placeholder={t('request_placeholder')} 
            value={newRequestText} 
            onChange={(e) => setNewRequestText(e.target.value)} 
          />
          <div className="flex justify-end mt-3">
            <button 
              type="submit" 
              className={`${currentTheme.primary} text-white px-6 py-2 rounded-lg ${currentTheme.hover} flex items-center font-medium`}
            >
              <PlusCircle size={18} className="mr-2" /> {t('send_btn')}
            </button>
          </div>
        </form>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((req) => (
          <div 
            key={req.id} 
            className={`p-5 rounded-xl border transition-all ${baseClasses.bgCard} ${req.inAgenda ? `${currentTheme.border} ring-1 ring-offset-1 ring-purple-500` : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <span className={`font-bold mr-3 ${baseClasses.textMain}`}>{req.user}</span>
                <span className={`text-xs ${baseClasses.textSub}`}>{req.date}</span>
              </div>
              
              {userRole === 'admin' ? (
                <div className="flex items-center gap-2">
                  <select 
                    value={req.status} 
                    onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                    className={`text-xs p-1 rounded border outline-none font-semibold cursor-pointer ${baseClasses.input}`}
                  >
                    <option value="status_new">{t('status_new')}</option>
                    <option value="status_review">{t('status_review')}</option>
                    <option value="status_completed">{t('status_completed')}</option>
                  </select>
                  {canDeleteContent(userProfile, req.user_id) && (
                    <button
                      onClick={() => setConfirmDelete(req)}
                      aria-label={t('delete')}
                      title={t('delete')}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${req.status === 'status_completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {t(req.status)}
                  </span>
                  {canDeleteContent(userProfile, req.user_id) && (
                    <button
                      onClick={() => setConfirmDelete(req)}
                      aria-label={t('delete')}
                      title={t('delete')}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className={`mb-4 ${baseClasses.textSub}`}>{req.content}</p>
            
            {userRole === 'admin' && (
              <div className={`flex justify-end pt-3 border-t ${baseClasses.border} gap-2`}>
                <button 
                  onClick={() => toggleAgenda(req.id)} 
                  className={`flex items-center text-sm px-3 py-1.5 rounded transition-colors ${req.inAgenda ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  <Gavel size={16} className="mr-2" /> 
                  {req.inAgenda ? t('agenda_toggle_off') : t('agenda_toggle_on')}
                </button>
              </div>
            )}
            
            {userRole === 'resident' && req.inAgenda && (
              <div className={`mt-2 text-sm ${currentTheme.text} flex items-center font-medium`}>
                <Gavel size={14} className="mr-1" /> {t('agenda')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modals */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
        darkMode={darkMode}
      />
      <ConfirmModal
        isOpen={confirmDelete !== null}
        title={t('delete_confirm_title')}
        message={t('delete_confirm_request')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() => {
          if (confirmDelete) handleDeleteRequest(confirmDelete);
          setConfirmDelete(null);
        }}
        onClose={() => setConfirmDelete(null)}
        baseClasses={baseClasses}
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
