import React, { useState } from 'react';
import { StickyNote, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import type { BaseClasses, Theme, Language } from '../types';
import { residentNotesService, type ResidentNote } from '../services/residentNotesService';
import { LOCALES } from '../utils/helpers';

interface Props {
  residentId: number;
  /** Bu daireye ait notlar - süzme çağıran tarafta yapılıyor. */
  notes: ResidentNote[];
  /** Notun altına yazılacak ad: o gün görevde olan kişi. */
  authorName: string;
  onChanged: () => void;
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
  lang: Language;
}

/**
 * Dairenin borç takip notları.
 *
 * Tutarın kendisi borcun hikâyesini anlatmıyor ("Şubat unutuldu, marttan
 * itibaren yatırılıyor"). Not daireye bağlı, aya değil: takip genelde birkaç
 * ayı birlikte anlatıyor.
 *
 * Yalnızca görevli/admin görür - RLS tarafında da öyle (bkz.
 * scripts/add_resident_notes.sql). Bileşen zaten sadece yönetim ekranında
 * kullanılıyor; yine de "kime görünür" bilgisi ekranda yazıyor, çünkü notun
 * sakin tarafından okunup okunmadığı yazarken bilinmesi gereken şey.
 */
export const ResidentNotes: React.FC<Props> = ({
  residentId, notes, authorName, onChanged, baseClasses, currentTheme, t, lang
}) => {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!text.trim()) {
      setError(t('note_required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await residentNotesService.create(residentId, text.trim(), authorName || null);
      setText('');
      setAdding(false);
      onChanged();
    } catch (err) {
      console.error('Error saving resident note:', err);
      setError(t('note_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try {
      await residentNotesService.delete(id);
      onChanged();
    } catch (err) {
      console.error('Error deleting resident note:', err);
      setError(t('note_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl shadow-sm border p-4 sm:p-6 ${baseClasses.bgCard}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className={`font-bold flex items-center ${baseClasses.textMain}`}>
          <StickyNote size={18} className="mr-2 text-amber-500" /> {t('notes_title')}
        </h3>
        {!adding && (
          <button
            onClick={() => { setError(''); setAdding(true); }}
            className={`text-sm flex items-center gap-1 ${currentTheme.text} hover:opacity-80`}
          >
            <Plus size={16} /> {t('note_add')}
          </button>
        )}
      </div>
      <p className={`text-sm mb-3 ${baseClasses.textSub}`}>{t('notes_desc')}</p>

      {notes.length === 0 && !adding && (
        <p className={`text-sm ${baseClasses.textSub}`}>{t('notes_empty')}</p>
      )}

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className={`border rounded-lg p-3 ${baseClasses.border}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={`text-sm whitespace-pre-wrap break-words ${baseClasses.textMain}`}>{n.note}</p>
                <p className={`text-xs mt-1 ${baseClasses.textSub}`}>
                  {new Date(n.created_at).toLocaleDateString(LOCALES[lang])}
                  {n.author_name ? ` • ${n.author_name}` : ''}
                </p>
              </div>
              <button
                onClick={() => remove(n.id)}
                aria-label={t('delete')}
                className="text-red-500 shrink-0"
                disabled={saving}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding && (
        <div className={`border rounded-lg p-3 mt-2 space-y-2 ${baseClasses.border}`}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t('note_placeholder')}
            className={`w-full p-2 rounded border text-sm outline-none ${baseClasses.input}`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className={`flex-1 text-white py-2 rounded text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 ${currentTheme.primary}`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t('save')}
            </button>
            <button
              onClick={() => { setAdding(false); setText(''); setError(''); }}
              disabled={saving}
              className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center gap-1 ${baseClasses.border} ${baseClasses.textMain}`}
            >
              <X size={16} /> {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
