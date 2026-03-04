
import React from 'react';
import Hero from './Hero';
import CategoryLeaders from './CategoryLeaders';
import NextRace from './NextRace';
import VideoArchive from './VideoArchive';
import News from './News';
import Partners from './Partners';

interface HomeProps {
  onViewChange: (view: 'home' | 'about' | 'news' | 'events' | 'drivers' | 'rules' | 'contact', category?: string) => void;
}

const Home: React.FC<HomeProps> = ({ onViewChange }) => {
  return (
    <>
      <Hero onViewChange={onViewChange} />
      <CategoryLeaders onViewChange={onViewChange} />
      <NextRace onViewChange={onViewChange} />
      <VideoArchive onViewChange={onViewChange} />
      <News onViewChange={onViewChange} />
      <Partners />
    </>
  );
};

export default Home;
