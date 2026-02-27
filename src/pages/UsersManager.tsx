import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Shield, User, Lock, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { clearAdminSession, getAuthToken } from '../utils/session';
import './UsersManager.css';

interface AdminUser {
    id: string;
    username: string;
    name: string;
    role: 'master' | 'secondary';
    created_at?: string;
}

interface UsersManagerProps {
    currentUser: {
        role: 'master' | 'secondary';
    };
}

const UsersManager: React.FC<UsersManagerProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);

    const fetchUsers = async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                clearAdminSession();
                return;
            }
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                clearAdminSession();
                toast.error('Sessiya müddəti bitib. Yenidən daxil olun.');
                return;
            }
            if (!response.ok) throw new Error('Yükləmə uğursuz oldu');

            const data = await response.json();
            setUsers(data || []);
        } catch (err) {
            toast.error('İstifadəçiləri yükləmək mümkün olmadı');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.username || !editingUser?.name || (!editingUser?.id && !editingUser?.password)) {
            toast.error('Zəhmət olmasa bütün sahələri doldurun');
            return;
        }

        try {
            const token = getAuthToken();
            if (!token) {
                clearAdminSession();
                return;
            }
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(editingUser)
            });

            if (response.status === 401 || response.status === 403) {
                clearAdminSession();
                toast.error('Sessiya müddəti bitib. Yenidən daxil olun.');
                return;
            }
            if (response.ok) {
                toast.success(editingUser.id ? 'İstifadəçi yeniləndi' : 'Yeni istifadəçi yaradıldı');
                setIsModalOpen(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Xəta baş verdi');
            }
        } catch (err) {
            toast.error('Serverlə bağlantı kəsildi');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!window.confirm('Bu istifadəçini silmək istədiyinizə əminsiniz?')) return;

        try {
            const token = getAuthToken();
            if (!token) {
                clearAdminSession();
                return;
            }
            const response = await fetch(`/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.status === 401 || response.status === 403) {
                clearAdminSession();
                toast.error('Sessiya müddəti bitib. Yenidən daxil olun.');
                return;
            }
            if (response.ok) {
                toast.success('İstifadəçi silindi');
                fetchUsers();
            } else {
                const data = await response.json();
                toast.error(data.error || 'Silmək mümkün olmadı');
            }
        } catch (err) {
            toast.error('Serverlə bağlantı kəsildi');
        }
    };

    const openModal = (user: any | null = null) => {
        setEditingUser(user ? { ...user } : { username: '', name: '', password: '', role: 'secondary' });
        setIsModalOpen(true);
    };

    if (isLoading) return <div className="loading-state">Yüklənir...</div>;

    return (
        <div className="users-manager fade-in">
            <div className="manager-header">
                <div>
                    <h1>Admin Hesabları</h1>
                    <p>Sistemi idarə edən bütün administratorların siyahısı və səlahiyyətləri</p>
                </div>
                {currentUser.role === 'master' && (
                    <button className="add-user-btn" onClick={() => openModal()}>
                        <UserPlus size={18} /> Yeni idarəçi
                    </button>
                )}
            </div>

            <div className="users-grid">
                {users.map(user => (
                    <div key={user.id} className="user-card">
                        <div className="user-avatar">
                            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=${user.role === 'master' ? '3b82f6' : 'f59e0b'}&color=fff`} alt={user.name} />
                            <div className={`role-badge ${user.role || 'secondary'}`}>
                                <Shield size={10} /> {user.role === 'master' ? 'Baş admin' : 'Redaktor'}
                            </div>
                        </div>
                        <div className="user-details">
                            <h3>{user.name}</h3>
                            <span>@{user.username || 'username'}</span>
                        </div>
                        {currentUser.role === 'master' && (
                            <div className="user-actions">
                                <button className="edit-btn" onClick={() => openModal(user)} title="Düzəliş et">
                                    <Edit size={16} />
                                </button>
                                <button className="delete-btn" onClick={() => handleDeleteUser(user.id.toString())} title="Sil">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingUser?.id ? 'İstifadəçini redaktə et' : 'Yeni idarəçi hesabı'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveUser}>
                            <div className="form-group">
                                <label><User size={14} /> Tam Ad</label>
                                <input
                                    type="text"
                                    value={editingUser?.name || ''}
                                    onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                                    placeholder="Məs: Əli Məmmədov"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label><User size={14} /> İstifadəçi Adı</label>
                                <input
                                    type="text"
                                    value={editingUser?.username || ''}
                                    onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                                    placeholder="Məs: alimm"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label><Lock size={14} /> Şifrə {editingUser?.id && <span className="helper-text">(Dəyişmək istəmirsinizsə boş saxlayın)</span>}</label>
                                <input
                                    type="password"
                                    value={editingUser?.password || ''}
                                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                                    placeholder="••••••••"
                                    required={!editingUser?.id}
                                />
                            </div>
                            <div className="form-group">
                                <label><Shield size={14} /> Yetki (Rol)</label>
                                <select
                                    value={editingUser?.role || 'secondary'}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                >
                                    <option value="master">Baş Admin (Tam səlahiyyət)</option>
                                    <option value="secondary">Redaktor (Məhdud səlahiyyət)</option>
                                </select>
                            </div>
                            {editingUser?.role === 'master' && (
                                <div className="role-warning">
                                    <AlertCircle size={14} /> Baş Admin bütün sistem daxilində tam səlahiyyətə malikdir.
                                </div>
                            )}
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Ləğv et</button>
                                <button type="submit" className="save-btn"><Save size={18} /> Yadda Saxla</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersManager;
