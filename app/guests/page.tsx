'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import FileUpload from '@/components/FileUpload';
import { getStatusColor, getStatusLabel } from '@/lib/utils';
import { Users, Search, Mail, Phone, Upload } from 'lucide-react';

type Guest = {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  company?: string; status: string; event?: { name: string; id: string };
};

export default function GuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [importEventId, setImportEventId] = useState('');
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const fetchGuests = () =>
    fetch('/api/guests').then(r => r.json()).then(data => { setGuests(data); setLoading(false); });

  useEffect(() => {
    fetchGuests();
    fetch('/api/events').then(r => r.json()).then(setEvents);
  }, []);

  const importGuests = async (rows: Record<string, string>[]) => {
    if (!importEventId) return;
    let count = 0;
    for (const row of rows) {
      const firstName = row['Prénom'] || row['prenom'] || row['FirstName'] || row['first_name'] || '';
      const lastName = row['Nom'] || row['nom'] || row['LastName'] || row['last_name'] || '';
      const email = row['Courriel'] || row['Email'] || row['email'] || row['courriel'] || '';
      if (!firstName && !lastName) continue;
      await fetch(`/api/events/${importEventId}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName || 'N/A',
          lastName,
          email: email || `${firstName}.${lastName}@import.local`.toLowerCase().replace(/ /g, ''),
          company: row['Entreprise'] || row['Company'] || row['entreprise'] || '',
          phone: row['Téléphone'] || row['Phone'] || row['telephone'] || '',
          status: 'INVITED',
        }),
      });
      count++;
    }
    setImportResult({ count });
    fetchGuests();
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    return (
      (!q || `${g.firstName} ${g.lastName}`.toLowerCase().includes(q) || g.email.toLowerCase().includes(q) || g.company?.toLowerCase().includes(q)) &&
      (!statusFilter || g.status === statusFilter)
    );
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.status === 'CONFIRMED').length,
    invited: guests.filter(g => g.status === 'INVITED').length,
    declined: guests.filter(g => g.status === 'DECLINED').length,
  };

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Invités"
        subtitle={`${filtered.length} invité${filtered.length > 1 ? 's' : ''} au total`}
        actions={
          <button
            onClick={() => { setUploadModal(true); setImportResult(null); }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm rounded-lg transition-colors"
          >
            <Upload size={15} /> Importer Excel/CSV
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'Confirmés', value: stats.confirmed, color: 'text-green-400' },
            { label: 'Invités', value: stats.invited, color: 'text-blue-400' },
            { label: 'Déclinés', value: stats.declined, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
            <option value="">Tous</option>
            {['INVITED', 'CONFIRMED', 'DECLINED', 'ATTENDED', 'NO_SHOW'].map(s => (
              <option key={s} value={s}>{getStatusLabel(s)}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800">
              <tr className="text-xs text-slate-500">
                <th className="text-left p-4 font-medium">Nom</th>
                <th className="text-left p-4 font-medium">Contact</th>
                <th className="text-left p-4 font-medium">Entreprise</th>
                <th className="text-left p-4 font-medium">Événement</th>
                <th className="text-left p-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.map(g => (
                <tr key={g.id} className="hover:bg-slate-800/50">
                  <td className="p-4 font-medium text-white">{g.firstName} {g.lastName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1 text-slate-400 text-xs"><Mail size={11} />{g.email}</div>
                    {g.phone && <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5"><Phone size={11} />{g.phone}</div>}
                  </td>
                  <td className="p-4 text-slate-400">{g.company || '—'}</td>
                  <td className="p-4 text-slate-400 text-xs">{g.event?.name || '—'}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(g.status)}`}>
                      {getStatusLabel(g.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p>Aucun invité trouvé</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Importer une liste d'invités" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Importez votre liste depuis Excel ou CSV. Colonnes reconnues automatiquement:</p>
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono space-y-0.5">
            <p><span className="text-indigo-400">Prénom</span> ou FirstName</p>
            <p><span className="text-indigo-400">Nom</span> ou LastName</p>
            <p><span className="text-indigo-400">Courriel</span> ou Email</p>
            <p><span className="text-indigo-400">Entreprise</span> ou Company</p>
            <p><span className="text-indigo-400">Téléphone</span> ou Phone</p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Associer à l'événement *</label>
            <select value={importEventId} onChange={e => setImportEventId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500">
              <option value="">Sélectionner un événement...</option>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          {importEventId ? (
            <FileUpload
              accept=".xlsx,.xls,.csv"
              label="Déposer votre liste ici"
              hint="Excel (.xlsx) ou CSV — colonnes: Prénom, Nom, Courriel..."
              onResult={async (result) => {
                if (result.rows) await importGuests(result.rows);
              }}
            />
          ) : (
            <p className="text-xs text-amber-400">Sélectionnez d'abord un événement.</p>
          )}
          {importResult && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-300">
              ✓ {importResult.count} invité{importResult.count > 1 ? 's' : ''} importé{importResult.count > 1 ? 's' : ''} avec succès!
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
