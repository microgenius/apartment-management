import React, { useState } from 'react';
import { Users, Send, Pin, User } from 'lucide-react';
import type { CommunityBoardViewProps, CommunityPost } from '../../types';
import { communityPostsService } from '../../services/communityPostsService';
import { useAuth } from '../../contexts/AuthContext';
import { SuccessModal } from '../modals/SuccessModal';
import { ErrorModal } from '../modals/ErrorModal';

export const CommunityBoardView: React.FC<CommunityBoardViewProps> = ({ 
  communityPosts, 
  setCommunityPosts, 
  baseClasses, 
  currentTheme, 
  t, 
  darkMode 
}) => {
  const { userProfile } = useAuth();
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<CommunityPost['type']>('general');

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const handleAddCommunityPost = async () => {
    if (!newPostContent.trim()) return;
    try {
      const newPost = await communityPostsService.create({
        user: `${userProfile?.full_name || 'Kullanıcı'} (Siz)`,
        date: 'Şimdi',
        content: newPostContent,
        type: newPostType
      });
      setCommunityPosts([newPost, ...communityPosts]);
      setNewPostContent('');
      setNewPostType('general');
      setSuccessModal({ isOpen: true, title: 'Başarılı', message: 'Duyuru başarıyla oluşturuldu.' });
    } catch (error) {
      console.error('Error creating post:', error);
      setErrorModal({ isOpen: true, title: 'Hata', message: 'Duyuru oluşturulurken bir hata oluştu.' });
    }
  };

  return (
    <div className="p-4 animate-fade-in">
      <h2 className={`text-2xl font-bold ${baseClasses.textMain} mb-6 flex items-center`}>
        <Users className={`mr-2 ${currentTheme.text}`} /> {t('community')}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Post Creation Panel */}
        <div className={`lg:col-span-1 h-fit rounded-xl p-6 shadow-sm border ${baseClasses.bgCard}`}>
          <h3 className={`font-bold text-lg mb-4 ${baseClasses.textMain}`}>{t('community_title')}</h3>
          <div className="flex gap-2 mb-4">
            {(['general', 'event', 'alert'] as const).map(type => (
              <button 
                key={type} 
                onClick={() => setNewPostType(type)} 
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${newPostType === type ? 'ring-2 ring-blue-500/20 bg-blue-100 text-blue-700 border-blue-200' : `${baseClasses.border} ${baseClasses.textSub}`}`}
              >
                {t(type)}
              </button>
            ))}
          </div>
          <textarea 
            className={`w-full p-4 border rounded-lg resize-none h-32 outline-none focus:ring-2 focus:ring-blue-500 mb-4 ${baseClasses.input}`}
            value={newPostContent} 
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder={t('community_title')}
          />
          <button 
            onClick={handleAddCommunityPost} 
            className={`w-full py-2 px-4 rounded-lg font-bold text-white transition-colors flex items-center justify-center ${currentTheme.primary} ${currentTheme.hover}`}
          >
            <Send size={18} className="mr-2" /> {t('share_btn')}
          </button>
        </div>
        
        {/* Posts Feed */}
        <div className="lg:col-span-2 space-y-4">
          {communityPosts.map((post) => (
            <div 
              key={post.id} 
              className={`p-6 rounded-xl border shadow-sm relative ${baseClasses.bgCard} ${post.type === 'agenda' ? 'border-orange-400 ring-1 ring-orange-200' : ''}`}
            >
              {post.type === 'agenda' && (
                <div className="absolute -top-3 left-4 bg-orange-500 text-white px-2 py-0.5 text-xs font-bold rounded shadow-sm flex items-center">
                  <Pin size={10} className="mr-1"/> {t('agenda')}
                </div>
              )}
              <div className="flex justify-between items-start mb-2 mt-1">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <User size={16} className={currentTheme.text} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${baseClasses.textMain}`}>{post.user}</h4>
                    <span className={`text-xs ${baseClasses.textSub}`}>{post.date}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  post.type === 'agenda' ? 'bg-orange-100 text-orange-700' : 
                  post.type === 'event' ? 'bg-purple-100 text-purple-700' : 
                  post.type === 'alert' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                >
                  {t(post.type)}
                </span>
              </div>
              <p className={`text-sm ml-11 ${baseClasses.textMain} leading-relaxed whitespace-pre-wrap`}>
                {post.content}
              </p>
            </div>
          ))}
        </div>
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
