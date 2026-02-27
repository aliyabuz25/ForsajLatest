import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useSiteContent } from '../hooks/useSiteContent';

interface CategoryLeadersProps {
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact', category?: string) => void;
}


const CategoryLeaders: React.FC<CategoryLeadersProps> = ({ onViewChange }) => {
  const { getText } = useSiteContent('categoryleaders');
  const leaderSuffix = getText('LEADER_TITLE_SUFFIX', 'LİDERİ');
  const emptyName = getText('EMPTY_DRIVER_NAME', '---');
  const emptyTeam = getText('EMPTY_DRIVER_TEAM', '---');
  const [leaders, setLeaders] = React.useState<any[]>([]);

  React.useEffect(() => {
    const loadLeaders = async () => {
      try {
        const response = await fetch('/api/drivers');
        if (!response.ok) throw new Error('Failed to fetch drivers');

        const data = await response.json();

        if (data) {
          const topLeaders = data.map((cat: any) => {
            const drivers = Array.isArray(cat.drivers) ? cat.drivers : [];
            const topDriver = [...drivers].sort((a: any, b: any) => a.rank - b.rank)[0];
            return {
              id: cat.id,
              title: `${cat.name} ${leaderSuffix}`,
              name: topDriver?.name || emptyName,
              team: topDriver?.team || emptyTeam,
              score: topDriver?.points || 0,
              img: topDriver?.img || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?grayscale'
            };
          });
          setLeaders(topLeaders);
        }
      } catch (err) {
        console.error('Leaders fetch failed from API:', err);
      }
    };
    loadLeaders();
  }, []);

  return (
    <section className="py-24 px-6 lg:px-20 bg-[#0A0A0A]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
        <div className="flex items-start gap-4">
          <div className="w-2 h-16 bg-[#FF4D00] shadow-[0_0_15px_rgba(255,77,0,0.5)]"></div>
          <div>
            <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none text-white">
              {getText('SECTION_TITLE', 'KATEQORİYA LİDƏRLƏRİ')}
            </h2>
            <p className="text-[#FF4D00] font-black italic text-[10px] md:text-xs mt-2 uppercase tracking-widest">
              {getText('SECTION_SUBTITLE', 'HƏR KLASS ÜZRƏ MÖVSÜMÜN ƏN GÜCLÜ PİLOTLARI')}
            </p>
          </div>
        </div>
        <button
          onClick={() => onViewChange('drivers')}
          className="bg-white/5 border border-white/10 text-white font-black italic text-[10px] px-8 py-4 transform -skew-x-12 flex items-center gap-2 hover:bg-[#FF4D00] hover:text-black transition-all shadow-md active:scale-95 group"
        >
          <span className="transform skew-x-12 flex items-center gap-2 uppercase tracking-widest">
            {getText('VIEW_ALL_BTN', 'BÜTÜN REYTİNG')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {leaders.map((leader) => (
          <div key={leader.title} className="flex flex-col group">
            <div className="text-center mb-6">
              <h4 className="text-gray-500 font-black italic text-xs tracking-[0.2em] uppercase group-hover:text-[#FF4D00] transition-colors">{leader.title}</h4>
            </div>

            <div
              onClick={() => onViewChange('drivers', leader.id)}
              className="relative aspect-[4/5] overflow-hidden bg-[#111] shadow-2xl rounded-sm border border-white/5 cursor-pointer"
            >
              <img
                src={leader.img}
                alt={leader.name}
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:scale-110 group-hover:grayscale-0 opacity-60 group-hover:opacity-100"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-60 transition-opacity"></div>

              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-end">
                <div className="flex flex-col">
                  <h3 className="text-white text-xl sm:text-2xl font-black italic leading-none tracking-tight uppercase mb-1 break-words">
                    {leader.name}
                  </h3>
                  <p className="text-[#FF4D00] text-[8px] sm:text-[9px] font-black italic uppercase tracking-wider break-words">
                    {leader.team}
                  </p>
                </div>

                <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                  <span className="text-gray-400 font-black italic text-[8px] uppercase leading-none mb-1">{getText('SCORE_LABEL', 'XAL')}</span>
                  <span className="text-white text-3xl sm:text-5xl font-black italic leading-none">
                    {leader.score}
                  </span>
                </div>
              </div>

              <div className="absolute inset-0 border-0 group-hover:border-2 border-[#FF4D00]/50 transition-all duration-300 pointer-events-none"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryLeaders;
