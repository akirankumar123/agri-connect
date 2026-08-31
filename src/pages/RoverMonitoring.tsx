import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RoverMap from '../components/RoverMap';

const RoverMonitoring: React.FC = () => {
  return (
    <div>
      <Header />
      <main>
        <RoverMap />
      </main>

      <Footer />
    </div>
  );
};

export default RoverMonitoring;
