import React from 'react';
import { TrendingUp, Users, DollarSign, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const stats = [
        { title: 'Ümumi Gəlir', value: '$54,230', change: '+12.5%', icon: DollarSign, color: '#3b82f6', trend: 'up' },
        { title: 'Yeni Müştərilər', value: '1,240', change: '+8.2%', icon: Users, color: '#10b981', trend: 'up' },
        { title: 'Ümumi Sifarişlər', value: '3,542', change: '-3.1%', icon: Package, color: '#f59e0b', trend: 'down' },
        { title: 'Artım Sürəti', value: '24.8%', change: '+4.3%', icon: TrendingUp, color: '#8b5cf6', trend: 'up' },
    ];

    return (
        <div className="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Forsaj Panel-ə xoş gəlmisiniz!</h1>
                    <p className="page-subtitle">Bu gün iş sahənizdə baş verənlər.</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary">Hesabatı Yüklə</button>
                    <button className="btn btn-primary">Yeni Məhsul Əlavə Et</button>
                </div>
            </div>

            <div className="stats-grid">
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card">
                        <div className="stat-content">
                            <span className="stat-label">{stat.title}</span>
                            <h3 className="stat-value">{stat.value}</h3>
                            <div className={`stat-change ${stat.trend}`}>
                                {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {stat.change}
                                <span className="text-muted"> keçən ayla müqayisədə</span>
                            </div>
                        </div>
                        <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-grid">
                <div className="card main-chart">
                    <div className="card-header">
                        <h3>Gəlir İcmalı</h3>
                        <select className="card-select">
                            <option>Son 7 Gün</option>
                            <option>Son 30 Gün</option>
                        </select>
                    </div>
                    <div className="card-body chart-placeholder">
                        <div className="mock-chart">
                            {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                                <div key={i} className="bar-wrapper">
                                    <div className="bar" style={{ height: `${h}%` }}></div>
                                    <span className="bar-label">{['B.E', 'Ç.A', 'Ç.', 'C.A', 'C.', 'Ş.', 'B.'][i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card recent-activity">
                    <div className="card-header">
                        <h3>Son Sifarişlər</h3>
                        <button className="text-link">Hamısına Bax</button>
                    </div>
                    <div className="card-body">
                        <div className="orders-list">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="order-item">
                                    <div className="order-user">
                                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                                        <div>
                                            <div className="font-semibold">Müştəri {i}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>2 məhsul sifariş edib</div>
                                        </div>
                                    </div>
                                    <div className="order-status completed">Ödənilib</div>
                                    <div className="order-amount">$120.00</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
