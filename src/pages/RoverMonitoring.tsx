import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RoverMap from '../components/RoverMap';

const RoverMonitoring: React.FC = () => {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <Header />
      <main style={{ margin: 0, padding: 0 }}>
        <RoverMap />
      </main>

      <Footer />
    </div>
  );
};

export default RoverMonitoring;
