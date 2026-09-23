import React from 'react';
import ReactDOM from 'react-dom/client';
import HomePage from './HomePage.jsx';
import CustomerLocationPage from './CustomerLocationPage.jsx';
import DriverPage from './DriverPage.jsx';
import './index.css';

function Router() {
  const path = window.location.pathname;

  if (path === '/driver') {
    return <DriverPage />;
  }
  if (path === '/book') {
    return <CustomerLocationPage />;
  }
  return <HomePage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);