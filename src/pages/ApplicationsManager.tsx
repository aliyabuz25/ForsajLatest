import React, { useState, useEffect } from 'react';
import { Inbox, CheckCircle, Clock, Trash2, User, Phone, FileText, ChevronRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import './ApplicationsManager.css';

interface Application {
    id: number;
    name: string;
    contact: string;
    type: string;
    content: string;
    status: 'unread' | 'read';
    created_at: string;
}

const CONTENT_KEY_LABELS: Record<string, string> = {
    source: 'Mənbə',
    email: 'E-poçt',
    phone: 'Telefon',
    mobile: 'Mobil',
    contact: 'Əlaqə',
    message: 'Mesaj',
    note: 'Qeyd',
    event: 'Tədbir',
    car: 'Avtomobil',
    tire: 'Təkər',
    engine: 'Mühərrik',
    club: 'Klub',
    city: 'Şəhər',
    country: 'Ölkə',
    name: 'Ad',
    fullname: 'Ad Soyad'
};

const normalizeKey = (value: string) => String(value || '').trim().toLowerCase();
const prettifyContentKey = (key: string) => {
    const normalized = normalizeKey(key);
    if (CONTENT_KEY_LABELS[normalized]) return CONTENT_KEY_LABELS[normalized];
    return String(key || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toLocaleUpperCase('az-AZ'));
};

const formatAzDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '');
    return date.toLocaleString('az-AZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const mapStatusLabel = (status: Application['status']) => status === 'unread' ? 'Oxunmamış' : 'Oxunmuş';

const ApplicationsManager: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    const fetchApplications = async () => {
        const token = localStorage.getItem('forsaj_admin_token');
        try {
            const res = await fetch('/api/applications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setApplications(data);
            }
        } catch (err) {
            toast.error('Müraciətlər yüklənərkən xəta baş verdi');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('forsaj_admin_token');
        try {
            const res = await fetch(`/api/applications/${id}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setApplications(prev => prev.map(app => app.id === id ? { ...app, status: 'read' } : app));
                if (selectedApp?.id === id) {
                    setSelectedApp(prev => prev ? { ...prev, status: 'read' } : null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteApplication = async (id: number) => {
        if (!window.confirm('Bu müraciəti silmək istədiyinizə əminsiniz?')) return;

        const token = localStorage.getItem('forsaj_admin_token');
        try {
            const res = await fetch(`/api/applications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setApplications(prev => prev.filter(app => app.id !== id));
                if (selectedApp?.id === id) setSelectedApp(null);
                toast.success('Müraciət silindi');
            }
        } catch (err) {
            toast.error('Silinmə zamanı xəta baş verdi');
        }
    };

    const filteredApps = applications.filter(app => {
        if (filter === 'unread') return app.status === 'unread';
        if (filter === 'read') return app.status === 'read';
        return true;
    });

    const parseContentForExport = (rawContent: string) => {
        const text = String(rawContent || '').trim();
        if (!text) return { contentText: '', parsedFields: {} as Record<string, string> };

        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return {
                    contentText: parsed.map((item) => String(item ?? '')).join(' | '),
                    parsedFields: { 'Məzmun - Siyahı': JSON.stringify(parsed) }
                };
            }
            if (parsed && typeof parsed === 'object') {
                const parsedFields: Record<string, string> = {};
                for (const [key, value] of Object.entries(parsed)) {
                    parsedFields[`Məzmun - ${prettifyContentKey(String(key).trim())}`] = String(value ?? '');
                }
                return {
                    contentText: Object.entries(parsed).map(([key, value]) => `${key}: ${String(value ?? '')}`).join(' | '),
                    parsedFields
                };
            }

            return { contentText: String(parsed), parsedFields: {} as Record<string, string> };
        } catch {
            return { contentText: text, parsedFields: {} as Record<string, string> };
        }
    };

    const exportToXlsx = async () => {
        if (!filteredApps.length) {
            toast.error('Export üçün müraciət tapılmadı');
            return;
        }

        try {
            const XLSX = await import('xlsx');
            const rows = filteredApps.map((app, index) => {
                const { contentText, parsedFields } = parseContentForExport(app.content);
                return {
                    'Sıra': index + 1,
                    'ID': app.id,
                    'Status': mapStatusLabel(app.status),
                    'Göndərən': app.name,
                    'Əlaqə': app.contact,
                    'Müraciət Növü': app.type,
                    'Tarix': formatAzDateTime(app.created_at),
                    'Məzmun (Qısa)': contentText,
                    ...parsedFields
                };
            });

            const baseHeaders = ['Sıra', 'ID', 'Status', 'Göndərən', 'Əlaqə', 'Müraciət Növü', 'Tarix', 'Məzmun (Qısa)'];
            const dynamicHeaders = Array.from(rows.reduce((acc, row) => {
                Object.keys(row).forEach((key) => acc.add(key));
                return acc;
            }, new Set<string>())).filter((key) => !baseHeaders.includes(key));
            const headers = [...baseHeaders, ...dynamicHeaders];

            const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
            worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };
            worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
            worksheet['!cols'] = headers.map((header) => {
                if (header === 'Məzmun (Qısa)') return { wch: 48 };
                if (header.startsWith('Məzmun - ')) return { wch: 28 };
                if (header === 'Tarix') return { wch: 18 };
                if (header === 'Status' || header === 'Müraciət Növü') return { wch: 16 };
                if (header === 'Göndərən' || header === 'Əlaqə') return { wch: 24 };
                if (header === 'Sıra' || header === 'ID') return { wch: 8 };
                return { wch: 20 };
            });

            const summaryRows = [
                { 'Məlumat': 'Export tarixi', 'Dəyər': formatAzDateTime(new Date().toISOString()) },
                { 'Məlumat': 'Filtr', 'Dəyər': filter === 'all' ? 'Hamısı' : filter === 'unread' ? 'Oxunmamış' : 'Oxunmuş' },
                { 'Məlumat': 'Müraciət sayı', 'Dəyər': String(filteredApps.length) }
            ];
            const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
            summarySheet['!cols'] = [{ wch: 20 }, { wch: 36 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Xülasə');
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Müraciətlər');
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            XLSX.writeFile(workbook, `muracietler-${filter}-${stamp}.xlsx`);
            toast.success('XLSX faylı yükləndi');
        } catch (error) {
            console.error(error);
            toast.error('XLSX export zamanı xəta baş verdi');
        }
    };

    const renderContent = (content: string) => {
        try {
            const data = JSON.parse(content);
            return (
                <div className="app-details-grid">
                    {Object.entries(data).map(([key, value]) => (
                        <div key={key} className="detail-item">
                            <span className="detail-label">{key.toUpperCase()}:</span>
                            <span className="detail-value">{String(value)}</span>
                        </div>
                    ))}
                </div>
            );
        } catch {
            return <div className="detail-text">{content}</div>;
        }
    };

    if (isLoading) return <div className="loading-state">Yüklənir...</div>;

    return (
        <div className="applications-manager fade-in">
            <div className="manager-header">
                <div>
                    <h1>Müraciətlər</h1>
                    <p>İstifadəçilər tərəfindən göndərilən formlar və qeydiyyatlar</p>
                </div>
                <div className="filter-tabs">
                    <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Hamısı</button>
                    <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Oxunmamış</button>
                    <button className={filter === 'read' ? 'active' : ''} onClick={() => setFilter('read')}>Oxunmuş</button>
                </div>
                <button className="btn-export" onClick={exportToXlsx}>
                    <Download size={16} />
                    Excelə Aktar
                </button>
            </div>

            <div className="manager-body">
                <div className="applications-list">
                    {filteredApps.length === 0 ? (
                        <div className="empty-list">Heç bir müraciət tapılmadı</div>
                    ) : (
                        filteredApps.map(app => (
                            <div
                                key={app.id}
                                className={`application-item ${app.status} ${selectedApp?.id === app.id ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedApp(app);
                                    if (app.status === 'unread') markAsRead(app.id);
                                }}
                            >
                                <div className="app-item-icon">
                                    {app.status === 'unread' ? <Clock className="icon-unread" /> : <CheckCircle className="icon-read" />}
                                </div>
                                <div className="app-item-main">
                                    <div className="app-item-header">
                                        <span className="app-item-name">{app.name}</span>
                                        <span className="app-item-date">{new Date(app.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="app-item-type">{app.type}</div>
                                </div>
                                <ChevronRight size={16} className="chevron" />
                            </div>
                        ))
                    )}
                </div>

                <div className="application-details">
                    {selectedApp ? (
                        <div className="details-card fade-in">
                            <div className="details-header">
                                <div>
                                    <h2>Müraciət Təfərrüatları</h2>
                                    <span className={`status-badge ${selectedApp.status}`}>{selectedApp.status === 'unread' ? 'Yeni' : 'Oxunub'}</span>
                                </div>
                                <div className="header-actions">
                                    <button className="btn-delete" onClick={() => deleteApplication(selectedApp.id)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="details-info">
                                <div className="info-group">
                                    <label><User size={16} /> Göndərən</label>
                                    <p>{selectedApp.name}</p>
                                </div>
                                <div className="info-group">
                                    <label><Phone size={16} /> Əlaqə</label>
                                    <p>{selectedApp.contact}</p>
                                </div>
                                <div className="info-group">
                                    <label><FileText size={16} /> Kateqoriya</label>
                                    <p>{selectedApp.type}</p>
                                </div>
                            </div>

                            <div className="details-content">
                                <label>Məzmun</label>
                                <div className="content-box">
                                    {renderContent(selectedApp.content)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="details-placeholder">
                            <Inbox size={48} />
                            <p>Baxmaq üçün siyahıdan müraciət seçin</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApplicationsManager;
