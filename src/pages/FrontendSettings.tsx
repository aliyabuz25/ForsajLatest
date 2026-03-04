import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, Monitor, Server, ShieldCheck, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import './FrontendSettings.css';

const FrontendSettings: React.FC = () => {
    const [status, setStatus] = useState<'running' | 'stopped' | 'restarting'>('stopped');
    const [port, setPort] = useState('3000');
    const [env, setEnv] = useState('development');

    const [stats, setStats] = useState({
        cpu: 0,
        ram: { total: 0, used: 0, percentage: 0 },
        versions: { node: '', vite: '', project: '' },
        uptime: ''
    });

    const fetchStatus = () => {
        fetch('/api/frontend/status')
            .then(res => res.json())
            .then(data => {
                setStatus(data.status);
                setPort(data.port.toString());
                if (data.stats) setStats(data.stats);
            })
            .catch(() => console.log('Status check failed'));
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (action: string) => {
        // ... (keep existing handleAction logic but use fetchStatus)
        if (action === 'restart') setStatus('restarting');

        try {
            await fetch('/api/frontend/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            setTimeout(fetchStatus, 2000);
            toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} əmri göndərildi`);
        } catch (err) {
            toast.error('Əməliyyat uğursuz oldu');
        }
    };

    return (
        <div className="settings-container fade-in">
            <div className="settings-header">
                <div>
                    <h1>Frontend tənzimləmələri</h1>
                    <p>Sistem infrastrukturunu və server parametrlərini idarə edin</p>
                </div>
                <div className={`status-badge ${status}`}>
                    <div className="pulse"></div>
                    {status === 'running' ? 'Aktiv' : status === 'stopped' ? 'Dayandırılıb' : 'Yenidən başladılır...'}
                </div>
            </div>

            <div className="settings-grid">
                <div className="settings-card controls">
                    <h3><Monitor size={20} /> Server Nəzarəti</h3>
                    <div className="action-buttons">
                        <button
                            className="btn-start"
                            disabled={status === 'running' || status === 'restarting'}
                            onClick={() => handleAction('start')}
                        >
                            <Play size={18} /> Başla
                        </button>
                        <button
                            className="btn-stop"
                            disabled={status === 'stopped' || status === 'restarting'}
                            onClick={() => handleAction('stop')}
                        >
                            <Square size={18} /> Dayandır
                        </button>
                        <button
                            className="btn-restart"
                            disabled={status === 'restarting'}
                            onClick={() => handleAction('restart')}
                        >
                            <RotateCcw size={18} /> Yenidən işə sal
                        </button>
                    </div>
                </div>

                <div className="settings-card config">
                    <h3><Server size={20} /> Şəbəkə Parametrləri</h3>
                    <div className="field-group">
                        <label>Port Nömrəsi</label>
                        <input
                            type="number"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            placeholder="3000"
                        />
                    </div>
                    <div className="field-group">
                        <label>Mühit</label>
                        <select value={env} onChange={(e) => setEnv(e.target.value)}>
                            <option value="development">İnkişaf</option>
                            <option value="production">Canlı</option>
                            <option value="staging">Sınaq</option>
                        </select>
                    </div>
                </div>

                <div className="settings-card stats">
                    <h3><Activity size={20} /> Resurs İstifadəsi</h3>
                    <div className="stats-row">
                        <span>CPU Yükü</span>
                        <div className="progress-bar"><div className="fill" style={{ width: `${stats.cpu}%` }}></div></div>
                        <span>{stats.cpu}%</span>
                    </div>
                    <div className="stats-row">
                        <span>RAM İstifadəsi</span>
                        <div className="progress-bar"><div className="fill" style={{ width: `${stats.ram.percentage}%` }}></div></div>
                        <span>{stats.ram.used.toFixed(1)}GB / {stats.ram.total.toFixed(1)}GB</span>
                    </div>
                </div>

                <div className="settings-card info">
                    <h3><ShieldCheck size={20} /> Sistem Məlumatı</h3>
                    <div className="info-list">
                        <div className="info-item"><span>Versiya:</span> <strong>{stats.versions.project}</strong></div>
                        <div className="info-item"><span>Node.js:</span> <strong>{stats.versions.node}</strong></div>
                        <div className="info-item"><span>Vite:</span> <strong>{stats.versions.vite}</strong></div>
                        <div className="info-item"><span>İşləmə Müddəti:</span> <strong>{stats.uptime}</strong></div>
                    </div>
                </div>
            </div>

            <div className="settings-footer">
                <button className="btn-save" onClick={() => toast.success('Ayarlar yadda saxlanıldı!')}>
                    Dəyişiklikləri Yadda Saxla
                </button>
            </div>
        </div>
    );
};

export default FrontendSettings;
