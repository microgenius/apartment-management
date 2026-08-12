import React, { useState } from 'react';
import { Phone, Mail, Star, Pencil, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import type { BaseClasses, Theme } from '../types';
import {
  residentContactsService,
  type ResidentContact,
  type ContactType,
  type ContactInput
} from '../services/residentContactsService';

interface Props {
  residentId: number;
  contacts: ResidentContact[];
  /** Yetki kuralı çağıran tarafta karar veriliyor (utils/permissions.ts):
   *  kendi dairesi ya da yönetici/yardımcısı. */
  canEdit: boolean;
  onChanged: () => void;
  baseClasses: BaseClasses;
  currentTheme: Theme;
  t: (key: string) => string;
  darkMode: boolean;
}

const CONTACT_TYPES: ContactType[] = ['owner', 'tenant', 'emergency', 'other'];

const emptyForm: ContactInput = { type: 'tenant', name: '', phone: '', email: '', is_primary: false };

export const ResidentContacts: React.FC<Props> = ({
  residentId, contacts, canEdit, onChanged, baseClasses, currentTheme, t, darkMode
}) => {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<ContactInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startAdd = () => { setForm(emptyForm); setEditingId('new'); setError(''); };
  const startEdit = (c: ResidentContact) => {
    setForm({ type: c.type, name: c.name, phone: c.phone, email: c.email ?? '', is_primary: c.is_primary });
    setEditingId(c.id);
    setError('');
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError(t('contact_required_fields'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, email: form.email?.trim() || null };
      if (editingId === 'new') {
        await residentContactsService.create(residentId, payload);
      } else if (editingId != null) {
        await residentContactsService.update(editingId, residentId, payload);
      }
      setEditingId(null);
      onChanged();
    } catch (err) {
      console.error('Error saving contact:', err);
      setError(t('contact_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    setSaving(true);
    try {
      await residentContactsService.delete(id);
      onChanged();
    } catch (err) {
      console.error('Error deleting contact:', err);
      setError(t('contact_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className={`font-semibold ${baseClasses.textMain}`}>{t('contacts_title')}</h4>
        {canEdit && editingId === null && (
          <button
            onClick={startAdd}
            className={`text-sm flex items-center gap-1 ${currentTheme.text} hover:opacity-80`}
          >
            <Plus size={16} /> {t('contact_add')}
          </button>
        )}
      </div>

      {contacts.length === 0 && editingId === null && (
        <p className={`text-sm ${baseClasses.textSub}`}>{t('contacts_empty')}</p>
      )}

      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className={`border rounded-lg p-3 ${baseClasses.border}`}>
            {editingId === c.id ? null : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${baseClasses.textMain}`}>{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {t(`contact_type_${c.type}`)}
                    </span>
                    {c.is_primary && (
                      <span className="text-xs flex items-center gap-1 text-amber-500">
                        <Star size={12} fill="currentColor" /> {t('contact_primary')}
                      </span>
                    )}
                  </div>
                  <a href={`tel:${c.phone}`} className={`text-sm flex items-center gap-1 mt-1 ${currentTheme.text}`}>
                    <Phone size={13} /> {c.phone}
                  </a>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className={`text-sm flex items-center gap-1 ${baseClasses.textSub}`}>
                      <Mail size={13} /> {c.email}
                    </a>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} aria-label={t('edit')} className={baseClasses.textSub}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => remove(c.id)} aria-label={t('delete')} className="text-red-500" disabled={saving}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {editingId !== null && (
        <div className={`border rounded-lg p-3 mt-2 space-y-2 ${baseClasses.border}`}>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
            className={`w-full p-2 rounded border text-sm outline-none ${baseClasses.input}`}
          >
            {CONTACT_TYPES.map((type) => (
              <option key={type} value={type}>{t(`contact_type_${type}`)}</option>
            ))}
          </select>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('name')}
            className={`w-full p-2 rounded border text-sm outline-none ${baseClasses.input}`}
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t('phone')}
            className={`w-full p-2 rounded border text-sm outline-none ${baseClasses.input}`}
          />
          <input
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t('email')}
            className={`w-full p-2 rounded border text-sm outline-none ${baseClasses.input}`}
          />
          <label className={`flex items-center gap-2 text-sm ${baseClasses.textMain}`}>
            <input
              type="checkbox"
              checked={!!form.is_primary}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            {t('contact_primary_set')}
          </label>

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
              onClick={() => setEditingId(null)}
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
