import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content-wrapper">
        <Header />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
