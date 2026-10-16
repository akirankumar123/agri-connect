import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import RoverMap from '../components/RoverMap';
import RipenessTracker from '../components/RipenessTracker';

const RoverMonitoring: React.FC = () => {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <Header />
      <main style={{ margin: 0, padding: 0 }}>
        <RoverMap />
        <RipenessTracker />
      </main>

      <Footer />
    </div>
  );
};

export default RoverMonitoring;
